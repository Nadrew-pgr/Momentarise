# Plan Final v2.1 — Sync Web/Mobile (BFF Next + FastAPI + LiteLLM + socle Agents/Automations)

## Résumé
1. Ce plan consolide toutes les itérations v1/v2/v2.1 en un chemin exécutable, sans décision restante pour l’implémenteur.
2. Architecture verrouillée: Web via BFF Next minimal, Mobile direct FastAPI, orchestrateur unique côté FastAPI, LiteLLM comme gateway providers.
3. Streaming verrouillé: Web en `POST fetch streaming` (SSE-compatible stream), Mobile en WebSocket.
4. Sécurité verrouillée: aucune écriture métier IA sans `preview -> apply`, `undo` systématique quand `undoable=true`, audit dans `ai_changes`.
5. Socle extensible verrouillé: `PromptComposer`, `ToolPolicyEngine`, `ToolExecutor`, mémoire FTS V1, `AgentProfile` et `AutomationSpec` dès V1 (UI builder complète en V1.5).

## Objectif et critères de succès
1. Livrer une page `/sync` web réellement fonctionnelle (chat libre + guidé + draft + preview/apply/undo + changelog).
2. Livrer une page `/sync` mobile hors tabs avec parité événementielle (même `syncEvent` que web).
3. Obtenir une API Sync stable et versionnée (`/api/v1/sync/*`) utilisée par web/mobile.
4. Garantir isolation multi-tenant (`workspace_id`) et 404 cross-tenant sur toutes ressources Sync.
5. Permettre replay/résilience réseau via séquencement d’événements (`seq`) et reprise (`from_seq` / `resume_from_seq`).

## Architecture verrouillée
1. Flux web: Browser -> Next BFF (`/api/sync/*`) -> FastAPI (`/api/v1/sync/*`) -> LiteLLM -> Provider.
2. Flux mobile: App Expo -> FastAPI (`/api/v1/sync/*` HTTP + WS) -> LiteLLM -> Provider.
3. BFF Next reste “comme aujourd’hui”: cookie/session/auth forwarding, proxy streaming, rate-limit léger, zéro logique métier Sync.
4. Planification calendrier: LLM propose contraintes/options, scheduler déterministe valide et place.
5. Sous-agents: même moteur, `AgentProfile` différent (`prompt_mode`, toolset, memory scope), pas de “moteurs IA séparés”.

## API publique finale

### FastAPI `/api/v1/sync`
1. `GET /models`
2. `POST /runs`
3. `GET /runs/{run_id}`
4. `POST /runs/{run_id}/stream`
5. `POST /runs/{run_id}/answer`
6. `POST /runs/{run_id}/apply`
7. `POST /runs/{run_id}/undo`
8. `GET /changes`
9. `POST /runs/{run_id}/ws-token`
10. `WS /runs/{run_id}/ws?token=...`
11. `GET /agents`
12. `POST /agents`
13. `GET /agents/{agent_id}`
14. `PATCH /agents/{agent_id}`
15. `POST /agents/{agent_id}/versions/publish`
16. `GET /automations`
17. `POST /automations`
18. `PATCH /automations/{automation_id}`
19. `POST /automations/{automation_id}/validate`
20. `POST /automations/{automation_id}/activate`
21. `POST /automations/{automation_id}/pause`

### BFF web `/api/sync`
1. Proxy JSON des routes FastAPI correspondantes.
2. Proxy streaming pour `POST /api/sync/runs/[id]/stream` en forward de `Response.body` (pas de `res.json()`).
3. Aucun endpoint métier additionnel côté BFF.

## Contrats partagés (`@momentarise/shared`)

### Nouveau fichier
1. `packages/shared/src/sync.ts`
2. Export obligatoire depuis `packages/shared/src/index.ts`

### Types/schemas obligatoires
1. `syncRunSchema`, `syncMessageSchema`, `syncQuestionSchema`, `syncDraftSchema`, `syncPreviewSchema`, `syncApplySchema`, `syncUndoSchema`, `syncChangeSchema`, `syncModelSchema`.
2. `syncModelCapabilitiesSchema` avec `supports_tools`, `supports_vision`, `supports_json_schema`, `max_context`, `cost_hint`.
3. `syncEventEnvelopeSchema` + union discriminée `syncEventSchema`.

