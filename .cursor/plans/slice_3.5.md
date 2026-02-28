# Slice 3.5 — Capture Réelle + Correctifs Existants (UI/Data/API) + Parité Finale FullCalendar

## Résumé
Objectif: finaliser la capture réelle web/mobile, corriger les éléments déjà présents (UI, data, API, pipeline, navigation, éditeurs), et terminer la parité visuelle `/calendar` ↔ `/timeline`.  
Décisions verrouillées:
1. Ne pas modifier la doc/plan `slice_3_codex` existant.
2. Nouveau lot autonome “Slice 3.5”.
3. Web: bouton `+` flottant global dashboard.
4. Mobile: conserver le `+` central tab bar.
5. Transcription: mode **classique asynchrone** par défaut.
6. Realtime: prévu dans l’architecture, non activé dans ce lot.

## Changements publics API/interfaces/types
1. `POST /api/v1/inbox/upload` (multipart) pour voice/photo/file.
2. `GET /api/v1/inbox/{capture_id}` (détail capture + état pipeline).
3. `GET /api/v1/inbox/{capture_id}/artifacts` (transcript/OCR/preview).
4. `POST /api/v1/inbox/{capture_id}/reprocess` (relance jobs).
5. `POST /api/v1/capture/external` (share/deeplink/extension).
6. Extension des contrats partagés: `CapturePipelineStatus`, `CaptureAssetOut`, `CaptureArtifactOut`, `CaptureDetailResponse`.

## Plan d’implémentation strict

## 1) DB
1. Ajouter `capture_assets` (références fichiers audio/image/doc).
2. Ajouter `capture_artifacts` (transcription/OCR/preview).
3. Ajouter `capture_jobs` (queue asynchrone + retries bornés).
4. Migration de correction legacy `inbox_captures`:
5. backfill `capture_type` manquant en `text`.
6. backfill `status` manquant en `captured`.
7. normaliser `source` à `manual` si null.
8. normaliser clés `metadata` (`channel`, `origin`, `auto_process`).
9. Ajouter index `(workspace_id, status, deleted_at)` sur captures/jobs/artifacts.

## 2) API backend
1. Implémenter `POST /inbox/upload`:
2. validation MIME/taille.
3. création capture + asset.
4. statut initial `queued`.
5. planification job auto selon type.
6. Implémenter pipeline classique:
7. `voice` => transcription (adapter provider, Voxtral-ready).
8. `photo/file` => extraction OCR/VLM adapter.
9. tous types => génération preview auto.
10. sortie pipeline => `ready` ou `failed` avec erreur explicite.
11. Implémenter `GET /inbox/{id}`, `GET /inbox/{id}/artifacts`, `POST /inbox/{id}/reprocess`.
12. Implémenter `POST /capture/external` sécurisé (token extension).
13. Garder `preview/apply/process` existants compatibles.
14. Correction API existante capture:
15. réponses d’erreur uniformisées.
16. idempotency key sur upload/external.
17. interdiction cross-workspace sur toutes routes capture.

## 3) Shared package
1. Étendre `packages/shared/src/inbox.ts` avec schémas upload/détail/artifacts/jobs.
2. Exporter dans `packages/shared/src/index.ts`.
3. Garder contrat JSON blocks commun pour BlockNote/TenTap sans divergence.

## 4) Web — capture + correction UX existante
1. Ajouter FAB global `+` dans layout dashboard:
2. fixe bas-droite.
3. semi-transparent au repos.
4. opaque hover/focus.
5. Ajouter `CaptureHubSheet` web global:
6. `Note` crée item direct.
7. `Voice` enregistre puis upload.
8. `Photo` upload image.
9. `Link` capture URL.
10. `File` upload doc.
11. `Sync` redirige `/sync`.
12. Corriger Inbox web existante:
13. supprimer le vieux bloc de création inline concurrent.
14. garder captures + items récents + preview/apply/process.
15. afficher statut pipeline et erreurs job.
16. Corriger éditeur note web (BlockNote):
17. imports CSS globaux stables.
18. shell plein écran propre.
19. slash menu stable.
20. autosave débouncé sans ping-pong GET/PATCH.
21. Corriger navigation web:
22. retour Inbox cohérent depuis détail item.
23. pas de redirection inattendue.

