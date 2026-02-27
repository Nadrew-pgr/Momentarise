# Slice 3 v2 — Capture Hub, Linking Graph, Sync-ready (remplace Slice 3 actuelle)

## Résumé
Cette nouvelle Slice 3 remplace `Journaling & mood` par un flux utile pour la vision produit: `Capture -> Structurer -> Proposer -> Apply/Undo`, avec linking explicite entre `InboxCapture`, `Item`, `Event/Moment`, `Plan`, `Blocks`.  
Elle inclut aussi les correctifs UX bloquants que tu as listés (timeline vide mais visible, `+` hub clair, éditeurs utilisables, suppression item, navigation mobile propre).  
Le mood logging est déplacé hors Slice 3 (backlog bien-être, plus tard).

## Méthode de construction des slices (appliquée strictement)
1. Source de vérité: spec Phase 1 + règles Cursor; aucune implémentation hors scope de la slice active.
2. Ordre non négociable dans chaque sous-slice: `DB -> API -> Shared contracts -> Web -> Mobile -> Tests -> Doc/DoD`.
3. Vertical slicing obligatoire: chaque sous-slice livre une valeur testable visible utilisateur.
4. Gate de passage: `Works` (fonctionne), `Safe` (preview/apply/undo + logs), `Stable` (pas de régression UX/perf).
5. Après validation: cocher DoD dans la spec et figer les décisions dans la slice doc.

## Invariants métier verrouillés (glossaire inclus)
1. `InboxCapture`: entrée brute (texte/audio/photo/lien/share/deeplink), jamais perdue, état explicite.
2. `Item`: objet de travail structuré (note, objectif, tâche, ressource, etc.), éditable, supprimable (soft delete).
3. `Event` = `Moment` planifié dans la timeline, lié à un `Item` principal.
4. `Block`: contenu structuré d’un item (text/link/checklist/attachment ref), avec `block_id` stable.
5. `Link` (nouvelle primitive): relation explicite entre entités (`derived_from`, `supports_goal`, `planned_as`, `references`, `part_of_sequence`).
6. IA: toujours `preview -> apply -> undo`, jamais de mutation silencieuse.

## Points à corriger (incluant ceux non explicitement listés)
1. Timeline mobile vide: doit afficher la structure horaire même sans événements.
2. `+` mobile: doit rester un hub de capture (pas une navigation forcée vers un écran intermédiaire bloquant).
3. Workflow note/capture: “process” devient optionnel, pas obligatoire pour créer/utiliser un item.
4. Retour item mobile: retour fiable vers Inbox (stack-aware), pas redirection inattendue vers Today.
5. Éditeur mobile: passe d’un ressenti “input” à un vrai éditeur bloc avec toolbar utile.
6. Suppression item: impossible actuellement, à ajouter end-to-end avec undo court.
7. Timezone timeline adapter: éviter les conversions UTC qui décalent les heures en local.
8. Cohérence UI: tokens sémantiques uniques web/mobile (même langage visuel, composants différents).

## Plan d’exécution (ordre strict)

### 0) Stabilisation immédiate (pré-gate)
1. Corriger timeline mobile pour afficher `TimelineList` même quand `events=[]`, avec empty overlay non bloquant.
2. Corriger navigation retour item mobile: `back()` puis fallback explicite Inbox.
3. Garder le `+` en bottom sheet, fermer proprement la sheet, plus aucun “écran create” imposé.
4. DoD: les 3 bugs UX sont reproduits puis validés corrigés.

### 1) Modèle de données Slice 3 v2
1. Étendre `Item` avec `kind`, `status`, `metadata` JSON, `source_capture_id` nullable.
2. Ajouter `entity_links` (from_type/from_id -> to_type/to_id, relation_type, metadata, workspace_id, soft delete).
3. Ajouter `ai_changes` minimal (before/after, reason, actor, undoable) pour audit apply/undo.
4. Ajouter `block_id` stable dans le contrat des blocks (au moins pour nouveaux blocks).
5. DoD: migrations propres, indexées, workspace-safe, sans casser Slice 1/2.