### Enveloppe `syncEvent` verrouillée
1. `seq: number` (strictement croissant par run/stream).
2. `run_id: string` (UUID).
3. `ts: string` (ISO datetime UTC).
4. `trace_id: string | null`.
5. `type: "token" | "message" | "question" | "draft" | "preview" | "applied" | "usage" | "warning" | "error" | "done" | "tool_call" | "tool_result"`.
6. `payload: object` (schéma dépendant du `type`).
7. Reprise web: `from_seq` query param.
8. Reprise mobile WS: message client `{"type":"resume","from_seq":N}`.

## Modèle de données final

### Gate A (minimum runtime)
1. `ai_runs` avec `workspace_id`, `created_by_user_id`, `agent_id nullable`, `mode`, `status`, `selected_model`, `title`, `context_json`.
2. `ai_runs` snapshots obligatoires: `prompt_version`, `prompt_mode`, `system_prompt_snapshot`, `toolset_snapshot`, `retrieval_snapshot`.
3. `ai_messages` avec `run_id`, `seq`, `role`, `content_json`, `provider`, `model`, `usage_json`, `error_code`.
4. `ai_usage_events` avec coûts/tokens par run/provider/model.

### Gate D/E (complet)
1. `ai_questions`
2. `ai_drafts`
3. `ai_tool_calls`
4. `sync_memory_docs`
5. `sync_memory_chunks` avec `search_tsv` (FTS)
6. `agent_profiles`
7. `agent_profile_versions`
8. `automation_specs`
9. `automation_runs` avec `idempotency_key`, `dry_run`, `status`, `error`.

### Audit
1. Réutiliser `ai_changes` existante pour chaque apply/undo Sync.

## Modules backend à créer
1. `apps/api/src/api/v1/sync.py`
2. `apps/api/src/schemas/sync.py`
3. `apps/api/src/sync/orchestrator.py`
4. `apps/api/src/sync/prompt_composer.py`
5. `apps/api/src/sync/tool_registry.py`
6. `apps/api/src/sync/tool_policy.py`
7. `apps/api/src/sync/tool_executor.py`
8. `apps/api/src/sync/retrieval.py`
9. `apps/api/src/sync/litellm_client.py`
10. `apps/api/src/sync/ws_auth.py`

## Spécifications d’exécution verrouillées

### PromptComposer
1. Entrées: `agent_profile`, `run_mode`, snapshot user/workspace, snippets retrieval, toolset.
2. Modes: `full`, `minimal`, `none`.
3. Token budgeting: priorité aux résumés/snippets, trimming déterministe.
4. Snapshot obligatoire écrit dans `ai_runs` avant stream.
5. Sous-agent = même orchestrateur avec `prompt_mode` et `toolset` restreints.

### ToolPolicyEngine
1. Toolset exposé = intersection `agent_policy` x `plan capabilities` x `connecteurs dispo` x `runtime context`.
2. Toute action `write` marquée `requires_confirm=true`.
3. Aucune exécution `write` autorisée sans preview valide.
4. Enforcement côté backend, jamais côté UI uniquement.

### ToolExecutor
1. `preview` produit diff métier non mutante.
2. `apply` valide `preview_id` + TTL + idempotency key.
3. `undo` autorisé uniquement si `ai_change.undoable=true`.
4. Émission stream obligatoire: `tool_call` puis `tool_result`.

### Retrieval V1
1. Ingestion de texte depuis Inbox/Item/Event vers `sync_memory_docs`.
2. Chunking + index FTS sur `sync_memory_chunks.search_tsv`.
3. Filtrage metadata dur (`workspace_id`, scope agent, tags, date range).
4. Injection prompt avec provenance (`doc_id`, `source_type`, offsets).

## Sécurité streaming WS/SSE

### Web stream
1. `POST /stream` consommé via `fetch` streaming (pas EventSource).
2. Support `from_seq` pour reprise.
3. Réponse streamée forwardée telle quelle via BFF.

### WS mobile
1. `POST /ws-token` retourne token court + URL WS.
2. Claims JWT: `sub`, `run`, `exp`, `jti`.
3. TTL token: 30 à 120 secondes.
4. Anti-replay: `jti` one-time stocké (cache TTL ou table dédiée).
5. Reprise via `resume` message client avec `from_seq`.