## 5) Mobile — capture réelle + correction UX existante
1. Conserver `+` central tab bar et BottomSheet global.
2. Finaliser `BottomSheetCreate`:
3. actions réelles pour Voice/Photo/Link/File/Note/Sync.
4. verrou anti double-submit.
5. reset erreurs à l’ouverture.
6. feedback clair mutation.
7. Corriger Inbox mobile existante:
8. retirer le composer “ajouter capture texte” concurrent.
9. CTA explicite vers bouton `+`.
10. conserver preview/apply/process liste captures.
11. Migrer liste vers FlashList si validé Expo SDK, sinon fallback FlatList documenté.
12. Corriger éditeur note mobile (TenTap):
13. toolbar réellement utile.
14. rendu bloc non “input-like”.
15. compat JSON blocks web/mobile.
16. autosave débouncé 700ms.
17. Corriger navigation mobile:
18. retour item => Inbox fiable (stack-aware + fallback).
19. transitions create/process/apply sans sauts vers Today.

## 6) Pipeline capture — comportement produit final Slice 3.5
1. Capture créée.
2. pipeline auto classique lancé.
3. artifacts générés (transcript/OCR/preview).
4. item non créé automatiquement.
5. utilisateur choisit `apply` ou `process`.
6. toute action IA reste `preview -> apply -> undo`.

## 7) FullCalendar — dernière passe visuelle indiscernable
1. Aligner week/day headers (typo, opacité, spacing) avec Coss.
2. Aligner labels horaires (24h, ordre visuel, densité).
3. Aligner grille (hauteur slots, bordures, contraste).
4. Aligner events (radius, padding, time/title, truncation).
5. Aligner état barré passé et tracking accent.
6. Supprimer toute trace visuelle “moteur différent”.

## 8) Section “Correction des éléments présents (capture)” à inclure dans la Slice 3.5
1. Data correction:
2. migration de normalisation `inbox_captures`.
3. nettoyage captures orphelines et assets sans capture.
4. API correction:
5. erreurs cohérentes.
6. idempotence upload/external.
7. statuts pipeline uniformes.
8. UI correction web/mobile:
9. suppression des flux de capture concurrents.
10. hub capture unique par plateforme.
11. éditeurs notes réellement utilisables (BlockNote/TenTap).
12. Navigation correction:
13. retours Inbox fiables.
14. stack de navigation stable après create/process/apply.
15. Pipeline correction:
16. visibilité état capture (`queued/processing/ready/failed`).
17. reprocess utilisateur.
18. retry explicite.

## 9) Tests obligatoires

## Backend
1. Upload voice/photo/file crée capture + asset + jobs.
2. Transcription/OCR classique produit artifact attendu.
3. Auto-preview générée sans auto-apply.
4. `reprocess` fonctionne.
5. migration legacy corrige données existantes.
6. isolation workspace validée.

## Web
1. FAB visible sur toutes pages dashboard.
2. Hub capture web complet fonctionnel.
3. Inbox sans vieux composer concurrent.
4. BlockNote stable (slash + autosave).
5. `/calendar` indistinguable de `/timeline` en week/day.

## Mobile
1. `+` central stable multi-ouverture.
2. BottomSheet capture réelle sur tous canaux.
3. Inbox sans composer concurrent.
4. TenTap utilisable (toolbar + save state).
5. retour item vers Inbox fiable.

## QA commandes
1. `npm run -w apps/web lint`
2. `cd apps/web && npx tsc --noEmit`
3. `cd apps/mobile && npx tsc --noEmit`
4. `cd apps/api && uv run python -m py_compile src/api/v1/inbox.py src/api/v1/items.py src/api/v1/events.py src/api/v1/timeline.py src/schemas/inbox.py`

## 10) Docs / idées (sans toucher slice_3_codex)
1. Créer `.cursor/plans/slice_3_5_capture_reelle.md`.
2. Ajouter runbook `project/docs/capture-troubleshooting.md`.
3. Ajouter dans `.learnings/IDEAS.md`:
4. architecture realtime future (streaming transcription optionnelle).
5. architecture settings user/workspace pour préférences capture.

## Assumptions et defaults
1. Transcription classique asynchrone est le mode production de cette slice.
2. Realtime reste feature-flag future (non activée).
3. `+` web flottant, `+` mobile tab bar central.
4. Les canaux non disponibles en device/simulator montrent un fallback explicite.
5. Aucune auto-mutation item sans validation utilisateur.
