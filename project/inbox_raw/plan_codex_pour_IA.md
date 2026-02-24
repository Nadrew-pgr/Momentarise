# Plan Sync IA — Cas d’usage vers implémentation exécutable (web `/sync` + app entière)

## Documents de référence
- `project/specs/Spécifications Techniques Phase 1.md` (scope Phase 1, slices et contraintes).
- `.cursor/rules/project.mdc`
- `.cursor/rules/backend.mdc`
- `.cursor/rules/web.mdc`
- `.cursor/rules/mobile.mdc`
- `project/inbox_raw/conv_sync.md` (cas d’usage Sync/Plan Builder, pipelines et UX guidée/libre).
- `project/distilled/ledger.md` (idées KEEP liées à Sync/Plan Builder, connecteurs, IA gateway).
- `project/inbox_raw/2026-02-16_chatgpt_conv-01.md` (vision produit, patterns IA “dans le flux”, AI Changes).
- `project/inbox_raw/2026-02-16_gemini_conv-01.md` (retours architecture/risques et priorisation).
- `project/inbox_raw/momentarise_new_use_cases.md` (cas d’usage étendus à intégrer par phases).
- `project/inbox_raw/AI_Chat_interface/` (base UI de chat à adapter au BFF/FastAPI existant).

## Résumé
- Décision produit verrouillée: **Sync a une page dédiée web `/sync`**, pas d’onglet mobile dédié en V1.
- Décision technique verrouillée: **LiteLLM Proxy dès V1** pour routing/fallback/budgets/observabilité multi-modèles.
- Décision sécurité verrouillée: **Human-in-the-loop strict** (Preview -> Apply -> Undo + AI Changes), auto-exécution limitée aux actions sûres et réversibles.
- Interprétation “puissant comme openclaw” (selon conv + doc): **parité sur outils métier + connecteurs**, pas computer-use généraliste en V1.

## 1) Cas d’usage IA à couvrir (distillés des 3 sources)
1. Capture multimodale -> structuration fiable:
- Texte, lien, image, PDF, screenshot, audio, message externe.
- Pipeline extraction avec confiance/fallback (OCR/VLM/transcription), puis JSON métier validé.
2. Transformation opérationnelle:
- `Transformer` un brut en Item/Task/Event/Block structuré.
- `Planifier` dans la timeline (avec scénarios si conflit).
- `Générer` artefacts (plan, draft, checklist, résumé).
3. Sync guidé (ancien Plan Builder):
- Mode **guidé** (3–5 questions max, chips + réponse libre) + artefact plan épinglé.
- Mode **libre** (chat streaming classique).
4. Exécution traçable:
- Aucune modification silencieuse.
- Preview diff, Apply explicite, log AI Changes, Undo.
5. Mémoire et preuves:
- Réponses sourcées (pièces, items, extraits), pas de sortie “magique”.
6. Connecteurs et automatisations:
- Entrées/sorties omnicanales (Telegram/WhatsApp/etc.) via gateway standardisée.
- Workflows tool-based (pas d’actions improvisées du LLM).
7. Proactivité contrôlée:
- Digest, suggestions contextuelles, relances utiles.
- Pas d’agent autonome large sans garde-fous.

## 2) Positionnement UX final (V1/V1.5)
1. Web:
- Ajouter page **`/sync`** dans le dashboard existant.
- Garder IA ambiante partout (boutons objet: Transformer/Planifier/Générer).
- `/sync` sert aux sessions longues (guidé/libre), pas écran principal de l’app.
2. Mobile:
- Pas de tab Sync dédiée en V1.
- Actions IA contextuelles depuis Today/Timeline/Inbox + entrée rapide.
3. Pattern UI Sync obligatoire:
- Thread conversationnel.
- Carte artefact épinglée (plan draft courant).
- Questions guidées avec quick replies.
- Panneau “AI Changes” + Undo.

## 3) Changements API / interfaces publiques (obligatoires)
1. FastAPI (`/api/v1/sync/*`):
- `POST /sync/stream` (SSE): chat libre + événements structurés.
- `POST /sync/runs`: crée run guidé (objectif + contexte).
- `POST /sync/runs/{run_id}/answer`: réponse à question guidée.
- `POST /sync/runs/{run_id}/apply`: applique le draft courant (avec transaction).
- `POST /sync/runs/{run_id}/undo`: annule dernier apply.
- `GET /sync/runs/{run_id}`: état run + draft + historique.
- `GET /sync/models`: modèles autorisés/capabilités par plan utilisateur.
- `GET /sync/changes`: feed audit des changements IA.
2. Format SSE unifié (contrat partagé):
- `token`, `question`, `draft`, `preview`, `applied`, `usage`, `warning`, `error`, `done`.
3. BFF Next (`/api/sync/*`):
- Proxy auth classique pour JSON.
- **Nouveau proxy streaming** pour SSE (ne pas utiliser `res.json()`).
4. Contrats TypeScript partagés (`@momentarise/shared`):
- `syncRunSchema`, `syncQuestionSchema`, `syncDraftSchema`, `syncPreviewSchema`, `syncChangeSchema`, `syncSseEventSchema`.
- Web et mobile consomment strictement ces schémas, pas de duplication locale.