## Implémentation UI web `/sync`
1. Copier sélectivement `project/inbox_raw/AI_Chat_interface/components/chat/*` vers `apps/web/src/components/sync-chat/*`.
2. Adapter imports vers design system existant (`apps/web/src/components/ui/*`).
3. Corriger défauts connus importés (regex markdown, retry/stale state, etc.).
4. Créer style local `apps/web/src/app/sync-chat.css` avec classes préfixées `sync-*`.
5. Hooks web: `useSyncRun`, `useSyncSse`, `useSyncApply`, `useSyncUndo`, `useSyncChanges`.
6. Page finale: thread, quick replies guidées, carte draft, panneau preview, panneau changes, actions apply/undo.

## Implémentation UI mobile `/sync`
1. Remplacer placeholder `apps/mobile/app/sync.tsx` par écran conversationnel complet.
2. Composants custom `apps/mobile/components/sync/*`.
3. Hooks mobile: `useSyncRun`, `useSyncWs`, `useSyncApply`, `useSyncUndo`.
4. Parité stricte du contrat `syncEvent` avec web.
5. Route hors tabs maintenue, accessible via points d’entrée existants.

## Plan de livraison (gates exécutable)

### Gate A
1. Shared `sync.ts` + export index.
2. Pydantic `schemas/sync.py`.
3. Tables `ai_runs`, `ai_messages`, `ai_usage_events` + migration Alembic.
4. Endpoints JSON FastAPI `models/runs/get-run/changes`.
5. Routes BFF JSON `/api/sync/*`.

### Gate B
1. LiteLLM client branché (allowlist + fallback basique).
2. Endpoint `POST /runs/{id}/stream` fonctionnel.
3. BFF streaming forward fonctionnel.
4. Événements `token/message/done` avec `seq`.

### Gate C
1. PromptComposer actif + snapshots persistés.
2. ToolPolicyEngine + ToolExecutor branchés.
3. Événements `tool_call/tool_result` streamés.
4. UI web `/sync` branchée end-to-end.

### Gate D
1. `preview/apply/undo` transactionnels.
2. Écriture `ai_changes` sur apply/undo.
3. UI mobile `/sync` WS stable.
4. Reprise web/mobile via `from_seq`.

### Gate E
1. Retrieval FTS (`sync_memory_docs/chunks`) actif.
2. Socle `agent_profiles` + `automation_specs` + `automation_runs`.
3. Idempotence automations (`idempotency_key`) et policy gate runtime.
4. Quotas/coûts/observabilité/fallback finalisés.

## Tests et scénarios d’acceptation

### Contrats
1. Zod/Pydantic alignés sur tous endpoints Sync.
2. Validation stricte enveloppe `syncEvent` et payloads.
3. Compatibilité web/mobile sur un même flux d’événements.

### Sécurité
1. Tous accès cross-tenant Sync renvoient 404.
2. Apply sans preview valide renvoie erreur métier claire.
3. WS token expiré/rejoué rejeté.

### Streaming
1. Ordre strict `seq` sans duplication après reprise.
2. Reconnexion mobile WS avec `resume_from_seq` fonctionne.
3. Annulation client ferme proprement stream/run.

### Tooling
1. Tool interdit par policy est refusé et tracé.
2. `tool_call` et `tool_result` émis sur stream.
3. `undo` restaure l’état attendu.

### Fiabilité
1. Provider primaire KO -> fallback + warning utilisateur.
2. Quota dépassé -> blocage propre + message UI.
3. Dégradation manuelle disponible si IA indisponible.

### UX
1. Mode libre et guidé fonctionnels web/mobile.
2. Draft, preview, applied et changes synchronisés.
3. Reload/reopen reprend run sans perdre le fil.

## Rollout et observabilité
1. Feature flags: `SYNC_ENABLED`, `SYNC_STREAM_ENABLED`, `SYNC_APPLY_ENABLED`, `SYNC_WS_ENABLED`, `SYNC_AUTOMATIONS_ENABLED`.
2. Métriques: latence first token, latence done, taux apply, taux undo, erreurs tools, coût run.
3. Logs corrélés avec `trace_id` et `run_id`.

## Assumptions et defaults
1. BFF Next reste minimal “comme aujourd’hui”.
2. Web streaming utilise `fetch` streaming en `POST`.
3. Mobile streaming utilise WS direct FastAPI.
4. V1 est text-first; vision/audio en V1.1.
5. UI builder Agents/Automations complète est hors V1.
6. Connecteurs externes restent read-first au départ.
7. Scheduler calendrier final reste déterministe.
