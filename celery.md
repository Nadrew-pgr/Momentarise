# Celery / Redis Capture Async SSoT

## Architecture Cible
- Control plane: FastAPI (`/api/v1/inbox`, `/api/v1/capture/external`) conserve les contrats HTTP.
- Execution plane: Celery workers exécutent la pipeline capture longue/retryable.
- Broker: Redis via `CELERY_BROKER_URL` (portable cloud-agnostic).
- Source de vérité métier: Postgres (`inbox_captures`, `capture_jobs`, `capture_artifacts`, `queue_outbox_events`).
- Scope V1: capture pipeline async uniquement. `/sync` reste inline temps réel.

## ADR (Décisions)
### ADR-001 - Async capture via Celery + Redis
- Why: réduire latence API, retries robustes, traitement IO-heavy hors requête.
- How: worker Celery + queues `capture_high/default/free` + outbox transactionnelle.
- Impact: API répond plus vite avec `queued`; traitement en arrière-plan.
- Rollback: `CAPTURE_ASYNC_WORKER_ENABLED=false`.
- Owner: Platform/API.

### ADR-002 - Outbox transactionnelle obligatoire
- Why: éviter perte de job si DB commit OK mais broker KO.
- How: table `queue_outbox_events` (pending/enqueued/failed), relay publish + retry backoff.
- Impact: traçabilité et reprise fiable.
- Rollback: fallback inline via kill switch.
- Owner: Platform/API.

### ADR-003 - Idempotence par `run_id`
- Why: éviter doublons et contamination cross-run sur reprocess.
- How: `run_id` sur `capture_jobs`, contrainte unique `(capture_id, run_id, job_type)`.
- Impact: exécutions rejouables de façon sûre.
- Rollback: désactiver async et rester inline.
- Owner: Platform/API.

## Vendor Lock-In Strategy
| Composant | Render aujourd’hui | Portable demain | Lock-in level |
|---|---|---|---|
| API container | Render Web Docker | n’importe quel orchestrateur Docker | Low |
| Worker container | Render Worker Docker | n’importe quel orchestrateur Docker | Low |
| Broker | Render Redis | Redis standard (AWS/GCP/Upstash/self-hosted) | Low |
| DB | Render Postgres | Postgres standard | Low |
| Config | env vars | env vars | Low |

Règle: aucun appel API propriétaire Render dans le code applicatif.

## Modèle de Données
### `capture_jobs` (extension)
- `run_id UUID NULL`
- `queue_name TEXT NULL`
- `task_id TEXT NULL`
- `UNIQUE(capture_id, run_id, job_type)`

### `queue_outbox_events` (nouvelle table)
- Clés: `workspace_id`, `capture_id`, `run_id`, `event_type`, `queue_name`, `dedupe_key`
- Payload: `payload JSONB`
- Publication: `status` (`pending|enqueued|failed`), `enqueue_attempts`, `task_id`, `last_error`, `next_retry_at`, `enqueued_at`, `failed_at`

## Flux Séquentiels
### HTTP -> Outbox -> Worker -> DB State
1. Endpoint crée/maj capture + crée jobs (`run_id`) + écrit outbox `pending` dans la même transaction.
2. Commit DB.
3. Relay publish vers Celery (`capture.run_pipeline`) sur queue tier.
4. Si publish KO: capture `failed`, `last_error_code=queue_enqueue_failed`.
5. Worker consomme tâche, exécute `process_capture_jobs(run_id=...)`, met à jour capture/item.

### Fallback Local Sans Broker
1. Si `CAPTURE_ASYNC_WORKER_ENABLED=true` mais Celery/broker n'est pas disponible au boot (`worker.celery.disabled`), l'API bascule automatiquement sur le path inline.
2. Ce fallback évite les `503 queue_enqueue_failed` en dev local pendant que Redis/worker ne sont pas démarrés.
3. En mode broker disponible, le flux async normal reste prioritaire.

## Config Env
- `CAPTURE_ASYNC_WORKER_ENABLED` (kill switch)
- `CELERY_BROKER_URL`
- `CELERY_TASK_MAX_RETRIES` (default `3`)
- `CELERY_TASK_SOFT_TIME_LIMIT_SECONDS` (default `780`)
- `CELERY_TASK_TIME_LIMIT_SECONDS` (default `900`)
- `CELERY_WORKER_PREFETCH_MULTIPLIER` (default `1`)
- `CELERY_TASK_ALWAYS_EAGER` (tests)
- `NOTE_SUMMARY_MIN_CHARS` (default `180`)

## Queue Policy By Tier
- Source of truth tier: `workspace.preferences.billing.tier` (fallback `free`).
- Routing:
  - `ultra|pro` -> `capture_high`
  - `default` -> `capture_default`
  - `free` -> `capture_free`