## 4) Architecture IA et routing modèles
1. Chemin d’exécution:
- Web/Mobile -> FastAPI (orchestrateur produit) -> LiteLLM Proxy -> providers.
2. Strates modèles:
- Router rapide (intention/classification).
- Reasoning (planification complexe, arbitrage).
- Fast generation (réponses courtes/formatage).
- OCR/transcription via providers dédiés, puis post-traitement LLM JSON.
3. Politique de fallback:
- Fallback provider automatique par type de tâche.
- Retry borné + circuit breaker + message UI explicite.
4. Gouvernance coût/plan:
- Entitlements + quotas (tokens, pages OCR, jobs lourds).
- Soft-limit -> warning, hard-limit -> blocage propre + UX upgrade/attente.
5. Privacy/compliance:
- Disclosure provider par provider dans settings.
- Pas de claim absolu “jamais entraîné” sans condition contractuelle.
- Mode “sensitive” pour exclure certaines données du pipeline IA.

## 5) Data model à prévoir
1. IA runtime:
- `ai_runs`, `ai_messages`, `ai_questions`, `ai_drafts`, `ai_tool_calls`, `ai_changes`.
2. Captures/artifacts:
- `file_objects`, `extraction_artifacts`, `capture_links` (source -> item/artifact).
3. Connecteurs:
- `connector_accounts`, `connector_webhooks`, `connector_events`, `automation_rules`, `automation_runs`.
4. Usage/billing:
- `usage_counters`, `usage_events`, `entitlements`.
5. Invariants:
- `workspace_id` partout.
- soft-delete.
- accès cross-tenant -> **404**.
- horodatage UTC.

## 6) Pipeline Sync (décision complète)
1. Ingestion:
- Entrée brute + métadonnées source + pièces.
2. Normalisation:
- Détection type input.
- Lancement job extraction adapté (OCR/VLM/transcription).
3. Structuration:
- JSON strict validé par schéma partagé.
- Score confiance + flags `needs_review`.
4. Raisonnement:
- Intent Router -> `auto_safe`, `confirm`, `suggest`.
5. Exécution:
- tool call en mode preview.
- apply transactionnel sur confirmation.
- log AI Changes.
6. Récupération:
- erreurs explicites, fallback manuel, aucune perte de contexte.

## 7) Plan d’implémentation par phases
1. Phase A — Foundation Sync (après gate Slice 4):
- Ajouter contrats partagés Sync.
- Ajouter tables runtime IA + logs + usage.
- Ajouter endpoints FastAPI Sync JSON + SSE.
- Ajouter BFF streaming proxy.
2. Phase B — UI web `/sync`:
- Intégrer l’UI cible depuis `AI_Chat_interface` (composants chat, pas projet entier).
- Conserver l’apparence/animations, mais isoler le CSS (`sync-*`) pour éviter conflits globaux.
- Brancher aux endpoints BFF Sync.
3. Phase C — Tools métier:
- Tools internes: create/update item, create/update event, planifier/replanifier, generate draft, summarize.
- Preview/apply/undo obligatoire.
4. Phase D — Connecteurs V1.5:
- Telegram + GitHub read-first.
- WhatsApp ensuite (coût/compliance).
- Calendar sync avancée plus tard (v1 via liens/injection simple).
5. Phase E — Proactivité contrôlée:
- Jobs digest/rappels/suggestions.
- Limites strictes de fréquence, préférence utilisateur, opt-in.

## 8) Intégration “UI exacte” depuis `AI_Chat_interface`
1. Ce qu’on reprend:
- `chat-shell`, `composer`, `message-list`, `message-bubble`, animations/orb.
2. Ce qu’on ne reprend pas tel quel:
- Route `app/api/chat/route.ts` du template (direct provider via SDK).
- `globals.css` global complet du template.
3. Adaptation obligatoire:
- Remplacer appels `/api/chat` par `/api/sync/stream` (BFF -> FastAPI).
- Supprimer stockage local des messages comme source unique; persistance serveur via `ai_runs`.
- Ajouter i18n existante du projet.
- Injecter auth workspace existante.
4. Résultat attendu:
- Même look & feel principal.
- Backend et contraintes Momentarise respectés.

## 9) Tests et scénarios d’acceptation
1. Contrats:
- Validation Zod/Pydantic alignée pour tous payloads Sync.
2. Streaming:
- SSE stable (token order, done event, cancel client).
3. Guidé:
- Max 5 questions, draft généré, édition, apply.
4. Sécurité:
- cross-tenant 404 sur runs/messages/changes.
- aucune action destructive sans confirmation.
5. Fiabilité:
- provider down -> fallback + message utilisateur.
- OCR/transcription échoue -> état `needs_review`.
6. Audit:
- chaque apply crée AI Change avec before/after + reason.
- undo restaure l’état précédent.
7. Coût:
- quotas/limits appliqués et testés.
8. UX:
- état vide, erreur, retry, offline temporaire, reprise de run.

## 10) Assumptions et defaults retenus
1. “Puissance openclaw”:
- On vise d’abord la puissance **outil métier + orchestration connecteurs** dans le domaine Momentarise.
2. Surface:
- Web `/sync` dédié; mobile sans tab dédiée en V1.
3. IA ops:
- LiteLLM Proxy dès V1.
4. Sécurité produit:
- Human-in-the-loop strict par défaut.
5. Scope:
- Pas de computer-use généraliste en V1.
- Pas d’agent autonome large tant que logs/undo/quotas/fallback ne sont pas prouvés en production.
