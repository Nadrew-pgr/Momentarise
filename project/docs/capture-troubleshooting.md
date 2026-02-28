# Capture Troubleshooting Runbook

Runbook opérationnel pour la pipeline "Universal Inbox" (upload, jobs, artifacts, suggestions CTA IA).

## Symptôme: `POST /api/v1/inbox/upload` retourne `413`

- Cause probable: fichier > `CAPTURE_MAX_UPLOAD_BYTES`.
- Vérifier:
  - variable `CAPTURE_MAX_UPLOAD_BYTES` dans `apps/api/.env`,
  - taille réelle du fichier côté client.
- Correctif:
  - réduire la taille du média,
  - ou augmenter `CAPTURE_MAX_UPLOAD_BYTES` puis redémarrer l’API.

## Symptôme: capture bloquée en `queued`/`processing`

- Vérifier:
  - `GET /api/v1/inbox/{capture_id}` et section `jobs`,
  - présence de `last_error` sur un job `failed`.
- Correctif:
  - relancer `POST /api/v1/inbox/{capture_id}/reprocess`,
  - corriger la cause si un provider externe échoue (transcription/OCR/maps),
  - contrôler les droits d’écriture de `CAPTURE_STORAGE_DIR`.

## Symptôme: aucune suggestion CTA pertinente

- Vérifier:
  - `GET /api/v1/inbox/{capture_id}/artifacts`,
  - qualité du transcript/OCR/extracted_text.
- Comportement attendu:
  - fallback CTA `Review` unique.
- Correctif:
  - enrichir le contenu source (audio plus clair, image nette, texte plus explicite),
  - relancer `reprocess`.

## Symptôme: auto-apply ne se déclenche jamais

- Vérifier:
  - `GET /api/v1/preferences/ai`:
    - `mode` doit être `auto_apply`,
    - `auto_apply_threshold` doit être compatible avec la confiance des suggestions.
- Rappels policy:
  - auto-apply uniquement si confiance >= seuil,
  - auto-apply uniquement sur actions sûres autorisées.
- Contrôler la suggestion primaire via `GET /api/v1/inbox` (`primary_action`).

## Symptôme: route `POST /api/v1/capture/external` refusée

- Vérifier:
  - header `X-Capture-Token` si `CAPTURE_EXTERNAL_TOKEN` est configuré,
  - auth JWT valide (route protégée),
  - `idempotency_key` (si renvoi répétitif du même payload).

## Checklist debug rapide

1. `GET /api/v1/health`.
2. `uv run alembic upgrade head` (schéma à jour).
3. Tester la capture:
   - `POST /api/v1/inbox` (texte/link),
   - `POST /api/v1/inbox/upload` (voice/photo/file).
4. Inspecter le détail:
   - `GET /api/v1/inbox/{capture_id}`,
   - `GET /api/v1/inbox/{capture_id}/artifacts`.
5. Relancer:
   - `POST /api/v1/inbox/{capture_id}/reprocess`.