### 2) API backend (contrats décision-complete)
1. Ajouter `POST /api/v1/items` pour création directe (note/objective/task) sans passage forcé par `process`.
2. Ajouter `DELETE /api/v1/items/{id}` (soft delete) et `POST /api/v1/items/{id}/restore`.
3. Ajouter `GET /api/v1/items/{id}/links` et `POST /api/v1/items/{id}/links`.
4. Conserver `POST /api/v1/inbox/{id}/process` mais le repositionner en action de transformation optionnelle.
5. Ajouter `POST /api/v1/inbox/{id}/preview` et `POST /api/v1/inbox/{id}/apply` (même en mode heuristique non-LLM au début).
6. DoD: isolation workspace, idempotence minimale, erreurs explicites.

### 3) Shared package (contrats uniques web/mobile)
1. Ajouter enums partagés `CaptureType`, `ItemKind`, `LifecycleStatus`, `LinkRelationType`.
2. Ajouter schémas `ItemCreateRequest`, `ItemDelete/Restore`, `EntityLink`, `Preview/ApplyResult`.
3. Ajouter schéma block commun strict (subset web/mobile) avec `block_id`.
4. DoD: plus de duplication locale de types transverses.

### 4) Web (Inbox/Item/Sync-ready)
1. Inbox web: `+ capture` multi-options avec états clairs; `process` devient un choix, pas une étape obligatoire.
2. Item detail web: garder plein écran + autosave débouncé + état `saving/saved/error`.
3. Ajouter action supprimer + undo toast.
4. Ajouter panneau “Linked to” (objectif, moment, plan, captures source).
5. Préparer route `/sync` pour handoff capture/item (même en mode stub au début).
6. DoD: workflow web aligné vision produit, sans ping-pong réseau.

### 5) Mobile (Capture hub + éditeur + timeline)
1. Bottom sheet `+`: options `Note`, `Voice`, `Photo`, `Link`, `Sync`; options non prêtes restent visibles en placeholder réaliste/translucide mais non mensongères.
2. `Note`: crée directement un item draft puis ouvre page item plein écran.
3. `Voice/Photo/Link`: créent une `InboxCapture` typée (capture first), puis proposition `preview/apply`.
4. Item mobile: vrai éditeur bloc (toolbar + extensions utiles + statut save), plus aucun flux “input-only”.
5. Timeline mobile: toujours visible, même vide, style cohérent avec tokens app.
6. DoD: `+` utile, sortie/réentrée fluide, parité de comportement avec web.

### 6) Linking fonctionnel entre tout (prépare les cas d’usage futurs)
1. Règle: un objectif est un `Item kind=objective`; un plan est un ensemble d’items + links.
2. Un `Event/Moment` pointe vers un item principal et peut lier des items secondaires via `entity_links`.
3. Les blocks restent dans item, et les références contextuelles passent par `block_id` + metadata link.
4. Les actions Sync manipulent ces mêmes primitives, pas de modèle parallèle.
5. DoD: depuis un item, on peut voir ses sources, ses liens objectifs, et ses moments planifiés.

### 7) RAG/metadata (préparation propre sans surcharger Slice 3)
1. Standardiser `metadata` item/capture pour retrieval futur (tags, source, confidence, timestamps, channel).
2. Ajouter extraction textuelle normalisée minimale (pas de vectorisation complète ici).
3. Définir contrat de retrieval traçable (pourquoi cet item est remonté).
4. Vector DB/embeddings complets restent en Slice 4, mais le contrat est prêt.
5. DoD: RAG-ready sans casser le scope Phase 1.

### 8) Documentation/spec/plans
1. Remplacer officiellement la section Slice 3 actuelle dans la spec par cette Slice 3 v2.
2. Déplacer “mood/habits” vers backlog slice ultérieure.
3. Mettre à jour les plans Cursor liés (ordre, DoD, out-of-scope, commandes QA).
4. Ajouter un bloc “Invariants Capture/Sync” court et non ambigu dans la spec.
5. DoD: implémenteur peut exécuter sans décision restante.

## Changements publics API/interfaces/types
1. `POST /api/v1/items` (nouveau).
2. `DELETE /api/v1/items/{id}` + `POST /api/v1/items/{id}/restore` (nouveaux).
3. `GET/POST /api/v1/items/{id}/links` (nouveaux).
4. `POST /api/v1/inbox/{id}/preview` + `POST /api/v1/inbox/{id}/apply` (nouveaux).
5. Nouveaux types partagés: lifecycle, kinds, links, preview/apply, block_id stable.