- Fairness minimale free: worker écoute les 3 queues (`capture_high,capture_default,capture_free`) pour éviter starvation totale.

## Error Codes (Capture Queue)
- `queue_enqueue_failed`: outbox publish impossible.
- `queue_worker_failure`: exception pipeline côté worker.
- `queue_timeout`: réservé pour timeout task/provider (rails).

## Observabilité (DevX)
- Correlation IDs: `request_id`, `capture_id`, `run_id`, `task_id`, `queue_name`.
- Métriques cibles:
  - `queue_depth`
  - `queue_wait_ms`
  - `pipeline_duration_ms`
  - `retry_count`
  - `failure_rate`
  - `stuck_jobs`
- Alertes recommandées:
  - capture `queued|processing` > 15 min
  - backlog queue au-dessus seuil
  - failure rate > seuil

## UX Fast Path Note
- Création note redirige vers route éditeur avec `item_id` query param.
- Éditeur charge `item.blocks` en priorité, capture detail en parallèle.
- Carte résumé IA masquée si note `< NOTE_SUMMARY_MIN_CHARS` (180).
- Détail capture: bannière d'attente explicite en `queued/processing` (web + mobile) pour réduire l'incertitude utilisateur.

## Voice UI Policy
- Sections séparées:
  - Résumé IA
  - Key clauses
  - Transcription complète
- `pipeline_trace` conservé backend, non user-facing.

## Runbook Go-Live (Minute-by-Minute)
1. Vérifier migration appliquée (`alembic upgrade head`).
2. Vérifier Redis + worker up.
3. Activer staging `CAPTURE_ASYNC_WORKER_ENABLED=true`.
4. Lancer tests charge/chaos (broker down/worker crash/provider timeout).
5. Valider gates:
   - p95 queue wait sous seuil
   - stuck jobs durablement à 0
   - failure rate sous seuil
6. Activer prod global si tous gates verts.
7. Surveillance renforcée 24-48h.

## Troubleshooting
- Symptom: `capture.outbox.publish_failed ... error=celery_not_configured` + `503` sur create/upload.
- Cause: async activé (`CAPTURE_ASYNC_WORKER_ENABLED=true`) sans broker/worker prêt.
- Correctif recommandé:
  1. Local rapide: laisser le fallback inline (comportement par défaut si Celery indisponible).
  2. Test async réel: démarrer Redis + worker puis définir `CELERY_BROKER_URL`:
     - Redis local: `redis://localhost:6379/0`
     - Worker: `uv run celery -A src.worker.celery_app:celery_app worker -Q capture_high,capture_default,capture_free -l info`
- Vérification:
  - Plus de log `worker.celery.disabled`.
  - Réponses capture avec `queue_state="enqueued"` et `task_id` renseigné.

## Runbook Rollback (Minute-by-Minute)
1. Passer `CAPTURE_ASYNC_WORKER_ENABLED=false` sur API.
2. Vérifier nouveaux captures traités inline.
3. Laisser worker drainer les tâches déjà en vol.
4. Sur incident critique: stopper worker puis post-mortem.
5. Conserver outbox/runs pour audit et replay contrôlé.

## Incidents Connus
- Aucun incident post-migration documenté pour l’instant.

## Changelog (2026-03-05)
### Step 0 - Préparation anti-lock-in
- Why: éviter dépendance Render spécifique.
- How: config broker/env standard + infra Docker/Render portable.
- Impact: migration cloud simplifiée.
- Rollback: revenir à `CAPTURE_ASYNC_WORKER_ENABLED=false`.
- Owner: Platform/API.

### Step 1-2 - Fondation Celery + Outbox + run_id + endpoints
- Why: fiabiliser async capture sans casser les contrats.
- How: modèles/migration, service outbox, worker Celery, migration endpoints capture.
- Impact: réponses capture addititives (`task_id`, `run_id`, `queue_state`, `queue_name`).
- Rollback: kill switch + inline path intact.
- Owner: Platform/API.

### Step 3-5 - Priorités tier + UX note
- Why: prioriser payants, accélérer création note, éviter bruit résumé IA.
- How: routing queue par tier + fast-path `item_id` + seuil résumé 180 chars.
- Impact: UX note plus réactive, meilleure qualité de détail capture.
- Rollback: désactiver async, conserver UI fallback capture classique.
- Owner: Product/Frontend/API.

### Step 5.1 - Dev fallback queue + note link robustness
- Why: éviter blocage local quand async est activé sans broker; fiabiliser ouverture éditeur note depuis carte capture.
- How: garde `_use_async_capture_worker` (fallback inline si Celery indisponible) + liens note enrichis `?item_id=...`.
- Impact: plus de `503` locaux liés à `celery_not_configured`, navigation note plus fiable.
- Rollback: retirer le garde fallback si besoin d'un mode strict.
- Owner: Platform/API + Frontend.