## Tests et scénarios obligatoires
1. `+` mobile ouvre/ferme la sheet proprement, sans navigation bloquante.
2. Flow note: `+ -> Note -> item plein écran` sans étape process forcée.
3. Flow capture brute: voice/photo/link créent capture puis preview/apply.
4. Retour item mobile renvoie à Inbox de façon fiable.
5. Timeline mobile affiche axe/grille même avec `events=[]`.
6. Suppression item: delete soft + undo fonctionnels web et mobile.
7. Cross-platform editor: édition web relue mobile, édition mobile relue web, sans corruption.
8. Aucun spam réseau type `GET/PATCH` alterné à chaque frappe.
9. Isolation workspace validée sur toutes les nouvelles routes.
10. QA commands: lint web, typecheck mobile, checks backend schema/routes ciblés.

## Assumptions et defaults retenus
1. Slice 3 actuelle est entièrement remplacée par Slice 3 v2.
2. Mood logging sort de Slice 3 et part en backlog ultérieur.
3. `Event` reste la primitive timeline; “Moment” est le terme produit.
4. IA reste assistive en Phase 1: pas d’autonomie destructive.
5. Web/mobile gardent leurs composants natifs, cohérence assurée via tokens sémantiques.

## Statut d’implémentation (en cours)
- [x] Backend: modèles `items`/`inbox_captures` étendus + tables `entity_links` / `ai_changes`.
- [x] Backend: endpoints `POST /items`, `DELETE /items/{id}`, `POST /items/{id}/restore`, `GET/POST /items/{id}/links`, `POST /inbox/{id}/preview`, `POST /inbox/{id}/apply`.
- [x] Backend: endpoints timeline scalables `GET/POST /events` + `PATCH/DELETE /events/{id}` + garde multi-device (`last_known_updated_at`).
- [x] Backend: migration DB de durcissement events (`c6d5f7a1b2c3`) appliquée.
- [x] Shared: enums/schemas capture-kind-status-links + `block_id` dans les blocks.
- [x] Shared: contrats events (`EventCreateRequest`, `EventUpdateRequest`, `EventsRangeResponse`) + `EventOut.updated_at`.
- [x] Web: BFF routes nouvelles + `/sync` stub + inbox/actions preview/apply + item delete/undo + panel links.
- [x] Web: BFF `GET/POST /api/events` et `PATCH/DELETE /api/events/[id]` ajoutés.
- [x] Web: timeline migrée vers calendrier Coss avec persistance API (CRUD) + section tracking start/stop.
- [x] Web: refactor React 19 des composants Coss sans contournement lint.
- [x] Mobile: `+` hub capture (note direct item + captures typées) + `/sync` stub.
- [x] Mobile: timeline visible même vide + erreur réseau non bloquante + empty state unique.
- [x] Mobile: `+` renforcé (réouverture stable, reset erreur, actions désactivées pendant mutation).
- [x] QA complète et ajustements finaux lint/typecheck/py_compile.

### Validation exécutée
1. `python3 -m py_compile apps/api/src/api/v1/items.py apps/api/src/api/v1/inbox.py apps/api/src/schemas/item.py apps/api/src/schemas/inbox.py apps/api/src/models/item.py apps/api/src/models/inbox_capture.py apps/api/src/models/entity_link.py apps/api/src/models/ai_change.py`
2. `cd apps/api && uv run python -m py_compile src/api/v1/events.py src/schemas/event.py src/api/v1/timeline.py`
3. `cd apps/api && uv run alembic upgrade head`
4. `cd apps/web && npm run lint -- --max-warnings=0`
5. `cd apps/mobile && npx tsc --noEmit`

### Points non couverts par cette slice (à ne pas confondre avec des régressions)
1. Intégration visuelle complète de `project/inbox_raw/AI_Chat_interface` dans `/sync` (la route `/sync` est un stub).
2. Système de design tokens unifié web+mobile avec source de vérité partagée (`packages/ui-tokens`): non implémenté dans Slice 3 v2.
3. Parité complète d’édition bloc web/mobile (toolbar avancée, extensions riches, comportement identique): partiel.
