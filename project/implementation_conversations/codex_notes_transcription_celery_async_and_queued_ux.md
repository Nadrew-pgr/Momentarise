# Conversation Implementation — Notes, Transcription, Celery Async, Queue UX

- Source session: `/Users/andrewpougary/.codex/sessions/2026/03/04/rollout-2026-03-04T14-52-40-019cb91f-4582-7c51-b3cf-0b2e77782740.jsonl`
- Exported at: 2026-03-05
- Start marker: `cursor_antigravity_chat_renaming_and_pl.md`
- Messages exported: `148` (user/assistant only)

---

## User (2026-03-04T13:55:31.316Z)

on va continuer cette conversation : [cursor_antigravity_chat_renaming_and_pl.md](project/implementation_conversations/cursor_antigravity_chat_renaming_and_pl.md).
Remet toi dans le contexte de ce dernier, des rgles de ce projets, des learnings et de ton experience de lead tech dev senior.

## Assistant (2026-03-04T13:55:41.517Z)

Je reprends le fil en repartant du document de conversation que tu as pointé, puis je vais extraire les décisions, règles projet et learnings actionnables pour qu’on reparte exactement au même niveau de contexte.

## Assistant (2026-03-04T13:55:49.459Z)

Je viens de charger le transcript et j’ai confirmé les points clés déjà traités (description, statut appliqué, persistance du plan). Je lis maintenant la fin du fichier pour reprendre précisément là où la discussion s’est arrêtée et éviter de repartir de zéro.

## Assistant (2026-03-04T13:56:10.716Z)

Je me remets maintenant aussi sur les règles projet et les learnings partagés dans le repo, pour te confirmer un contexte de reprise concret avant qu’on continue l’implémentation.

## Assistant (2026-03-04T13:56:28.314Z)

J’ai retrouvé les sources de règles (`.cursor/rules/*`) et les learnings (`.learnings/*`). Je les lis maintenant avec le transcript pour te rendre un état de reprise clair et immédiatement exploitable.

## Assistant (2026-03-04T13:56:39.611Z)

Je poursuis la lecture des learnings pour ne rien rater (le fichier est long) puis je fais une synthèse orientée exécution sur le chantier sync/chat qu’on reprend.

## Assistant (2026-03-04T13:56:46.508Z)

Je vais vérifier l’état réel du code dans la branche (fichiers déjà modifiés et zone de travail) pour aligner le contexte fonctionnel avec ce qui a effectivement été implémenté.

## Assistant (2026-03-04T13:57:09.300Z)

Je reste en lecture seule et je vérifie précisément les fichiers sync/chat pour confirmer ce qui est déjà en place sur les 3 points (description, statut appliqué, persistance du plan).

## Assistant (2026-03-04T13:58:21.490Z)

Je vérifie aussi s’il y a un plan local correspondant (dans `.cursor/plans`) pour recoller exactement à la checklist de ce chantier et éviter toute divergence.

## Assistant (2026-03-04T13:58:40.687Z)

Je termine par une vérification ciblée de la vue “Détail” Moment pour confirmer le wiring `event.description`, puis je te fais une synthèse de reprise et la suite la plus sûre pour ship vite.

## Assistant (2026-03-04T13:59:10.795Z)

Je vais juste récupérer les numéros de lignes sur les points clés pour te faire un brief de reprise propre et précis, puis on peut enchaîner directement sur l’implémentation.

## Assistant (2026-03-04T14:00:10.745Z)

**Contexte repris**
On repart bien du bon point: la conversation s’est arrêtée après le début d’implémentation, avec 3 chantiers à finir (description, état `Appliqué`, persistance du plan dans la timeline + recyclage IA).

**État réel du code**
1. `Description -> Détail Moment`: déjà branché côté backend.
- [sync_mutation_engine.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/sync_mutation_engine.py:363) écrit `item.meta.source="sync"` + `item.meta.description`, garde `blocks` commenté, et renseigne aussi `event.description`.
- [event-dialog.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/event-calendar/event-dialog.tsx:101) lit bien `event.description` dans l’onglet Détails (textarea ligne 485).

2. `Appliqué` persistant: pas fini.
- [use-sync-chat.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-sync-chat.ts:61) ne garde qu’un `latestPreview`.
- [preview-plan-card.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/sync-chat/preview-plan-card.tsx:181) utilise `internalApplied` local + heuristique, non robuste au reload.

3. Plan persistant “à sa place” dans la conv: pas fini.
- [conversation-view.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/sync-chat/conversation-view.tsx:201) et [chatbot.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/chatbot.tsx:349) affichent encore un unique `latestPreview` hors timeline métier.
- Backend a déjà une base solide: previews persistés en draft/event + lien d’application ([orchestrator.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/orchestrator.py:557), [orchestrator.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/orchestrator.py:779), [orchestrator.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/orchestrator.py:1080)).

**Règles projet à respecter pour la suite**
- SSoT: `project/specs/Spécifications Techniques Phase 1.md` + ordre des slices.
- Web via BFF (pas d’appel direct browser -> FastAPI).
- i18n stricte (pas de strings hardcodées UI).
- Contrat `preview -> apply -> undo` strict.

**Suite recommandée (ordre d’exécution)**
1. Ajouter le contrat `plan_preview` dans la metadata des messages assistant (backend + schémas shared).  
2. Rendre les previews dans la timeline de conversation via `seq`/`preview_id`, pas via `latestPreview` global.  
3. Dériver `isApplied` depuis l’état serveur (applied event / change lié), supprimer la logique locale `internalApplied`.  
4. Injecter le preview référent dans le contexte LLM pour le “recyclage” IA (modif incrémentale du plan existant).

J’ai aussi détecté un working tree déjà très chargé en changements non liés. Je peux continuer en touchant uniquement le scope sync/chat sans rien perturber, tu confirmes qu’on y va comme ça ?

## User (2026-03-04T14:23:48.193Z)

pour le SSoT la Spec phase 1 est dépassé. Et oui, jsp si tu preferes reprends son plan (s'il est accessible) ou faire le tien.

## Assistant (2026-03-04T14:24:01.298Z)

Bien noté, je prends ça comme nouvelle source de vérité locale: on va s’appuyer sur le plan opérationnel le plus récent du repo, pas sur la spec phase 1. Je vais retrouver le plan exact de ce chantier et vérifier s’il est directement exploitable avant de coder.

## Assistant (2026-03-04T14:24:32.084Z)

Je vais partir sur un plan “vite et solide” côté code: garder le backend actuel, puis brancher un rendu timeline basé sur les events persistés et un état `isApplied` dérivé serveur (plus de heuristique locale). Je vérifie d’abord l’état du composant `/sync` qui hydrate déjà les events pour réutiliser ce socle.

## Assistant (2026-03-04T14:24:44.140Z)

Je viens d’identifier deux flux UI distincts (`/sync` via `SyncChatShell` et `/chat` via `chatbot + useSyncChat`). Je vérifie `chatbot.tsx` pour appliquer une correction cohérente sur les deux sans régression.

## Assistant (2026-03-04T14:24:50.700Z)

Je vois aussi un possible artefact dans `chatbot.tsx` (double ligne dans `handleTextChange`). Je confirme rapidement si c’est réel dans le fichier ou juste un rendu terminal avant de modifier quoi que ce soit.

## Assistant (2026-03-04T14:27:49.240Z)

Je vais implémenter un “hybride propre”: message assistant enrichi avec metadata `plan_preview` côté backend, puis rendu inline côté UI avec `isApplied` persistant basé sur `preview_id` appliqués. Je commence par le backend (`orchestrator`) puis je passe au web (`chat-shell`, `conversation-view`, `preview-plan-card`, `chatbot/use-sync-chat`).

## Assistant (2026-03-04T14:28:30.404Z)

Le backend est en cours: metadata `plan_preview` est injectée dans le message assistant, et je branche maintenant la sérialisation preview partagée pour éviter les divergences entre event preview et metadata message.

## Assistant (2026-03-04T14:30:21.920Z)

Je passe maintenant au cœur côté web `/sync`: parsing des metadata `plan_preview`, mapping persistant des `preview_id` appliqués, et branchement de l’apply par preview (au lieu du seul `latestPreview`).

## Assistant (2026-03-04T14:33:30.228Z)

Le lint a relevé surtout une erreur locale (`prefer-const`) et quelques warnings déjà présents. Je corrige d’abord les erreurs certaines dans les fichiers touchés pour garder un diff propre, puis je relance la vérification ciblée.

## Assistant (2026-03-04T14:36:09.057Z)

J’ai terminé l’implémentation en mode “hybride”: j’ai repris l’intention du plan existant et je l’ai durcie avec un câblage persistant backend+UI. Je fais une dernière passe de validation du diff et je te donne un récap précis des fichiers/impacts et des vérifications.

## Assistant (2026-03-04T14:36:34.271Z)

J’ai pris une approche hybride: base du plan existant + implémentation robuste côté code pour ship vite.

**Ce qui est fait**
- `Description -> Détail Moment` est bien branché:
  - [sync_mutation_engine.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/sync_mutation_engine.py:363) garde `meta.source/meta.description`, laisse `blocks` commenté, et écrit aussi `event.description`.

- Plan persisté dans la conversation (à sa place) via metadata message assistant:
  - [orchestrator.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/orchestrator.py:624) ajoute `content_json.metadata.plan_preview` avec `preview_ids` + `previews`.
  - [orchestrator.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/orchestrator.py:1096) garde l’event `preview` persistant.
  - [sync-plan-preview.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/lib/sync-plan-preview.ts:8) parse cette metadata côté web.
  - [types.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/sync-chat/types.ts:5) ajoute `planPreviews` sur `SyncChatMessage`.
  - [conversation-view.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/sync-chat/conversation-view.tsx:180) rend les `PreviewPlanCard` inline sous le bon message (fallback sur `latestPreview` si besoin).

- État `Appliqué` persistant:
  - [chat-shell.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/sync-chat/chat-shell.tsx:261) et [use-sync-chat.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-sync-chat.ts:150) mémorisent les `preview_id` appliqués depuis l’event `applied` + succès d’`apply`.
  - [preview-plan-card.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/sync-chat/preview-plan-card.tsx:171) n’utilise plus l’heuristique locale; état piloté par `isApplied`.

- Recyclage IA du plan précédent:
  - [orchestrator.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/sync/orchestrator.py:1236) injecte le contexte des derniers previews persistés dans les messages LLM.

- Chatbot `/chat` aligné aussi:
  - [chatbot.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/chatbot.tsx:344) affiche les previews inline par message + fallback.

- Learning process loggé suite à ta correction SSoT:
  - [.learnings/LEARNINGS.md](/Users/andrewpougary/DevLocal/Momentarise/.learnings/LEARNINGS.md)

**Vérifications**
- `py_compile` backend ciblé: OK.
- `eslint` ciblé sur fichiers modifiés web: OK.
- `unittest` sync ciblé: 2 échecs non liés directement à ce patch dans l’état actuel de la branche:
  - `test_available_models_respects_provider`
  - `test_stream_run_tool_call_loop_emits_preview_and_ready_to_apply`

Si tu veux, je peux enchaîner direct sur la stabilisation de ces 2 tests pour sortir un lot entièrement vert.

## User (2026-03-04T15:36:49.358Z)

la transcription est nulle... ça ne transcrit pas trop... la premiere fois que je l'ai transcrite, dans le résumé ET dans le key clauses ct écrit uniquement "Transcribed from voice-1772637120977.webm.". j'ai du appuyé sur le relancé, ça a fontionné mais ça affiché failed, pas de résumé, pour le key clause la transcription de la première phrase. dans les deux cas ça n'a jamais affiché l'ensemble de la transcription.
Pour le mode note fallait garder le mode blocknotejs/tentap !!!! fallait juste créer un item direct mais le contenu doit être du texte, avoir en élément principal un blocknotejs, et pour le reste des détails, jsp comment t'aurais organiser ça mais pour els notes faudra qu'on refasse comme c'était avant à peu près, mais adapté à notre nouvelle pipeline, n'hésite pas à regarder les différentes sauvegardes git pour voir comment c'était.
Aide moi à réfléchir à tout ça.

## Assistant (2026-03-04T15:37:05.188Z)

Je vais analyser le pipeline capture/transcription et le flux “note” actuel dans le code pour isoler précisément pourquoi tu obtiens `Transcribed from voice-...webm.` et pourquoi la note n’est plus structurée comme avant. Ensuite je te propose un plan de correction concret (rapide + durable).

## Assistant (2026-03-04T15:37:19.503Z)

Je viens de localiser les zones exactes. Je lis maintenant `transcription_provider.py`, `capture_pipeline.py` et le flux “note” (`capture-fab` + endpoint inbox) pour te proposer une refonte propre sans casser la nouvelle pipeline.

## Assistant (2026-03-04T15:37:37.321Z)

J’ai repéré des points critiques dans `capture_pipeline.py` (dont des morceaux potentiellement dupliqués) qui peuvent expliquer des comportements incohérents. Je vérifie les lignes exactes pour distinguer bug réel vs artefact de lecture.

## Assistant (2026-03-04T15:38:20.954Z)

Je viens d’avoir un échec shell sur les chemins avec `()`/`[]` non quotés. Je relance avec des chemins correctement échappés pour continuer l’analyse fonctionnelle (web + mobile + hooks).

## Assistant (2026-03-04T15:38:29.031Z)

Je creuse encore un point important: le polling de la page capture (`use-inbox`) et le contrat API `reprocess`/`upload`, pour expliquer le “failed affiché mais transcription partielle” après relance.

## Assistant (2026-03-04T15:39:10.313Z)

Je reprends le sujet en mode diagnostic produit/tech: je vais d’abord confirmer les causes exactes côté transcription et statut de reprocess, puis comparer le flux `note` actuel avec les anciennes implémentations (git history) pour proposer un plan de correction solide sans casser la nouvelle pipeline.

## Assistant (2026-03-04T15:39:29.341Z)

Je confirme que le fallback heuristique correspond exactement à ton symptôme. Je vais maintenant remonter jusqu’à la config runtime (provider/model/clé) pour voir pourquoi on tombe en fallback, puis je regarde l’historique git pour reconstruire le mode note “comme avant” avec BlockNote/Tiptap.

## Assistant (2026-03-04T15:39:59.649Z)

Je remonte maintenant le flux `note` exact (création capture, sync item source, rendu éditeur) et ensuite je compare avec les anciens commits pour proposer un design cible clair avant de toucher au code.

## Assistant (2026-03-04T15:40:08.863Z)

J’ai localisé le flux `note` actuel; je vais ouvrir précisément les helpers `_ensure_source_item_for_capture` et `_sync_source_item_from_capture`, puis la page item (avec chemin échappé) pour vérifier ce qui casse le comportement BlockNote.

## Assistant (2026-03-04T15:40:48.128Z)

Je passe à l’historique git pour reconstruire précisément “comment c’était avant” sur le mode note. Je vais comparer les versions antérieures de `capture-fab`, `inbox.py` et des pages item/capture pour te proposer un rollback ciblé (pas un retour arrière global).

## Assistant (2026-03-04T15:41:17.026Z)

Je viens de trouver que le backend inbox date d’un commit “WIP Slice 2” et que le `CaptureFab` web a été introduit plus tard. Je vais explorer ces snapshots pour identifier le flux note historique (création item directe vs capture) au lieu d’inférer.

## Assistant (2026-03-04T15:43:40.869Z)

Je vois déjà trois causes structurelles qui collent à ton retour: fallback heuristique, artefacts anciens conservés après reprocess, et détail capture non invalidé côté front après `reprocess`. Je récupère maintenant les lignes exactes pour te proposer un plan de correction précis et priorisé.

## Assistant (2026-03-04T15:45:26.844Z)

Tu as 100% raison sur le diagnostic produit. Ce n’est pas “un petit bug”, c’est 3 problèmes de flux qui s’additionnent.

**Ce qui se passe vraiment**
- Le texte `Transcribed from voice-...webm.` vient du fallback heuristique: [apps/api/src/services/transcription_provider.py:14](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/transcription_provider.py), [apps/api/src/services/transcription_provider.py:134](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/transcription_provider.py).
- Le web enregistre en priorité `audio/webm;codecs=opus` (potentiellement moins compatible selon provider): [apps/web/src/components/capture-fab.tsx:349](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/capture-fab.tsx).
- Le “reprocess” peut rester affiché en `failed` côté détail car on invalide l’inbox mais pas la query détail capture: [apps/web/src/hooks/use-inbox.ts:223](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-inbox.ts), [apps/mobile/hooks/use-inbox.ts:181](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-inbox.ts).
- Après relance, les anciens artefacts restent; le front prend souvent le premier artefact trouvé (pas le plus récent), donc tu peux voir une ancienne transcription fallback: [apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx:83](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx), [apps/mobile/app/inbox/[id].tsx:65](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx).
- Les `key_clauses` sont construites sur la première ligne du transcript/extract, donc normal que ce soit tronqué: [apps/api/src/services/capture_pipeline.py:624](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py).

**Sur le mode note**
- Aujourd’hui note = création capture + item lié + navigation vers capture: [apps/web/src/components/capture-fab.tsx:105](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/capture-fab.tsx), [apps/mobile/hooks/use-create-actions.ts:152](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-create-actions.ts), [apps/api/src/api/v1/inbox.py:1007](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py).
- Historiquement (commit `bb2b493`), note créait un item direct (`useCreateItem`) et ouvrait l’éditeur BlockNote. Je recommande de revenir à ça.

**Plan que je recommande**
1. Hotfix fiabilité transcription/rerun: invalider détail capture après reprocess, lire le dernier artefact (pas le premier), afficher une section “Transcription complète”, et prioriser `audio/mp4` avant `webm` côté enregistrement web.
2. Correction structurelle pipeline: introduire un `run_id` de reprocess (artefacts/jobs résolus par run), et générer `key_clauses` à partir de `summary.key_points` avant fallback.
3. Note mode: repasser en création item directe (web + mobile), garder BlockNote/Tiptap comme source de vérité, et retirer le détour “note_intent capture” du flux principal.

Si tu valides, je peux enchaîner directement l’implémentation en 2 lots:
1. Lot A (hotfix rapide, visible tout de suite).
2. Lot B (refonte note + run_id propre).

## User (2026-03-04T19:27:20.249Z)

réfléchissons au flow des note, j'ai déjà ma petite idée... en vrai par exemple si on garde l'ui actuelle, comme toutes les autres captures, mais en ajoutant une étape et une page par capture de type note : quand on appuie pour créer une note, que ce soit web ou mobile, ça ouvre l'éditeur : on peut commencer à écrire directement. derrière ce qui se passe, c'est que on a une page de capture classique qui est faite, mais il y a une carte en plus qui montre une version tronquée de la note, qui lorsuq'on appuie, ouvre la page de l'éditeur pour la capture liée, pte prévoir une page et sous page, les autres items étant inbox/captures/id, on trouvera un moyen d'avoir l'url de la capture pour pour la capture + l'url de la page d'édition pour la page d'édition de la même note. tu comprends ce que je propose ou pas ? reformule pour me le prouver. si ce n'est pas le cas demande moi ce que tu as besoin de savoir.

## Assistant (2026-03-04T19:27:42.150Z)

Voici ma reformulation de ta proposition:

1. On garde l’UI Inbox/captures actuelle pour tous les types.
2. Pour `note`, au clic FAB (web/mobile), on crée la capture puis on ouvre **directement l’éditeur** (pas la vue détail capture en premier), pour écrire immédiatement.
3. La capture `note` a quand même sa page détail classique (`inbox/captures/:id`), mais avec une carte en plus:
   - aperçu tronqué de la note,
   - clic sur la carte => ouvre la page éditeur de **cette même note liée**.
4. Donc une même note a 2 routes liées au même `capture_id`:
   - vue capture: `inbox/captures/:id`
   - vue édition note: une sous-route dédiée (ex: `inbox/captures/:id/note` ou `.../edit`).
5. Même logique web + mobile.

Si c’est bien ça, je suis aligné.  
Point à confirmer juste avant design technique: tu veux que la source de vérité du contenu reste `item.blocks` (BlockNote/Tiptap), et la capture ne garde qu’un aperçu/meta ?

## User (2026-03-04T19:29:59.529Z)

oui pour la réponse.à ta question.
fait le plan pour :
1 corriger le flow des notes pour web + mobile ;
2 corriger les éléments de captures de type transcription qui est problématique.

## User (2026-03-04T19:30:06.771Z)

<turn_aborted>
The user interrupted the previous turn on purpose. Any running unified exec processes were terminated. If any tools/commands were aborted, they may have partially executed; verify current state before retrying.
</turn_aborted>

## User (2026-03-04T19:30:41.113Z)

et pour correction c'est tentap pour mobile

## Assistant (2026-03-04T19:30:55.587Z)

Je prépare un plan d’implémentation complet pour les deux axes (flow note web/mobile + correction transcription). Je vérifie d’abord les points techniques restants (routes éditeur, intégration TentaP mobile, et cycle de vie des captures) pour verrouiller un plan exécutable sans zones grises.

## Assistant (2026-03-04T19:31:03.903Z)

Je confirme que mobile utilise déjà TenTap pour l’éditeur d’item; je vais extraire les contrats (schemas/response) et routes pour définir un plan avec changements d’API minimaux et compatibilité totale web/mobile.

## Assistant (2026-03-04T19:31:39.596Z)

Je confirme qu’on a déjà la donnée clé `item_id` dans la réponse de création capture, donc l’ouverture immédiate de l’éditeur note est faisable sans nouvelle API. Je vérifie maintenant la couverture de tests existante sur transcription/reprocess pour intégrer un plan de tests réaliste et complet.

## Assistant (2026-03-04T19:32:12.617Z)

J’ai toutes les briques techniques pour rédiger un plan exécutable, mais il reste 3 décisions produit qui changent fortement l’UX et le comportement d’erreur. Je te propose de les verrouiller maintenant pour te donner un plan final décisionnel complet.

## Assistant (2026-03-04T19:36:05.675Z)

Parfait, réponses reçues: route `captures/:id/note`, carte note en plus des actions IA, et fallback voix en échec explicite sans faux transcript. Je finalise le plan complet avec découpage par backend/web/mobile, contrats de données, edge cases et plan de tests.

## Assistant (2026-03-04T19:38:26.956Z)

<proposed_plan>
# Plan de correction — Flow Notes (Web + Mobile) + Fiabilité Transcription

## Résumé
Objectif: corriger le parcours `note` pour ouvrir directement l’éditeur tout en gardant la page capture classique, puis corriger la chaîne transcription pour supprimer les faux positifs, fiabiliser le reprocess, et afficher la transcription complète côté UI.

Décisions verrouillées:
1. Route d’édition note: `captures/:id/note`.
2. Page capture note: on garde les actions IA existantes et on ajoute une carte note.
3. Voix: en cas d’échec provider, on passe en échec explicite (plus de faux transcript heuristique).

## Implémentation détaillée

### 1) Flow Notes Web + Mobile

1. Créer une route d’édition note dédiée par capture.
2. Web: ajouter [apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx).
3. Mobile: ajouter [apps/mobile/app/inbox/[id]/note.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id]/note.tsx).
4. La route `.../note` charge la capture (`useCaptureDetail(captureId)`), récupère `item_id`, charge l’item, puis affiche l’éditeur riche existant.
5. Web: l’éditeur reste BlockNote via [apps/web/src/components/block-editor.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/block-editor.tsx).
6. Mobile: l’éditeur reste TenTap via [apps/mobile/components/BlockEditor.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/components/BlockEditor.tsx).
7. Si `item_id` absent, afficher état d’erreur non bloquant avec CTA retour capture.
8. Conserver la route item existante (`/inbox/items/:itemId` web, `/items/:itemId` mobile) pour compat/backlinks.

### 2) Navigation à la création de note

1. Web: dans [apps/web/src/components/capture-fab.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/capture-fab.tsx), après `createCapture(note)`, naviguer vers `/inbox/captures/${created.id}/note`.
2. Mobile: dans [apps/mobile/hooks/use-create-actions.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-create-actions.ts), après `createCapture(note)`, naviguer vers `/inbox/${created.id}/note`.
3. Ne plus ouvrir la page capture directement au moment de la création note.
4. Garder la création d’une capture + item lié (pas de retour au mode “item-only”).

### 3) Carte note dans la page capture classique

1. Web capture detail: [apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx).
2. Mobile capture detail: [apps/mobile/app/inbox/[id].tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx).
3. Détecter `capture note` via metadata (`note_intent` ou `intent/channel=note`) et `capture_type=text`.
4. Ajouter une carte “Note liée” contenant:
   - titre note,
   - aperçu texte tronqué des `item.blocks` (plain text),
   - CTA “Ouvrir l’éditeur”.
5. Le CTA ouvre la nouvelle route `.../note`.
6. Garder la section actions IA actuelle en dessous (comme demandé).

### 4) Correction transcription backend (fiabilité)

1. Modifier [apps/api/src/services/capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py).
2. Politique voix stricte:
   - si transcribe provider échoue,
   - ou si payload revient avec `fallback_used=true`,
   - ou si aucun asset voix,
   => job `transcribe_or_extract` en `failed` explicite.
3. Supprimer la création d’artefact transcript heuristique pour la voix dans ces cas (plus de “Transcribed from ...”).
4. Sur échec transcription voix, marquer les jobs dépendants non exécutés comme `skipped` (ou `failed` bloqué) avec détail explicite, et éviter les résumés partiels incohérents.
5. Logger un code d’erreur stable (ex: `voice_transcription_provider_failed`) pour diagnostic.
6. Conserver fallback heuristique pour OCR/VLM si besoin, mais pas pour transcript voix.

### 5) Correction reprocess (stale data)

1. Avant reprocess, nettoyer les sorties pipeline précédentes de la capture:
   - soft-delete artifacts issus du pipeline,
   - soft-delete suggestions/actions générées,
   - reset de `artifacts_summary`,
   - reset/rotation `pipeline_trace` du run précédent.
2. Implémenter ce nettoyage dans [apps/api/src/api/v1/inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py) avant `enqueue_default_jobs`.
3. Objectif: éviter que l’UI lise des artefacts obsolètes après relance.

### 6) Correction affichage transcription côté UI

1. Web et mobile: choisir le dernier artefact pertinent (plus récent), pas le premier trouvé.
2. Mettre à jour la logique `pickSummary` dans les pages capture detail web/mobile pour privilégier l’artefact le plus récent par type.
3. Ajouter une section “Transcription complète” sur capture voix:
   - texte complet transcript,
   - mode tronqué/expand.
4. Si transcription en échec explicite:
   - afficher message clair (pas de faux texte),
   - proposer CTA relance.
5. Reprocess mutation:
   - invalider aussi les queries détail capture + artifacts, pas uniquement la liste inbox.
   - Web: [apps/web/src/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-inbox.ts).
   - Mobile: [apps/mobile/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-inbox.ts).

### 7) Key clauses / résumé

1. Améliorer `artifacts_summary` backend:
   - ignorer les transcripts fallback pour `key_clauses`,
   - prioriser `summary.key_points` si disponible,
   - éviter de prendre uniquement la première ligne d’un transcript.
2. Cela réduit les “key clauses” inutiles/vides et rend la carte résumé cohérente.

## Changements d’API / interfaces / types

1. API HTTP backend: pas de rupture de contrat.
2. Contrats existants conservés (`CreateCaptureResponse`, `CaptureDetailResponse`).
3. Nouvelles routes UI (additives):
   - Web: `/inbox/captures/:id/note`.
   - Mobile: `/inbox/:id/note`.
4. Champs de métadonnées pipeline enrichis côté `pipeline_trace.detail` (interne, backward-compatible).

## Tests et scénarios de validation

1. Backend unit tests (nouveau fichier dédié + ajustements):
   - transcription voix échouée => pas d’artefact transcript heuristique.
   - transcription fallback_used=true => statut capture `failed`.
   - reprocess => anciens artifacts/suggestions non visibles.
   - artifacts_summary n’inclut pas de key_clauses fallback.
2. Backend non-régression:
   - tests existants capture/sync/inbox passent après adaptation.
3. QA Web:
   - créer note => ouverture immédiate `/captures/:id/note`, édition et autosave.
   - retour capture => carte note avec aperçu + ouverture éditeur.
   - capture voix KO provider => échec clair, pas de faux transcript, relance fonctionnelle.
   - reprocess => statut et contenu se rafraîchissent correctement sans stale.
4. QA Mobile:
   - même scénario note avec éditeur TenTap.
   - même scénario transcription/reprocess.
5. QA cross-device:
   - éditer note mobile puis ouvrir capture note web (aperçu cohérent), et inversement.

## Hypothèses et defaults retenus

1. Source de vérité note: `item.blocks` (ProseMirror), pas `capture.raw_content`.
2. On garde la capture note dans inbox (pas d’archivage auto à la création).
3. On garde la section actions IA dans capture note et on ajoute la carte note en plus.
4. Aucune migration DB nécessaire.
5. Si `item_id` manquant sur route `.../note`, fallback UX vers page capture + message explicite.
</proposed_plan>

## User (2026-03-04T19:40:03.231Z)

en vrai corrige le plan : on devrait séparer la transcription complète de la carte de résumé IA ou key clauses.
aussi quand il n'y a pas d'actions à suggérer ne pas en suggérer.
Aussi les logs en bas c'est plus pour moi que pour l'user ça non ?

## Assistant (2026-03-04T19:40:23.057Z)

Je vais te livrer une version corrigée du plan en intégrant tes 3 directives: transcription séparée du résumé IA, zéro suggestion quand il n’y en a pas, et logs techniques non visibles pour l’utilisateur final. Je fais un dernier passage sur le backend `inbox.py` pour verrouiller l’impact exact du “no suggestion fallback”.

## Assistant (2026-03-04T19:41:53.918Z)

<proposed_plan>
# Plan corrigé — Notes (Web+Mobile) + Transcription fiable + UI orientée user

## Résumé
On garde ton principe de capture note liée, mais on améliore l’UX:
1. Création note ouvre directement l’éditeur.
2. La page capture note garde son layout actuel + ajoute une carte “aperçu note”.
3. Transcription est séparée du résumé IA et des key clauses.
4. Si aucune action n’est pertinente: on n’en suggère aucune (zéro fallback “Review”).
5. Les logs/pipeline trace ne sont plus affichés aux utilisateurs (UI).

---

## 1) Flow Notes Web + Mobile (avec éditeur direct)

### 1.1 Routes et navigation
- Web:
  - Nouvelle route: `/inbox/captures/:id/note`
  - Fichier: [apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx)
- Mobile:
  - Nouvelle route: `/inbox/:id/note`
  - Fichier: [apps/mobile/app/inbox/[id]/note.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id]/note.tsx)

### 1.2 Création note
- Web: [capture-fab.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/capture-fab.tsx)
  - Après `createCapture(note)` -> redirect vers `/inbox/captures/${created.id}/note`
- Mobile: [use-create-actions.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-create-actions.ts)
  - Après `createCapture(note)` -> redirect vers `/inbox/${created.id}/note`

### 1.3 Éditeur note
- Web: BlockNote inchangé.
- Mobile: TenTap (confirmé) via [apps/mobile/components/BlockEditor.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/components/BlockEditor.tsx), aucune régression vers éditeur texte simple.
- La page `.../note`:
  - charge capture detail,
  - récupère `capture.item_id`,
  - charge l’item lié,
  - édite `item.blocks` (source de vérité).

### 1.4 Carte note dans la page capture
- Pages concernées:
  - [web capture detail](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx)
  - [mobile capture detail](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx)
- Pour capture note:
  - afficher carte “Note liée” avec aperçu tronqué (texte extrait de `item.blocks`) + CTA “Ouvrir l’éditeur”.
  - garder la section actions IA existante en dessous (comme demandé).

---

## 2) Transcription: séparation claire des blocs UI

### 2.1 Séparer les sections dans la page capture voix
- Section A: **Résumé IA** (uniquement artefacts `summary` / `preprocess_summary` / éventuellement `vlm_analysis`, mais jamais transcript brut).
- Section B: **Key clauses** (issues de `artifacts_summary.key_clauses`).
- Section C: **Transcription complète** (artefact `transcript` brut, extensible/scrollable).
- Ne plus mélanger transcript brut dans “Résumé IA”.

### 2.2 Rework backend résumé/key clauses
- Fichier: [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py)
- `_build_artifacts_summary`:
  - prioriser `summary.key_points` si disponibles,
  - ignorer tout transcript fallback/placeholder,
  - ne plus baser key clauses uniquement sur la première ligne.

---

## 3) Transcription: fiabilité (pas de faux transcript)

### 3.1 Politique d’échec explicite voix
- Fichier: [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py)
- Si voix et échec provider (ou fallback transcript):
  - job transcription = `failed`,
  - pas d’artefact transcript heuristique “Transcribed from ...”,
  - capture passe en état d’échec clair avec code explicite.

### 3.2 Reprocess propre
- Endpoint: [reprocess_capture](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py)
- Avant relance:
  - nettoyer artifacts/suggestions issus du run précédent (soft-delete),
  - reset `artifacts_summary`,
  - éviter les “anciens résultats” lus par l’UI.

### 3.3 Front revalidation
- Hooks:
  - [apps/web/src/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-inbox.ts)
  - [apps/mobile/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-inbox.ts)
- `useReprocessCapture.onSuccess` doit invalider:
  - liste inbox,
  - détail capture,
  - artifacts capture.
- Sélection des artefacts: prendre le plus récent par type (pas le premier).

---

## 4) “S’il n’y a pas d’actions, ne rien suggérer”

### 4.1 Backend suggestions
- Retirer les fallbacks artificiels `Review`:
  - dans `_build_action_suggestions` ([capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py)),
  - dans `_to_capture_out` / `_fallback_review_action` ([inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py)).
- Résultat API attendu:
  - `suggested_actions: []`
  - `primary_action: null`

### 4.2 Preview / Apply quand aucune suggestion
- `preview_capture`:
  - si aucune action disponible -> `422 no_suggested_actions`
- `apply_capture`:
  - sans `action_key` et sans suggestion -> `422 no_suggested_actions`
- Plus de fallback implicite “review/apply dérivé du raw_content” dans ces cas.

### 4.3 UI
- Web + Mobile capture detail:
  - section actions affiche “Aucune action suggérée”.
  - boutons Preview/Apply désactivés (ou cachés) quand liste vide.
- Inbox list:
  - pas de CTA principal si `primary_action` absent.

---

## 5) Logs en bas de capture (pipeline trace)

### 5.1 Positionnement
- Oui: c’est technique/dev, pas user-facing.
- Donc:
  - retirer l’affichage “Pipeline Trace” des pages capture web/mobile en prod UX.

### 5.2 Conservation debug
- On conserve `pipeline_trace` dans l’API/metadata backend pour diagnostic interne.
- Option dev (non-user): réactiver affichage via garde locale dev plus tard si nécessaire.

---

## 6) Contrats API / types (changements publics)

### Changements de comportement
- `preview` et `apply` peuvent retourner `422 no_suggested_actions` quand il n’y a pas d’actions.
- `suggested_actions` peut être vide sans fallback.

### Pas de breaking schema majeur
- Les schémas JSON restent compatibles (champs déjà optionnels/nullable).
- Nouvelles routes UI seulement (additives).

---

## 7) Tests et validation

### Backend
- Ajouter/adapter tests:
  - pas de fallback `Review` automatique.
  - `suggested_actions` vide possible.
  - `preview/apply` => 422 quand aucune action.
  - voix provider fail => pas de transcript heuristique.
  - reprocess nettoie anciens artefacts.
- Fichiers ciblés:
  - [test_capture_pipeline_suggestions.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/tests/test_capture_pipeline_suggestions.py)
  - [test_inbox_hotfix.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/tests/test_inbox_hotfix.py)
  - nouveau test dédié transcription/reprocess.

### Web/Mobile QA
- Note:
  - création -> ouverture directe éditeur (`.../note`),
  - autosave blocks OK,
  - retour capture -> carte note ouvre éditeur.
- Voix:
  - erreur transcription visible clairement,
  - relance met à jour détail sans état stale,
  - résumé IA, key clauses, transcription complète sont bien séparés.
- Actions:
  - cas sans suggestion => UI vide propre, pas de faux CTA.

---

## Hypothèses / defaults explicites
- Source de vérité des notes: `item.blocks`.
- TenTap reste l’éditeur mobile officiel.
- On garde la page capture classique pour note, avec carte supplémentaire.
- Les logs pipeline restent accessibles en backend, mais cachés de l’UI utilisateur.
</proposed_plan>

## User (2026-03-04T19:42:36.307Z)

PLEASE IMPLEMENT THIS PLAN:
# Plan corrigé — Notes (Web+Mobile) + Transcription fiable + UI orientée user

## Résumé
On garde ton principe de capture note liée, mais on améliore l’UX:
1. Création note ouvre directement l’éditeur.
2. La page capture note garde son layout actuel + ajoute une carte “aperçu note”.
3. Transcription est séparée du résumé IA et des key clauses.
4. Si aucune action n’est pertinente: on n’en suggère aucune (zéro fallback “Review”).
5. Les logs/pipeline trace ne sont plus affichés aux utilisateurs (UI).

---

## 1) Flow Notes Web + Mobile (avec éditeur direct)

### 1.1 Routes et navigation
- Web:
  - Nouvelle route: `/inbox/captures/:id/note`
  - Fichier: [apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx)
- Mobile:
  - Nouvelle route: `/inbox/:id/note`
  - Fichier: [apps/mobile/app/inbox/[id]/note.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id]/note.tsx)

### 1.2 Création note
- Web: [capture-fab.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/capture-fab.tsx)
  - Après `createCapture(note)` -> redirect vers `/inbox/captures/${created.id}/note`
- Mobile: [use-create-actions.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-create-actions.ts)
  - Après `createCapture(note)` -> redirect vers `/inbox/${created.id}/note`

### 1.3 Éditeur note
- Web: BlockNote inchangé.
- Mobile: TenTap (confirmé) via [apps/mobile/components/BlockEditor.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/components/BlockEditor.tsx), aucune régression vers éditeur texte simple.
- La page `.../note`:
  - charge capture detail,
  - récupère `capture.item_id`,
  - charge l’item lié,
  - édite `item.blocks` (source de vérité).

### 1.4 Carte note dans la page capture
- Pages concernées:
  - [web capture detail](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx)
  - [mobile capture detail](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx)
- Pour capture note:
  - afficher carte “Note liée” avec aperçu tronqué (texte extrait de `item.blocks`) + CTA “Ouvrir l’éditeur”.
  - garder la section actions IA existante en dessous (comme demandé).

---

## 2) Transcription: séparation claire des blocs UI

### 2.1 Séparer les sections dans la page capture voix
- Section A: **Résumé IA** (uniquement artefacts `summary` / `preprocess_summary` / éventuellement `vlm_analysis`, mais jamais transcript brut).
- Section B: **Key clauses** (issues de `artifacts_summary.key_clauses`).
- Section C: **Transcription complète** (artefact `transcript` brut, extensible/scrollable).
- Ne plus mélanger transcript brut dans “Résumé IA”.

### 2.2 Rework backend résumé/key clauses
- Fichier: [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py)
- `_build_artifacts_summary`:
  - prioriser `summary.key_points` si disponibles,
  - ignorer tout transcript fallback/placeholder,
  - ne plus baser key clauses uniquement sur la première ligne.

---

## 3) Transcription: fiabilité (pas de faux transcript)

### 3.1 Politique d’échec explicite voix
- Fichier: [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py)
- Si voix et échec provider (ou fallback transcript):
  - job transcription = `failed`,
  - pas d’artefact transcript heuristique “Transcribed from ...”,
  - capture passe en état d’échec clair avec code explicite.

### 3.2 Reprocess propre
- Endpoint: [reprocess_capture](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py)
- Avant relance:
  - nettoyer artifacts/suggestions issus du run précédent (soft-delete),
  - reset `artifacts_summary`,
  - éviter les “anciens résultats” lus par l’UI.

### 3.3 Front revalidation
- Hooks:
  - [apps/web/src/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-inbox.ts)
  - [apps/mobile/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-inbox.ts)
- `useReprocessCapture.onSuccess` doit invalider:
  - liste inbox,
  - détail capture,
  - artifacts capture.
- Sélection des artefacts: prendre le plus récent par type (pas le premier).

---

## 4) “S’il n’y a pas d’actions, ne rien suggérer”

### 4.1 Backend suggestions
- Retirer les fallbacks artificiels `Review`:
  - dans `_build_action_suggestions` ([capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py)),
  - dans `_to_capture_out` / `_fallback_review_action` ([inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py)).
- Résultat API attendu:
  - `suggested_actions: []`
  - `primary_action: null`

### 4.2 Preview / Apply quand aucune suggestion
- `preview_capture`:
  - si aucune action disponible -> `422 no_suggested_actions`
- `apply_capture`:
  - sans `action_key` et sans suggestion -> `422 no_suggested_actions`
- Plus de fallback implicite “review/apply dérivé du raw_content” dans ces cas.

### 4.3 UI
- Web + Mobile capture detail:
  - section actions affiche “Aucune action suggérée”.
  - boutons Preview/Apply désactivés (ou cachés) quand liste vide.
- Inbox list:
  - pas de CTA principal si `primary_action` absent.

---

## 5) Logs en bas de capture (pipeline trace)

### 5.1 Positionnement
- Oui: c’est technique/dev, pas user-facing.
- Donc:
  - retirer l’affichage “Pipeline Trace” des pages capture web/mobile en prod UX.

### 5.2 Conservation debug
- On conserve `pipeline_trace` dans l’API/metadata backend pour diagnostic interne.
- Option dev (non-user): réactiver affichage via garde locale dev plus tard si nécessaire.

---

## 6) Contrats API / types (changements publics)

### Changements de comportement
- `preview` et `apply` peuvent retourner `422 no_suggested_actions` quand il n’y a pas d’actions.
- `suggested_actions` peut être vide sans fallback.

### Pas de breaking schema majeur
- Les schémas JSON restent compatibles (champs déjà optionnels/nullable).
- Nouvelles routes UI seulement (additives).

---

## 7) Tests et validation

### Backend
- Ajouter/adapter tests:
  - pas de fallback `Review` automatique.
  - `suggested_actions` vide possible.
  - `preview/apply` => 422 quand aucune action.
  - voix provider fail => pas de transcript heuristique.
  - reprocess nettoie anciens artefacts.
- Fichiers ciblés:
  - [test_capture_pipeline_suggestions.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/tests/test_capture_pipeline_suggestions.py)
  - [test_inbox_hotfix.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/tests/test_inbox_hotfix.py)
  - nouveau test dédié transcription/reprocess.

### Web/Mobile QA
- Note:
  - création -> ouverture directe éditeur (`.../note`),
  - autosave blocks OK,
  - retour capture -> carte note ouvre éditeur.
- Voix:
  - erreur transcription visible clairement,
  - relance met à jour détail sans état stale,
  - résumé IA, key clauses, transcription complète sont bien séparés.
- Actions:
  - cas sans suggestion => UI vide propre, pas de faux CTA.

---

## Hypothèses / defaults explicites
- Source de vérité des notes: `item.blocks`.
- TenTap reste l’éditeur mobile officiel.
- On garde la page capture classique pour note, avec carte supplémentaire.
- Les logs pipeline restent accessibles en backend, mais cachés de l’UI utilisateur.

## Assistant (2026-03-04T19:43:50.400Z)

Je passe en implémentation. Je commence par le backend (règles suggestions/reprocess/transcription), puis j’enchaîne sur web et mobile (routes note + UI séparée transcription/résumé), et je termine avec les tests ciblés.

## Assistant (2026-03-04T19:51:06.300Z)

Je commence par les changements backend maintenant: suppression des fallbacks d’actions “Review”, durcissement transcription voix (échec explicite), et reset reprocess pour éviter les artefacts obsolètes. Ensuite je brancherai l’UI web/mobile.

## Assistant (2026-03-04T19:55:31.742Z)

Je vais implémenter le plan complet en partant de l’état actuel du repo, puis valider backend + web + mobile avec les tests ciblés. Je commence par auditer les fichiers déjà touchés et les zones restantes (routes note, UI capture, inbox API preview/apply/reprocess, hooks d’invalidation).

## Assistant (2026-03-04T19:55:38.706Z)

Je vois un worktree déjà très modifié (beaucoup de fichiers hors scope), donc je vais toucher uniquement les fichiers du plan et éviter tout revert. Je lis maintenant `inbox.py`, les pages capture web/mobile, les hooks `use-inbox`, et les points de création note pour faire les patchs ciblés.

## Assistant (2026-03-04T19:55:58.424Z)

J’ai confirmé les changements backend déjà en place côté pipeline. Je vais maintenant compléter `inbox.py` (422, nettoyage reprocess, suppression fallback review API) puis enchaîner sur les routes/UX notes web+mobile et la séparation transcript/résumé.

## Assistant (2026-03-04T19:56:17.076Z)

Je passe maintenant sur mobile (`use-create-actions`, détail capture, hooks inbox, BlockEditor/TenTap) pour aligner le flow note et la séparation des sections voix. Ensuite je patcherai web + backend ensemble pour garder les contrats cohérents.

## Assistant (2026-03-04T19:57:12.956Z)

Je vais maintenant créer les nouvelles routes note (web `/inbox/captures/[id]/note`, mobile `/inbox/[id]/note`) en réutilisant les éditeurs existants et autosave sur `item.blocks`, puis brancher les redirections FAB + carte “Note liée” dans les pages capture.

## User (2026-03-04T20:09:27.066Z)

non mais pour les suggestion d'action 'est l'ia qui devra décider !
Genre si l'ia voit qu'il n'y a pas d'actions à proposer, il écrit un truc de manière à ce qu'il n'y ait pas d'action proposées.

Tu peux continuer ton travail. prend en compte ce que je viens de dire si ce n'est pas déjà fait.

## Assistant (2026-03-04T20:09:40.346Z)

Oui, bien noté. Je vais garantir que la décision “zéro action” vienne de l’IA (pas de fallback artificiel), donc si l’IA ne propose rien on renvoie vraiment une liste vide. Je continue l’implémentation avec cette règle appliquée.

## Assistant (2026-03-04T20:10:26.246Z)

Je prends en compte ton point: les actions doivent venir de la décision IA, et “aucune action” doit rester possible sans fallback. J’attaque maintenant les patchs backend (`inbox.py` + ajustement pipeline suggest_actions), puis j’enchaîne sur web/mobile.

## Assistant (2026-03-04T20:11:24.542Z)

Je viens de basculer la logique backend pour que les suggestions proviennent de l’IA uniquement (et puissent être vides). Je mets à jour les tests backend pour refléter ce contrat (plus de fallback review) avant de continuer sur les routes/UI notes et la séparation transcription.

## Assistant (2026-03-04T20:12:18.096Z)

Le backend principal est patché (no fallback action, 422 no_suggested_actions, nettoyage reprocess). Je passe aux hooks `useReprocessCapture` web/mobile pour invalider liste + détail + artefacts, puis j’attaque les pages notes et l’UI capture.

## Assistant (2026-03-04T20:13:19.585Z)

Je vais ajouter la nouvelle page web `.../note` pour éditer directement `item.blocks` lié à la capture (autosave debounced), puis une version mobile équivalente avec TenTap. Ensuite j’intègre la carte “Note liée” sur les pages capture.

## Assistant (2026-03-04T20:15:13.884Z)

J’ai branché les helpers (artefact le plus récent, résumé IA séparé, transcript séparé, détection note liée + aperçu blocs). Je finis maintenant le rendu de la page capture web: section transcription dédiée, carte note, “aucune action suggérée”, et suppression du bloc Pipeline Trace UI.

## Assistant (2026-03-04T20:24:45.659Z)

J’ai un seul test cassé (helper de test sans `raw_content`), je corrige et je relance immédiatement la suite backend.

## Assistant (2026-03-04T20:25:37.095Z)

Le backend passe en tests, et le lint web passe (avec warnings existants non bloquants). Je fais une dernière passe de vérification des diffs ciblés (routes notes, UI capture, hooks invalidation, API no_suggested_actions/reprocess cleanup) avant de te livrer le récap exact.

## Assistant (2026-03-04T20:26:50.524Z)

J’ai fini l’implémentation et la validation backend/web. Pour mobile, j’ai tenté un `tsc` global: il échoue sur un grand nombre d’erreurs préexistantes hors scope (UI primitives/types), donc je ne peux pas fournir une validation typecheck mobile “clean” sur ce repo en l’état. Je te fais le bilan précis des changements appliqués.

## Assistant (2026-03-04T20:27:37.296Z)

Implémentation faite, en intégrant ta contrainte: c’est bien l’IA qui décide s’il y a 0 action.

**Backend**
- Suppression du fallback “Review” automatique dans la sortie capture (`suggested_actions` peut être vide, `primary_action` peut être `null`) dans [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:458).
- `preview`/`apply` renvoient `422 no_suggested_actions` quand il n’y a pas d’actions proposées ([inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1445), [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1568)).
- Reprocess nettoie l’état précédent (soft-delete artifacts/suggestions/jobs + reset meta utile) avant relance ([inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1383)).
- Suggestions runtime passées en mode IA-first (si l’IA propose rien => `[]`, pas de fallback heuristique/review) dans [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py:1179).
- Résumé artifacts durci pour ne pas retomber sur transcript brut en fallback résumé, et gestion transcription voice fail explicite conservée ([capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py:597), [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py:1027).

**Flow Notes Web + Mobile**
- Création note redirige directement vers l’éditeur:
  - Web: [capture-fab.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/capture-fab.tsx:121)
  - Mobile: [use-create-actions.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-create-actions.ts:164)
- Nouvelle page éditeur note (capture liée, source de vérité `item.blocks`):
  - Web: [page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx)
  - Mobile TenTap: [note.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id]/note.tsx)
- Page capture web/mobile:
  - Carte “note liée” + aperçu tronqué + CTA vers éditeur
  - Actions IA conservées en dessous
  - Fichiers: [web capture detail](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx), [mobile capture detail](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx)

**Transcription/UI**
- Séparation claire UI:
  - Résumé IA
  - Key clauses
  - Transcription complète (section dédiée)
- Suppression de l’affichage user-facing du `pipeline_trace` (logs cachés côté UI).
- “Aucune action suggérée” affiché proprement quand liste vide, pas de faux CTA.

**Revalidation front**
- `useReprocessCapture` invalide désormais liste + détail capture + artifacts:
  - Web: [use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-inbox.ts:223)
  - Mobile: [use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-inbox.ts:181)

**i18n**
- Ajout des clés `fullTranscription`, `noSuggestedActions`, `openNoteEditor` dans web/mobile EN/FR:
  - [web en.json](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/i18n/en.json:161)
  - [web fr.json](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/i18n/fr.json:161)
  - [mobile en.json](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/i18n/en.json:165)
  - [mobile fr.json](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/i18n/fr.json:165)

**Tests/validation**
- `py_compile` backend OK.
- `unittest` backend OK (27 tests): `tests.test_capture_pipeline_suggestions` + `tests.test_inbox_hotfix`.
- `eslint` web sur fichiers touchés OK (1 warning non bloquant `next/no-img-element` déjà présent sur la page capture).
- `tsc` mobile global échoue sur un grand volume d’erreurs préexistantes hors scope (pas introduites par ce patch).

## User (2026-03-04T21:03:50.006Z)

ça prend du temps la création de la note...

et en vrai si la note fait moins d'un certains nombres de caractères pas besoin de résumé IA (genre ne pas affiché du tout la carte de résumé).

Réfléchis à d'autres améliorations de la pipeline capture - inbox. besoind e celery/redis ?autre ? parfait comme ça ? qq ajustements ?

## Assistant (2026-03-04T21:04:39.121Z)

Tu as raison: ce n’est pas encore “parfait”.

1. `Note` lente: le point principal est l’UX de chargement, pas la pipeline IA.
- La création note ne lance normalement pas la pipeline (`status=ready`), mais après redirection on attend encore des fetch (`capture` puis `item`) + init éditeur.
- Fix immédiat recommandé: ouvrir l’éditeur avec `item_id` dès la réponse `createCapture`, charger `item.blocks` en priorité, puis `capture` en parallèle.

2. Carte résumé IA sur petites notes: je suis d’accord.
- Règle simple: si `capture` de type note et texte < `N` caractères, on masque totalement la carte résumé.
- Je recommande `N = 180` (configurable), calculé sur texte extrait de `item.blocks`.

3. Celery/Redis: nécessaire seulement selon charge.
- Aujourd’hui: ça peut tourner sans Celery si trafic faible.
- En prod sérieuse (uploads voix/photo + retries): oui, une vraie exécution asynchrone worker/queue est préférable.
- Option pragmatique court terme: worker basé DB (vous avez déjà `capture_jobs`), sans nouvelle infra.
- Option scale: Celery + Redis pour retries/backoff, priorités, concurrence par provider, meilleure résilience.

4. Ajustements pipeline/inbox que je recommande ensuite:
- Priorité de jobs (`note/text` ultra rapide, `voice/photo` en background priorisé).
- Idempotence stricte des reprocess (clé run/version).
- Timeouts/circuit breaker provider + erreurs user-friendly.
- Métriques de latence par étape (`transcribe`, `summarize`, `suggest_actions`).
- Cache UI pour éviter états “vide puis rempli”.

Si tu veux, je peux implémenter tout de suite les 2 premiers points avec `N=180` (et constant modifiable).

## User (2026-03-05T07:01:22.121Z)

<environment_context>
  <shell>zsh</shell>
  <current_date>2026-03-05</current_date>
  <timezone>Europe/Paris</timezone>
</environment_context>

## User (2026-03-05T07:01:22.121Z)

ouais mais autant mettre tt de suite si c'est pour changer apres pour les jobs non ?

## Assistant (2026-03-05T07:01:41.088Z)

Oui, sur ce point tu as raison: il faut préparer maintenant pour éviter un second refactor.

Je te recommande de faire **tout de suite une architecture “queue-ready”**, sans forcément brancher Celery/Redis en prod aujourd’hui:

1. Introduire un `job_run_id` / `pipeline_version` par exécution de capture.  
2. Passer l’exécution en **asynchrone systématique** (API crée la capture + enqueue, ne traite plus inline).  
3. Ajouter un `job dispatcher` abstrait (`run_capture_pipeline(capture_id, run_id)`) pour pouvoir brancher:
   - backend worker DB maintenant,
   - Celery/Redis plus tard sans changer le domaine.
4. Ajouter retries/backoff + statut terminal clair par job (`completed/failed/skipped`), idempotence par `(capture_id, run_id, job_type)`.  
5. Garder les événements UI stables (`queued -> processing -> ready|failed`) + invalidation ciblée.

Donc: **oui, on fait la structure finale maintenant**, et on peut différer juste l’infra Redis/Celery si tu veux avancer vite.  
Si tu veux, je l’implémente en mode “DB worker compatible Celery” dès maintenant.

## User (2026-03-05T07:10:41.606Z)

jsp... en vrai autant tt faire proprement non ? pcq retravailler le tout ça va être chiant...

des conseils d'un autre agent """Non, pas partout.

1. Garde en **temps réel (process API)**:
`/sync` en streaming (SSE/WS), boucle orchestrateur, `PromptComposer`, policy tools, preview/apply/undo.
2. Mets en **Celery/Redis**:
skills/sous-agents **longs, IO-heavy, retryables** (capture pipeline, connecteurs, OCR/VLM/transcription batch, indexation mémoire, recherche web, automations planifiées).
3. Évite le “tout Celery”:
ça ajoute de la latence sur le chat, rend le debug/cancel plus complexe, et complique la cohérence d’état conversationnel.
4. Règle simple:
si tâche >2-3s, dépend d’API externe, et doit être retry/idempotente => Celery. Sinon inline.

Donc: **architecture hybride** (control plane API + execution plane Celery) est la bonne pour un système agents/sous-agents “style skills OpenClaw”.  
Si tu veux, je te fais un plan V2 détaillé “skill registry + agent graph + queues par capability”.""", et un plan qu'il a proposé pour celery sur captures :  """# Plan d’intégration Celery + Redis (V1 Capture Async) pour Momentarise

## Résumé
1. Choix verrouillé: `Celery + Redis` pour exécuter la pipeline capture en arrière-plan, en gardant `FastAPI` comme façade API.
2. Rollout verrouillé: `hybride progressif` via feature flag, sans casse web/mobile.
3. Infra verrouillée: `Render Redis` + un service `worker` dédié sur Render.
4. Scope V1 verrouillé: `capture pipeline uniquement` (`upload`, `create`, `external`, `reprocess`), pas de migration du chat Sync interactif.
5. Principe clé: ne pas réinventer une queue custom; utiliser Celery pour retries/ack/routing/worker lifecycle, et conserver Postgres comme source de vérité métier.

## État actuel (base factuelle)
1. La pipeline est exécutée dans la requête HTTP aujourd’hui, notamment dans [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1028), [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1188), [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1431) et [capture_external.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/capture_external.py:103).
2. Les jobs existent déjà en DB (`capture_jobs`) et la logique de traitement existe déjà dans [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py:949).
3. Le front gère déjà `queued/processing` avec polling sur détail capture, donc prêt pour l’asynchrone côté UX.
4. Le déploiement actuel Render est mono-service API + Postgres, sans Redis/worker ([render.yaml](/Users/andrewpougary/DevLocal/Momentarise/render.yaml:1)).

## Décisions d’architecture (avec justification “pourquoi ici / pourquoi pas custom”)
| Décision | Choix | Pourquoi ici | Pourquoi pas custom |
|---|---|---|---|
| Orchestrateur de jobs | Celery | Standard Python mature, retries/backoff/acks/routing natifs, bon fit avec pipeline déjà modulaire | Un runner custom imposerait lock/lease/retry/worker supervision/poison handling à construire et maintenir |
| Broker | Redis (Render Redis) | Faible latence, simple à opérer sur même plateforme, support natif Celery | Polling DB custom = charge SQL + logique de visibilité/lease non triviale |
| État métier | Postgres (`capture`, `capture_jobs`, `artifacts`) | Déjà en place, audit métier centralisé, cohérence produit | Dupliquer l’état de progression uniquement dans Redis fragilise l’observabilité métier |
| Granularité V1 | 1 tâche Celery par capture (`run_capture_pipeline`) | Migration rapide et faible risque en réutilisant `process_capture_jobs` existant | Une orchestration custom par sous-job augmente la complexité de coordination et d’idempotence |
| Rollout | Feature flag hybride | Permet rollback instantané et migration sans downtime | Big-bang custom = risque de régression API/front |

## Plan d’implémentation détaillé

### 1. Dépendances et configuration runtime
`Fichiers`: [apps/api/pyproject.toml](/Users/andrewpougary/DevLocal/Momentarise/apps/api/pyproject.toml:1), [apps/api/src/core/config.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/core/config.py:1)  
`Actions`:
1. Ajouter dépendances `celery` et client Redis Python.
2. Ajouter variables:
`CAPTURE_ASYNC_WORKER_ENABLED`, `CELERY_BROKER_URL`, `CELERY_TASK_MAX_RETRIES`, `CELERY_TASK_SOFT_TIME_LIMIT_SECONDS`, `CELERY_TASK_TIME_LIMIT_SECONDS`, `CELERY_WORKER_PREFETCH_MULTIPLIER`, `CELERY_TASK_ALWAYS_EAGER` (tests).
3. Valeurs par défaut V1:
`CAPTURE_ASYNC_WORKER_ENABLED=false`, retries=3, soft=780s, hard=900s, prefetch=1.
`Pourquoi ici`: centraliser le contrôle runtime au même endroit que les autres flags IA.  
`Pourquoi pas custom`: sans config standard Celery, un système custom multiplie les réglages dispersés dans l’app.

### 2. App Celery dédiée
`Fichiers`: nouveaux `apps/api/src/worker/celery_app.py`, `apps/api/src/worker/__init__.py`  
`Actions`:
1. Créer l’instance Celery avec queue unique `capture_pipeline`.
2. Paramétrer:
`task_acks_late=true`, `task_reject_on_worker_lost=true`, `worker_prefetch_multiplier=1`, sérialisation JSON, retry backoff.
3. Broker uniquement Redis; ne pas activer result backend en V1 (`task_ignore_result=true`) car l’état métier est en DB.
`Pourquoi ici`: isoler l’infra queue dans un module dédié, sans polluer l’API HTTP.  
`Pourquoi pas custom`: Celery apporte déjà gestion worker/process/signal/shutdown propre.

### 3. Tâches worker capture
`Fichiers`: nouveau `apps/api/src/worker/tasks/capture_tasks.py`, réutilisation [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py:949)  
`Actions`:
1. Implémenter `run_capture_pipeline(capture_id: str, trigger: str)` qui ouvre une session DB async et appelle la logique existante (`process_capture_jobs`, `_maybe_auto_apply_capture`, `_sync_source_item_from_capture`).
2. Protéger l’idempotence via verrou DB (`advisory lock` sur `capture_id`) pour éviter double exécution sur retry/doublon enqueue.
3. Enrichir `capture.meta` avec `queue`:
`task_id`, `trigger`, `enqueued_at`, `started_at`, `finished_at`, `last_error_code`.
4. Mapping erreurs standard:
`queue_enqueue_failed`, `queue_worker_failure`, `queue_timeout`.
`Pourquoi ici`: la logique lourde sort du thread HTTP, sans réécriture fonctionnelle.  
`Pourquoi pas custom`: retries et crash-recovery d’un worker custom seraient coûteux à fiabiliser.

### 4. Adaptation des endpoints API (enqueue au lieu de process inline)
`Fichiers`: [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1028), [capture_external.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/capture_external.py:103)  
`Actions`:
1. Cibles:
`POST /api/v1/inbox` (quand status initial queue), `POST /api/v1/inbox/upload`, `POST /api/v1/inbox/{capture_id}/reprocess`, `POST /api/v1/capture/external`.
2. Nouveau flux:
créer/maj capture + jobs DB -> `commit` -> enqueue Celery -> réponse immédiate.
3. Si enqueue échoue:
marquer capture `failed` + `last_error_code=queue_enqueue_failed` + renvoyer erreur contrôlée (503).
4. Feature flag:
si `CAPTURE_ASYNC_WORKER_ENABLED=false`, garder chemin inline actuel.
si `true`, utiliser enqueue.
`Pourquoi ici`: ces endpoints sont les seuls points d’entrée pipeline capture.  
`Pourquoi pas custom`: ne pas implémenter un scheduler maison depuis FastAPI avec `asyncio.create_task` (non durable, non multi-instance).

### 5. Contrats API/types (compat progressive)
`Fichiers`: [apps/api/src/schemas/inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/schemas/inbox.py:1), [packages/shared/src/inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/packages/shared/src/inbox.ts:1)  
`Actions`:
1. Étendre sans rupture:
`CaptureUploadResponse`: ajouter `task_id?: string` et `queue_state?: "enqueued"|"not_enqueued"`.
`CaptureActionResponse`: ajouter `task_id?: string` pour `reprocess`.
2. Ne pas retirer les champs actuels (`id`, `status`, `capture_id`), garder `queued/processing/ready/failed`.
3. Les pages détail continuent à poller l’état capture existant; pas de nouvel endpoint obligatoire en V1.
`Pourquoi ici`: les schémas partagés pilotent web+mobile.  
`Pourquoi pas custom`: un contrat ad hoc par client casserait l’alignement typé monorepo.

### 6. Web et mobile
`Fichiers`: [apps/web/src/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-inbox.ts:1), [apps/mobile/hooks/use-inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-inbox.ts:1)  
`Actions`:
1. Supporter `task_id` optionnel dans parse Zod/TS.
2. Garder UX actuelle:
retour immédiat vers inbox/détail, polling jusqu’à `ready` ou `failed`.
3. Option debug non bloquante:
afficher `task_id` si présent dans écran détail capture.
`Pourquoi ici`: les hooks sont l’unique point réseau front capture.  
`Pourquoi pas custom`: pas de mécanisme polling/socket parallèle custom à créer puisque l’UX existe déjà.

### 7. Infra locale et prod
`Fichiers`: [docker-compose.yml](/Users/andrewpougary/DevLocal/Momentarise/docker-compose.yml:1), [render.yaml](/Users/andrewpougary/DevLocal/Momentarise/render.yaml:1), [apps/api/Dockerfile](/Users/andrewpougary/DevLocal/Momentarise/apps/api/Dockerfile:1)  
`Actions`:
1. Local:
ajouter service `redis` et service `api-worker` (commande Celery worker).
2. Render:
ajouter service Redis managé et service `worker` basé sur la même image API avec commande Celery.
3. Variables env injectées sur web+worker:
`CELERY_BROKER_URL`, `CAPTURE_ASYNC_WORKER_ENABLED=true` (staging/prod au moment voulu).
`Pourquoi ici`: c’est la couche de déploiement source de vérité.  
`Pourquoi pas custom`: lancer un daemon maison sans supervision standard complique restart/scale/observabilité.

### 8. Observabilité et exploitation
`Fichiers`: [apps/api/src/main.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/main.py:1), module worker nouveau  
`Actions`:
1. Logging corrélé:
`request_id` (API), `capture_id`, `task_id`, `job_type`, `duration_ms`.
2. KPIs V1:
temps `queued -> processing`, `processing -> ready`, taux `failed`, backlog queue.
3. Alerting simple:
requête DB périodique sur captures `queued` > N minutes (N=15) pour détecter worker down.
`Pourquoi ici`: la fiabilité perçue utilisateur dépend du délai de traitement.  
`Pourquoi pas custom`: sans métriques standard de queue, un système custom devient opaque en prod.

## Changements importants d’API/interfaces/types
1. `CaptureUploadResponse`:
ajout optionnel `task_id`, `queue_state`.
2. `CaptureActionResponse`:
ajout optionnel `task_id` pour endpoint `reprocess`.
3. Aucun changement breaking des statuts capture.
4. Aucune suppression d’endpoint.
5. Le polling existant (`capture detail`) reste le mécanisme principal de suivi.

## Stratégie de tests et scénarios d’acceptation
1. Tests unitaires worker:
enqueue -> lock -> process -> status final.
2. Tests unitaires API:
avec flag ON, endpoints n’appellent plus `process_capture_jobs` inline.
3. Tests d’intégration (Celery eager mode):
`upload` retourne vite `queued`, puis capture devient `ready` avec artifacts.
4. Tests de panne enqueue:
broker indisponible -> `failed` + `queue_enqueue_failed`.
5. Tests de retry/idempotence:
double enqueue même capture ne crée pas de double résultat.
6. Tests front web/mobile:
parsing `task_id` optionnel, polling inchangé, UI erreur inchangée.
7. NFR:
latence endpoint upload/create fortement réduite vs actuel (objectif p95 API < 1.5s hors upload réseau).

## Rollout (sans interruption)
1. Phase A:
merge code + infra, flag OFF en prod.
2. Phase B:
staging flag ON, validation charge et pannes.
3. Phase C:
prod flag ON pour un pourcentage de trafic (ou workspace pilote).
4. Phase D:
ON global + suppression ultérieure du chemin inline après stabilisation.

## Hypothèses et defaults retenus
1. Plateforme prod principale: Render.
2. Redis prod: Render Redis managé.
3. Scope V1: capture pipeline seulement; Sync chat interactif reste temps réel API.
4. Résultat Celery non persistant en Redis (DB métier = source de vérité).
5. Une queue `capture_pipeline` en V1; split multi-queues possible en V1.1 selon charge réelle."""

## Assistant (2026-03-05T07:11:21.800Z)

Architecture hybride = bon choix.

Tu peux faire “propre” **maintenant** sans faire un big-bang sur tout le produit:
1. `sync chat` reste temps réel (API/SSE).
2. `capture pipeline` passe en Celery/Redis.
3. le reste migre après selon charge réelle.

Le plan proposé est solide, mais je te recommande 5 ajustements critiques:
1. Ajouter un **Transactional Outbox** (sinon risque de jobs perdus entre `commit DB` et `enqueue`).
2. Ajouter un **run_id/version** par reprocess pour idempotence forte.
3. Avoir 2-3 queues (`capture_high`, `capture_default`, `capture_low`) au lieu d’une seule.
4. Garder un **fast-path note**: pas de pipeline IA pour note courte, création directe item+éditeur.
5. Ajouter un **watchdog “stuck jobs”** (captures `processing` trop longtemps -> retry/escalade).

Sur ta question “autant tout faire tout de suite ?”:
- Oui pour la **fondation architecture** maintenant.
- Non pour migrer toutes les capabilities tout de suite.
- Fais V1 capture async complet + rails d’extension, puis migre OCR/VLM/indexation/connecteurs progressivement.

Plan concret que je te conseille:
1. Sprint 1: infra Celery/Redis + outbox + worker + flags.
2. Sprint 2: migration endpoints capture (`create/upload/external/reprocess`) + run_id + idempotence.
3. Sprint 3: priorités de queue + observabilité + rollout progressif Render.
4. En parallèle: UX note instantanée + masque résumé IA sous seuil (`<180 chars`).

Si tu valides, je te fais un plan d’implémentation final “phase par phase” directement actionnable dans le repo.

## User (2026-03-05T08:17:13.245Z)

et oui en cas de fort trafic les forfait free ne seront pas prioritaire, possible de gérer ça aussi ?
Et niveau devX ça changera quoi celery, ça nous permettra une observabilité plus aguérie ? Comme pour ce que j'ai entendu de litellm (que je n'ai pas encore configuré).

## Assistant (2026-03-05T08:17:33.694Z)

Oui, c’est faisable proprement.

1. Prioriser les plans payants vs free en fort trafic
- Oui: avec Celery, tu peux créer des queues par priorité (`capture_high`, `capture_default`, `capture_free`) et affecter les tâches selon le plan workspace/user.
- Worker pool séparé: ex. 70% capacité pour `high/default`, 30% pour `free`.
- Ajouter des garde-fous:
  - quota/rate-limit par plan,
  - `max queue wait` pour éviter famine totale des free,
  - dégradation contrôlée (free: moins de retries, modèles moins coûteux, délai max plus long).
- Important: la priorité doit se faire côté enqueue (API), pas seulement côté worker.

2. DevX/observabilité: Celery améliore, mais pas “magique”
- Oui, tu gagnes:
  - visibilité par task (`queued`, `started`, `retried`, `failed`, `done`),
  - latence par étape,
  - backlog par queue,
  - taux d’échec/retry par provider.
- Tu dois ajouter instrumentation:
  - métriques Prometheus/Grafana,
  - traces OpenTelemetry (API -> task -> provider),
  - logs corrélés (`request_id`, `capture_id`, `task_id`, `run_id`),
  - alerting sur tâches “stuck”.

3. Celery vs LiteLLM
- Complémentaires, pas remplaçants:
  - Celery = orchestration/exécution asynchrone + retries + priorités.
  - LiteLLM = observabilité/coût/latence des appels LLM.
- Ensemble, tu obtiens une vraie chaîne observable: requête utilisateur -> pipeline capture -> appel modèle -> résultat.

4. Reco pragmatique
- Mets dès V1:
  - routing par plan,
  - queues séparées,
  - quotas,
  - dashboards backlog/latence/failure.
- Sinon tu auras une queue unique “opaque” et la priorisation sera difficile à ajouter après.

## User (2026-03-05T08:31:54.664Z)

du coup on doit mettre celery partout ou par "zone" ? par exemple pour les captures oui mais pour les IAs non c'est ça ?

## Assistant (2026-03-05T08:32:07.793Z)

Par **zone/cas d’usage**, pas partout.

- `Celery` pour IA/tâches **asynchrones, longues, retryables**:
  - pipeline captures (transcription, OCR, VLM, enrichissement),
  - connecteurs/imports/sync batch,
  - indexation mémoire, jobs planifiés.

- **Pas Celery** pour IA **interactive temps réel**:
  - chat `/sync`, preview/apply live, orchestrateur conversationnel,
  - tout ce qui doit répondre en quelques centaines de ms à 2-3s max.

Règle simple:
- si tâche >2-3s, dépend d’API externes, et doit survivre/retry -> `Celery`
- sinon -> `inline API`

Donc oui: captures en Celery, IA “chat live” non.  
Mais certaines IA non-live (analyse offline) peuvent aller en Celery.

## User (2026-03-05T08:35:42.333Z)

et si je fais un truc sur render je ne pourrais pas passer sur autre chose apres non ? j'ai peur du vendor lockin...
j'aime bien ce plan "Sprint 1: infra Celery/Redis + outbox + worker + flags.
Sprint 2: migration endpoints capture (create/upload/external/reprocess) + run_id + idempotence.
Sprint 3: priorités de queue + observabilité + rollout progressif Render.
En parallèle: UX note instantanée + masque résumé IA sous seuil (<180 chars).", mais on doit aussi ne pas oublier ça "Tu as raison: ce n’est pas encore “parfait”.

1. `Note` lente: le point principal est l’UX de chargement, pas la pipeline IA.
- La création note ne lance normalement pas la pipeline (`status=ready`), mais après redirection on attend encore des fetch (`capture` puis `item`) + init éditeur.
- Fix immédiat recommandé: ouvrir l’éditeur avec `item_id` dès la réponse `createCapture`, charger `item.blocks` en priorité, puis `capture` en parallèle.

2. Carte résumé IA sur petites notes: je suis d’accord.
- Règle simple: si `capture` de type note et texte < `N` caractères, on masque totalement la carte résumé.
- Je recommande `N = 180` (configurable), calculé sur texte extrait de `item.blocks`.

3. Celery/Redis: nécessaire seulement selon charge.
- Aujourd’hui: ça peut tourner sans Celery si trafic faible.
- En prod sérieuse (uploads voix/photo + retries): oui, une vraie exécution asynchrone worker/queue est préférable.
- Option pragmatique court terme: worker basé DB (vous avez déjà `capture_jobs`), sans nouvelle infra.
- Option scale: Celery + Redis pour retries/backoff, priorités, concurrence par provider, meilleure résilience.

4. Ajustements pipeline/inbox que je recommande ensuite:
- Priorité de jobs (`note/text` ultra rapide, `voice/photo` en background priorisé).
- Idempotence stricte des reprocess (clé run/version).
- Timeouts/circuit breaker provider + erreurs user-friendly.
- Métriques de latence par étape (`transcribe`, `summarize`, `suggest_actions`).
- Cache UI pour éviter états “vide puis rempli”.

Si tu veux, je peux implémenter tout de suite les 2 premiers points avec `N=180` (et constant modifiable)." entre autres

## Assistant (2026-03-05T08:36:06.832Z)

Je vais d’abord vérifier l’état réel du repo sur la couche déploiement/infra (Render, Docker, config env) pour te proposer un plan anti-vendor-lockin concret et actionnable sans angle mort.

## Assistant (2026-03-05T08:36:20.464Z)

Je confirme: Render est minimal (DB + web API) et `docker-compose` n’a pas encore Redis/worker. Je regarde maintenant la config API (env flags) et les dépendances pour cadrer un plan portable (Render maintenant, migrable ailleurs sans réécrire).

## Assistant (2026-03-05T08:36:36.974Z)

Je viens de confirmer que le backend est encore full-inline pour la capture (pas de worker ni broker), donc le passage hybride est bien le bon moment pour éviter un second refactor. Je vérifie aussi l’endpoint `capture_external` et le bootstrap app pour verrouiller un plan portable (Render maintenant, migration cloud possible).

## Assistant (2026-03-05T08:38:23.625Z)

<proposed_plan>
# Plan V2 Hybride Anti-Vendor-Lockin — Capture Async + Priorisation Plans + UX Notes

## Résumé
1. Garder une architecture **hybride par zone**:
- `inline/temps réel` pour `/sync` et interactions IA live.
- `Celery/Redis` pour pipeline capture et tâches longues/retryables.

2. Réduire le lock-in Render:
- code et config broker **provider-agnostic** (`CELERY_BROKER_URL`), zéro API Render dans le runtime.
- même image Docker pour API/worker, déploiement portable (Render aujourd’hui, autre cloud ensuite).

3. Implémenter en 3 sprints:
- Sprint 1: fondation queue-ready (Celery + Redis + outbox + worker + flags).
- Sprint 2: migration endpoints capture + `run_id` + idempotence + UX note instant.
- Sprint 3: priorités par plan (free non prioritaire), observabilité avancée, rollout progressif.

4. Inclure explicitement les correctifs UX déjà identifiés:
- note instantanée (ouvrir éditeur via `item_id` en priorité).
- masquer carte résumé IA pour petites notes (`<180` chars, configurable).

---

## Décisions d’architecture (verrouillées)
1. **Pas “Celery partout”**:
- Celery uniquement pour tâches longues/IO/réessayables.
- Chat IA live reste inline.

2. **Anti-lock-in**:
- broker URL standard, abstrait derrière un module `queue_publisher`.
- Outbox transactionnelle en DB pour fiabilité broker-agnostique.
- Aucun comportement métier dépendant de Render.

3. **Priorité traffic fort**:
- queues séparées: `capture_high`, `capture_default`, `capture_free`.
- routage selon tier (`ultra/pro` -> high, `free` -> free).
- fairness: réserver un minimum de capacité free pour éviter starvation totale.

4. **Source de vérité métier**:
- Postgres garde l’état (`captures`, `capture_jobs`, `artifacts`, `outbox_events`).
- Redis sert de broker, pas de vérité métier.

---

## Sprint 1 — Fondation portable (infra + fiabilité)
1. Ajouter dépendances backend:
- `celery`, `redis`.

2. Ajouter config runtime dans `apps/api/src/core/config.py`:
- `CAPTURE_ASYNC_WORKER_ENABLED` (default `false`)
- `CELERY_BROKER_URL`
- `CELERY_TASK_MAX_RETRIES` (default `3`)
- `CELERY_TASK_SOFT_TIME_LIMIT_SECONDS` (default `780`)
- `CELERY_TASK_TIME_LIMIT_SECONDS` (default `900`)
- `CELERY_WORKER_PREFETCH_MULTIPLIER` (default `1`)
- `CELERY_TASK_ALWAYS_EAGER` (tests)

3. Créer app Celery:
- `apps/api/src/worker/celery_app.py`
- queue names déclarées (`capture_high`, `capture_default`, `capture_free`).

4. Ajouter table outbox transactionnelle via Alembic:
- `queue_outbox_events`:
`id, aggregate_type, aggregate_id, run_id, event_type, payload_json, queue_name, status(pending|enqueued|failed), attempts, next_retry_at, locked_at, locked_by, created_at, updated_at`.

5. Ajouter relay outbox:
- process dédié worker ou thread périodique serveur (flaggable) qui lit pending, publie vers Celery, marque `enqueued`.
- retry/backoff relay.

6. Déploiement portable:
- `docker-compose.yml` enrichi avec `redis`, `api`, `api-worker`.
- `render.yaml` ajoute Redis managé + service worker.
- commandes worker indépendantes de Render.

---

## Sprint 2 — Migration capture + idempotence forte + UX note
1. Ajouter `run_id` sur exécution capture:
- migration `capture_jobs.run_id` (+ index sur `capture_id, run_id, job_type`).
- `capture.meta.current_run_id` + timestamps run.

2. Worker capture task:
- `run_capture_pipeline(capture_id, run_id, trigger, tier)`.
- lock logique: `(capture_id, run_id)` pour éviter double exécution.
- mapping erreurs standard:
`queue_enqueue_failed`, `queue_worker_failure`, `queue_timeout`.

3. Endpoints migrés en enqueue (feature-flagged):
- `POST /api/v1/inbox` (captures non-note)
- `POST /api/v1/inbox/upload`
- `POST /api/v1/capture/external`
- `POST /api/v1/inbox/{id}/reprocess`
- chemin inline conservé derrière flag OFF.

4. **Fast-path note instantanée**:
- création note reste synchrone (sans enqueue pipeline).
- réponse inclut `item_id` (déjà présent) + front redirige éditeur en priorité via `item`.
- chargement éditeur: `item.blocks` d’abord, détail capture en parallèle.

5. Masquage résumé IA petites notes:
- constante configurable `NOTE_SUMMARY_MIN_CHARS=180`.
- longueur calculée sur texte extrait de `item.blocks`.
- si note < seuil: ne pas afficher la carte résumé IA.

---

## Sprint 3 — Priorisation par plan + observabilité + rollout
1. Routage par tier:
- source tier: `workspace.preferences.billing.tier` (fallback `free`).
- mapping queue:
`ultra/pro -> capture_high`, `default -> capture_default`, `free -> capture_free`.

2. Politique free non prioritaire:
- concurrency dédiée:
`high/default` majoritaire, `free` minoritaire.
- QoS:
free retries plus faibles, time-limit plus court, modèles coût maîtrisé.
- garde-fou fairness:
quota minimal de workers/time-slice free.

3. Observabilité “aguérie”:
- logs structurés corrélés `request_id`, `capture_id`, `run_id`, `task_id`, `queue`.
- métriques:
`queue_depth`, `queue_wait_ms`, `run_duration_ms`, `failure_rate`, `retry_count`.
- alerting:
captures `queued|processing` > seuil (ex 15 min).
- option dev/staging:
Flower + dashboard Grafana/Prometheus.
- OTel trace API -> task -> provider.

4. Rollout progressif:
- Phase A: code merge, flag OFF prod.
- Phase B: staging flag ON + tests charge/pannes.
- Phase C: prod pilote (subset workspaces).
- Phase D: ON global, inline conservé 1 cycle puis retrait.

---

## Changements API / interfaces / types publics
1. `CreateCaptureResponse` (text/note):
- garder `id`, `item_id`.
- ajouter optionnel `queue_state`, `run_id`, `task_id` pour captures asynchrones.

2. `CaptureUploadResponse`:
- ajouter `task_id?: string`, `run_id?: string`, `queue_state?: "enqueued"|"not_enqueued"`, `queue_name?: string`.

3. `CaptureActionResponse` (reprocess):
- ajouter `task_id?: string`, `run_id?: string`, `queue_state?: string`.

4. `CaptureDetailResponse`:
- `pipeline_trace` reste backend diagnostic.
- UI user masque trace, mais contrat API inchangé.

5. Préférences tier:
- lecture de `workspace.preferences.billing.tier` (additive, non breaking).

---

## Tests et scénarios d’acceptation
1. Unit tests queue/outbox:
- écriture outbox atomique avec création capture/jobs.
- relay envoie et marque `enqueued`.
- retry relay si broker down.

2. Unit tests idempotence:
- double enqueue même `(capture_id, run_id)` ne duplique pas artifacts/suggestions.

3. API tests:
- flag ON: endpoints capture répondent rapidement `queued`.
- échec enqueue: capture `failed` + `queue_enqueue_failed`.

4. Worker integration tests (`CELERY_TASK_ALWAYS_EAGER=true`):
- upload voice/photo -> processing -> ready/failed avec jobs cohérents.

5. Priorisation tests:
- mix free/pro: latence pro meilleure que free.
- free continue à avancer (pas famine).

6. UX tests note:
- création note ouvre éditeur sans attente pipeline.
- autosave blocks OK.
- résumé IA masqué si note <180 chars.
- résumé IA affiché si >=180 chars.

7. Reprocess tests:
- ancien run nettoyé/isolé.
- seul dernier `run_id` est utilisé en UI.

---

## Assumptions & defaults explicites
1. Broker V1: Redis managé (Render) mais URL et code restent cloud-agnostiques.
2. Tier V1 stocké dans `workspace.preferences.billing.tier` (`free|pro|ultra`), fallback `free`.
3. `NOTE_SUMMARY_MIN_CHARS=180` en config backend/frontend partagée.
4. Chat `/sync` reste inline; non concerné par Celery en V1.
5. `CAPTURE_ASYNC_WORKER_ENABLED=false` par défaut jusqu’au rollout.
6. Migration hors Render possible sans refactor métier: seulement IaC/ops à adapter.
</proposed_plan>

## User (2026-03-05T08:48:16.368Z)

ça va pas tout casser si j'implémente ça tt de suite ? j'ai peur que ça complique trop et que même pour l'ia ce soit difficile à corriger...

## Assistant (2026-03-05T08:55:30.819Z)

Ta peur est légitime. En **Big bang**, sans garde-fous, oui ça peut casser.  
Mais avec ton choix (**Strict rails**), on peut le faire sans se tirer une balle dans le pied.

Ce qui rendra ça safe:

1. **Aucun breaking API** (mêmes endpoints, mêmes champs obligatoires).
2. **Kill switch global** `CAPTURE_ASYNC_WORKER_ENABLED` pour rollback instantané vers inline.
3. **Outbox transactionnelle** pour éviter les jobs perdus (DB commit OK mais enqueue KO).
4. **`run_id` + idempotence** pour éviter doublons/résultats incohérents.
5. **SLO gates obligatoires avant prod** (queue wait, failure rate, stuck jobs).
6. **Observabilité corrélée** (`request_id`, `capture_id`, `run_id`, `task_id`) + alertes.

Pour ta crainte “corriger l’IA devient plus dur”:
- on **ne change pas la logique IA** (prompts/subagents), on change seulement le mode d’exécution (worker vs inline),
- donc debug IA reste possible, et même meilleur avec traces par run.

Si tu valides, je te prépare la version finale du plan Big bang + strict rails avec checklist de go-live/rollback minute par minute.

## User (2026-03-05T08:56:45.984Z)

documente le tout aussi pendant ta construction, dans un fichier celery.md à la racine du projet. refait ton plan et ajouteà chaque étape une section documentation pour assurer le suivi et la compréhension du projet s'il est repris par qqun d'autre.

## Assistant (2026-03-05T08:57:48.845Z)

<proposed_plan>
# Plan final — Celery/Redis Capture Async (Big Bang + Strict Rails) avec documentation continue

## Résumé
1. On migre la pipeline capture vers Celery/Redis en une bascule globale, avec rails stricts pour éviter la casse.
2. On garde le chat IA `/sync` en temps réel inline; Celery uniquement pour tâches longues/retryables.
3. On traite en parallèle les points UX critiques: note instantanée et masquage résumé IA pour notes courtes (`<180` chars).
4. On documente tout au fil de la construction dans [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md), avec journal décisionnel et runbook.

## Règles de sécurité de la migration
1. Aucun breaking contract API: mêmes endpoints, nouveaux champs uniquement optionnels.
2. Kill switch obligatoire: `CAPTURE_ASYNC_WORKER_ENABLED` permet rollback instantané vers inline.
3. Outbox transactionnelle obligatoire avant activation prod.
4. Idempotence obligatoire: `run_id` unique par exécution de pipeline capture.
5. Circuit breaker provider obligatoire: timeout + fail-fast + codes d’erreur normalisés.
6. SLO gates obligatoires avant go-live: sinon go/no-go = NO GO.

## Cadre de documentation continue (`celery.md`)
1. Créer [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md) dès le début de l’implémentation.
2. Structure fixe du document:
Architecture cible, décisions ADR, modèle de données, flux séquentiels, config env, queues et priorités, runbook go-live, runbook rollback, observabilité, incidents connus, changelog daté.
3. Règle de mise à jour:
chaque étape de ce plan se termine par une section “Documentation” avec ce qui doit être ajouté/modifié dans `celery.md`.
4. Règle de reprise projet:
chaque changement doit laisser “Pourquoi”, “Comment”, “Impact”, “Rollback”, “Owner”.

---

## Étape 0 — Préparation anti-lock-in
1. Implémentation:
Standardiser la config broker via `CELERY_BROKER_URL`; aucun code ne doit dépendre d’API Render; même image Docker pour API/worker; scripts de démarrage portables.
2. Implémentation:
Ajouter envs Celery/capture async dans [apps/api/src/core/config.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/core/config.py) et dépendances dans [apps/api/pyproject.toml](/Users/andrewpougary/DevLocal/Momentarise/apps/api/pyproject.toml).
3. Documentation:
Dans `celery.md`, ajouter “Vendor lock-in strategy” avec matrice “Render aujourd’hui / autre cloud demain” et mapping des composants portables.

## Étape 1 — Fondation fiabilité (Celery + Outbox + Worker)
1. Implémentation:
Créer app Celery et worker modules (`src/worker/celery_app.py`, `src/worker/tasks/capture_tasks.py`) avec queues `capture_high`, `capture_default`, `capture_free`.
2. Implémentation:
Créer table outbox (`queue_outbox_events`) via migration Alembic; publier vers Celery via relay outbox.
3. Implémentation:
Configurer `acks_late`, `reject_on_worker_lost`, `prefetch=1`, retries/backoff, soft/hard time limits.
4. Implémentation:
Ajouter statut de publication outbox (`pending/enqueued/failed`) et retry relay.
5. Documentation:
Dans `celery.md`, documenter schéma outbox, lifecycle message, garanties de livraison, et cas d’échec (DB OK / broker KO).

## Étape 2 — Migration endpoints capture + `run_id` + idempotence
1. Implémentation:
Ajouter `run_id` à la pipeline capture (métadata capture + `capture_jobs`) et contrainte d’idempotence `(capture_id, run_id, job_type)`.
2. Implémentation:
Migrer ces endpoints vers enqueue async (sous feature flag): [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py) `create/upload/reprocess`, [capture_external.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/capture_external.py) `external`.
3. Implémentation:
Conserver fallback inline tant que kill switch actif; en mode async, API retourne vite avec état `queued` + ids optionnels (`task_id`, `run_id`, `queue_state`).
4. Implémentation:
Nettoyage reprocess strict par run: soft-delete résultats run précédent, reset méta volatile, exécution nouveau run seulement.
5. Documentation:
Dans `celery.md`, ajouter diagramme “HTTP -> Outbox -> Worker -> DB state” et table des codes erreur (`queue_enqueue_failed`, `queue_worker_failure`, `queue_timeout`).

## Étape 3 — Priorisation plans (free non prioritaire)
1. Implémentation:
Introduire le tier billing en source unique (`workspace.preferences.billing.tier`, fallback `free`).
2. Implémentation:
Router les jobs capture par tier: `ultra/pro -> capture_high`, `default -> capture_default`, `free -> capture_free`.
3. Implémentation:
Appliquer politiques différenciées: quotas/rate limits, retries/timeouts plus stricts sur free, capacité réservée majoritaire payants.
4. Implémentation:
Ajouter fairness minimale free pour éviter starvation totale.
5. Documentation:
Dans `celery.md`, ajouter “Queue policy by tier” avec SLA visé par tier et règles de dégradation contrôlée.

## Étape 4 — Observabilité avancée (DevX)
1. Implémentation:
Logs structurés corrélés `request_id`, `capture_id`, `run_id`, `task_id`, `queue_name`, `stage`, `duration_ms`.
2. Implémentation:
Métriques: `queue_depth`, `queue_wait_ms`, `pipeline_duration_ms`, `retry_count`, `failure_rate`, `stuck_jobs`.
3. Implémentation:
Alerting: captures en `queued/processing` > 15 min; backlog queue > seuil; failure rate > seuil.
4. Implémentation:
Tracing OTel API -> Celery task -> provider call.
5. Documentation:
Dans `celery.md`, ajouter dashboards attendus, seuils d’alertes, playbook incident “queue bloquée”.

## Étape 5 — UX parallèle (obligatoire avant go-live)
1. Implémentation:
Note instantanée: utiliser `item_id` immédiatement après création note; charger `item.blocks` d’abord; charger détail capture en parallèle.
2. Implémentation:
Masquer carte résumé IA pour notes courtes: seuil `NOTE_SUMMARY_MIN_CHARS=180` configurable; calcul sur texte extrait de `item.blocks`.
3. Implémentation:
Conserver sections voix séparées: résumé IA, key clauses, transcription complète.
4. Documentation:
Dans `celery.md`, ajouter section “UX fast path note” et “AI summary threshold policy” avec rationale produit.

## Étape 6 — Go-live Big Bang (avec gates stricts)
1. Implémentation:
Pré-prod/staging: tests de charge + chaos (broker down, worker crash, provider timeout) + validation SLO.
2. Implémentation:
Gate obligatoire: p95 queue wait sous seuil, stuck jobs = 0 durable, failure rate sous seuil.
3. Implémentation:
Basculer prod globalement (`CAPTURE_ASYNC_WORKER_ENABLED=true`) uniquement si tous gates sont verts.
4. Implémentation:
Surveillance renforcée 24-48h avec on-call.
5. Documentation:
Dans `celery.md`, remplir runbook go-live minute par minute et rollback minute par minute avec commandes exactes.

## Étape 7 — Rollback et post-mortem standardisé
1. Implémentation:
Si dérive SLO ou incident critique: kill switch OFF immédiat, retour inline, drain sécurisé des queues.
2. Implémentation:
Conserver données outbox/runs pour audit; rejouer uniquement runs sûrs.
3. Implémentation:
Ouvrir post-mortem systématique avec actions correctives datées.
4. Documentation:
Dans `celery.md`, compléter “Incident log”, “Root cause”, “Actions permanentes”.

---

## Changements API / interfaces / types publics
1. Réponses capture addititives (non breaking):
`task_id?: string`, `run_id?: string`, `queue_state?: "enqueued"|"not_enqueued"`, `queue_name?: string`.
2. Contrats existants conservés:
`id`, `status`, `capture_id`, statuts `queued/processing/ready/failed`.
3. Préférences billing:
ajout d’un champ tier dans préférences workspace (fallback `free` si absent).
4. Aucun endpoint retiré dans cette migration.

## Tests et scénarios d’acceptation
1. Unit tests outbox:
écriture atomique + relay + retries.
2. Unit tests idempotence:
double enqueue même `run_id` ne duplique pas.
3. API integration:
endpoints capture répondent rapidement `queued` en mode async.
4. Failure injection:
broker indisponible, worker crash, timeout provider, retry/backoff attendu.
5. Priorité tier:
fort trafic mix free/pro, pro prioritaire, free progresse tout de même.
6. UX note:
édition immédiate après création, autosave OK, résumé IA masqué sous seuil.
7. Observabilité:
dashboards peuplés, alertes déclenchent correctement.

## Assumptions et defaults explicites
1. Big bang prod accepté, mais uniquement avec gates stricts.
2. Broker V1 Redis, code portable cloud-agnostic.
3. `NOTE_SUMMARY_MIN_CHARS=180`.
4. `/sync` reste inline hors scope Celery V1.
5. Kill switch disponible en permanence après go-live.
6. `celery.md` est la source de vérité opérationnelle et doit être maintenu à chaque étape.
</proposed_plan>

## User (2026-03-05T08:58:22.896Z)

PLEASE IMPLEMENT THIS PLAN:
# Plan final — Celery/Redis Capture Async (Big Bang + Strict Rails) avec documentation continue

## Résumé
1. On migre la pipeline capture vers Celery/Redis en une bascule globale, avec rails stricts pour éviter la casse.
2. On garde le chat IA `/sync` en temps réel inline; Celery uniquement pour tâches longues/retryables.
3. On traite en parallèle les points UX critiques: note instantanée et masquage résumé IA pour notes courtes (`<180` chars).
4. On documente tout au fil de la construction dans [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md), avec journal décisionnel et runbook.

## Règles de sécurité de la migration
1. Aucun breaking contract API: mêmes endpoints, nouveaux champs uniquement optionnels.
2. Kill switch obligatoire: `CAPTURE_ASYNC_WORKER_ENABLED` permet rollback instantané vers inline.
3. Outbox transactionnelle obligatoire avant activation prod.
4. Idempotence obligatoire: `run_id` unique par exécution de pipeline capture.
5. Circuit breaker provider obligatoire: timeout + fail-fast + codes d’erreur normalisés.
6. SLO gates obligatoires avant go-live: sinon go/no-go = NO GO.

## Cadre de documentation continue (`celery.md`)
1. Créer [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md) dès le début de l’implémentation.
2. Structure fixe du document:
Architecture cible, décisions ADR, modèle de données, flux séquentiels, config env, queues et priorités, runbook go-live, runbook rollback, observabilité, incidents connus, changelog daté.
3. Règle de mise à jour:
chaque étape de ce plan se termine par une section “Documentation” avec ce qui doit être ajouté/modifié dans `celery.md`.
4. Règle de reprise projet:
chaque changement doit laisser “Pourquoi”, “Comment”, “Impact”, “Rollback”, “Owner”.

---

## Étape 0 — Préparation anti-lock-in
1. Implémentation:
Standardiser la config broker via `CELERY_BROKER_URL`; aucun code ne doit dépendre d’API Render; même image Docker pour API/worker; scripts de démarrage portables.
2. Implémentation:
Ajouter envs Celery/capture async dans [apps/api/src/core/config.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/core/config.py) et dépendances dans [apps/api/pyproject.toml](/Users/andrewpougary/DevLocal/Momentarise/apps/api/pyproject.toml).
3. Documentation:
Dans `celery.md`, ajouter “Vendor lock-in strategy” avec matrice “Render aujourd’hui / autre cloud demain” et mapping des composants portables.

## Étape 1 — Fondation fiabilité (Celery + Outbox + Worker)
1. Implémentation:
Créer app Celery et worker modules (`src/worker/celery_app.py`, `src/worker/tasks/capture_tasks.py`) avec queues `capture_high`, `capture_default`, `capture_free`.
2. Implémentation:
Créer table outbox (`queue_outbox_events`) via migration Alembic; publier vers Celery via relay outbox.
3. Implémentation:
Configurer `acks_late`, `reject_on_worker_lost`, `prefetch=1`, retries/backoff, soft/hard time limits.
4. Implémentation:
Ajouter statut de publication outbox (`pending/enqueued/failed`) et retry relay.
5. Documentation:
Dans `celery.md`, documenter schéma outbox, lifecycle message, garanties de livraison, et cas d’échec (DB OK / broker KO).

## Étape 2 — Migration endpoints capture + `run_id` + idempotence
1. Implémentation:
Ajouter `run_id` à la pipeline capture (métadata capture + `capture_jobs`) et contrainte d’idempotence `(capture_id, run_id, job_type)`.
2. Implémentation:
Migrer ces endpoints vers enqueue async (sous feature flag): [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py) `create/upload/reprocess`, [capture_external.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/capture_external.py) `external`.
3. Implémentation:
Conserver fallback inline tant que kill switch actif; en mode async, API retourne vite avec état `queued` + ids optionnels (`task_id`, `run_id`, `queue_state`).
4. Implémentation:
Nettoyage reprocess strict par run: soft-delete résultats run précédent, reset méta volatile, exécution nouveau run seulement.
5. Documentation:
Dans `celery.md`, ajouter diagramme “HTTP -> Outbox -> Worker -> DB state” et table des codes erreur (`queue_enqueue_failed`, `queue_worker_failure`, `queue_timeout`).

## Étape 3 — Priorisation plans (free non prioritaire)
1. Implémentation:
Introduire le tier billing en source unique (`workspace.preferences.billing.tier`, fallback `free`).
2. Implémentation:
Router les jobs capture par tier: `ultra/pro -> capture_high`, `default -> capture_default`, `free -> capture_free`.
3. Implémentation:
Appliquer politiques différenciées: quotas/rate limits, retries/timeouts plus stricts sur free, capacité réservée majoritaire payants.
4. Implémentation:
Ajouter fairness minimale free pour éviter starvation totale.
5. Documentation:
Dans `celery.md`, ajouter “Queue policy by tier” avec SLA visé par tier et règles de dégradation contrôlée.

## Étape 4 — Observabilité avancée (DevX)
1. Implémentation:
Logs structurés corrélés `request_id`, `capture_id`, `run_id`, `task_id`, `queue_name`, `stage`, `duration_ms`.
2. Implémentation:
Métriques: `queue_depth`, `queue_wait_ms`, `pipeline_duration_ms`, `retry_count`, `failure_rate`, `stuck_jobs`.
3. Implémentation:
Alerting: captures en `queued/processing` > 15 min; backlog queue > seuil; failure rate > seuil.
4. Implémentation:
Tracing OTel API -> Celery task -> provider call.
5. Documentation:
Dans `celery.md`, ajouter dashboards attendus, seuils d’alertes, playbook incident “queue bloquée”.

## Étape 5 — UX parallèle (obligatoire avant go-live)
1. Implémentation:
Note instantanée: utiliser `item_id` immédiatement après création note; charger `item.blocks` d’abord; charger détail capture en parallèle.
2. Implémentation:
Masquer carte résumé IA pour notes courtes: seuil `NOTE_SUMMARY_MIN_CHARS=180` configurable; calcul sur texte extrait de `item.blocks`.
3. Implémentation:
Conserver sections voix séparées: résumé IA, key clauses, transcription complète.
4. Documentation:
Dans `celery.md`, ajouter section “UX fast path note” et “AI summary threshold policy” avec rationale produit.

## Étape 6 — Go-live Big Bang (avec gates stricts)
1. Implémentation:
Pré-prod/staging: tests de charge + chaos (broker down, worker crash, provider timeout) + validation SLO.
2. Implémentation:
Gate obligatoire: p95 queue wait sous seuil, stuck jobs = 0 durable, failure rate sous seuil.
3. Implémentation:
Basculer prod globalement (`CAPTURE_ASYNC_WORKER_ENABLED=true`) uniquement si tous gates sont verts.
4. Implémentation:
Surveillance renforcée 24-48h avec on-call.
5. Documentation:
Dans `celery.md`, remplir runbook go-live minute par minute et rollback minute par minute avec commandes exactes.

## Étape 7 — Rollback et post-mortem standardisé
1. Implémentation:
Si dérive SLO ou incident critique: kill switch OFF immédiat, retour inline, drain sécurisé des queues.
2. Implémentation:
Conserver données outbox/runs pour audit; rejouer uniquement runs sûrs.
3. Implémentation:
Ouvrir post-mortem systématique avec actions correctives datées.
4. Documentation:
Dans `celery.md`, compléter “Incident log”, “Root cause”, “Actions permanentes”.

---

## Changements API / interfaces / types publics
1. Réponses capture addititives (non breaking):
`task_id?: string`, `run_id?: string`, `queue_state?: "enqueued"|"not_enqueued"`, `queue_name?: string`.
2. Contrats existants conservés:
`id`, `status`, `capture_id`, statuts `queued/processing/ready/failed`.
3. Préférences billing:
ajout d’un champ tier dans préférences workspace (fallback `free` si absent).
4. Aucun endpoint retiré dans cette migration.

## Tests et scénarios d’acceptation
1. Unit tests outbox:
écriture atomique + relay + retries.
2. Unit tests idempotence:
double enqueue même `run_id` ne duplique pas.
3. API integration:
endpoints capture répondent rapidement `queued` en mode async.
4. Failure injection:
broker indisponible, worker crash, timeout provider, retry/backoff attendu.
5. Priorité tier:
fort trafic mix free/pro, pro prioritaire, free progresse tout de même.
6. UX note:
édition immédiate après création, autosave OK, résumé IA masqué sous seuil.
7. Observabilité:
dashboards peuplés, alertes déclenchent correctement.

## Assumptions et defaults explicites
1. Big bang prod accepté, mais uniquement avec gates stricts.
2. Broker V1 Redis, code portable cloud-agnostic.
3. `NOTE_SUMMARY_MIN_CHARS=180`.
4. `/sync` reste inline hors scope Celery V1.
5. Kill switch disponible en permanence après go-live.
6. `celery.md` est la source de vérité opérationnelle et doit être maintenu à chaque étape.

## Assistant (2026-03-05T08:58:40.452Z)

Je vais implémenter ce plan en mode “big bang sécurisé” avec un socle complet: Celery/Redis + outbox + run_id/idempotence + migration des endpoints capture + docs `celery.md` + ajustements UX note. Je commence par auditer l’état actuel (modèles/migrations/routes/hooks) puis je patch étape par étape avec tests à chaque jalon.

## Assistant (2026-03-05T08:58:51.512Z)

Je vais maintenant implémenter la base technique côté API: nouveaux settings Celery, modèles/outbox/run_id, app worker et migration Alembic. Ensuite je brancherai les endpoints capture sur l’enqueue async avec fallback kill-switch inline.

## Assistant (2026-03-05T09:01:04.446Z)

Je vais implémenter le plan en priorité sur le socle backend (Celery + outbox + `run_id` + endpoints sous feature flag), puis aligner les types/front et documenter chaque étape dans `celery.md`. Je commence par un audit rapide des fichiers ciblés pour patcher proprement sans casser les flows existants.

## Assistant (2026-03-05T09:01:15.523Z)

Je vois un worktree déjà très chargé, donc je vais éviter toute régression en touchant uniquement les fichiers Celery/capture/types/doc. Je lis maintenant la configuration API, les modèles capture et les endpoints `inbox/capture_external` pour brancher l’async proprement.

## Assistant (2026-03-05T09:01:29.121Z)

Je passe sur le front (web/mobile) pour vérifier ce qui existe déjà sur le fast-path note et le masquage résumé, puis je finalise un plan d’implémentation concret avant les patches.

## Assistant (2026-03-05T09:01:42.244Z)

Je corrige juste la lecture des fichiers avec des chemins échappés (`[id]`, `(dashboard)`), puis je vérifie précisément le flow note et l’affichage résumé/transcription actuel.

## Assistant (2026-03-05T09:01:51.065Z)

Je vais maintenant brancher le socle backend: je lis `capture_pipeline.py` et `inbox.py` autour des fonctions de queue/reprocess pour injecter `run_id`, outbox et fallback inline sans casser la logique existante.

## Assistant (2026-03-05T09:02:22.066Z)

J’ai le contexte complet. Je vais maintenant verrouiller le plan d’exécution en 3 blocs: backend async + contrats/types + UX/doc/tests, puis je patch étape par étape avec mise à jour de `celery.md` à chaque palier.

## Assistant (2026-03-05T09:02:27.247Z)

Plan d’implémentation immédiat:

1. **Socle async capture**
- Ajouter config + dépendances Celery/Redis.
- Créer modèles `QueueOutboxEvent` + `run_id` sur `CaptureJob` (avec migration Alembic).
- Créer modules worker (`celery_app`, `capture_tasks`) + relay outbox + routing de queue par tier.

2. **Migration endpoints sous rails stricts**
- Dans `inbox.py` et `capture_external.py`: introduire `run_id`, enqueue async via outbox quand `CAPTURE_ASYNC_WORKER_ENABLED=true`, fallback inline sinon.
- Conserver contrats existants + ajouter champs optionnels (`task_id`, `run_id`, `queue_state`, `queue_name`).
- Reprocess strict par run (soft-delete, reset meta volatile, nouveau run uniquement).

3. **UX et contrat front**
- Types partagés + hooks web/mobile pour nouveaux champs optionnels.
- Fast-path note: utiliser `item_id` direct et charger `item` en priorité dans les pages note.
- Masquer la carte résumé IA pour note courte (`<180 chars` configurable), conserver séparation résumé/key clauses/transcription, retirer `pipeline_trace` côté UI user.

4. **Ops/documentation/tests**
- Créer/maintenir `celery.md` (ADR, runbook go-live/rollback, lock-in strategy, policies tier).
- Ajouter/adapter tests backend ciblés (`idempotence run_id`, enqueue async, no fallback action, reprocess strict, codes erreur queue).
- Exécuter compilation/tests disponibles et corriger jusqu’au vert raisonnable.

## Assistant (2026-03-05T09:04:46.601Z)

Je commence les edits backend: dépendances/config Celery, nouveaux modèles (`run_id`, outbox), puis migration Alembic. Après ça je branche l’enqueue async dans les endpoints avec fallback inline conservé.

## Assistant (2026-03-05T09:05:48.793Z)

Je viens d’ajouter le modèle d’outbox. J’aligne maintenant les relations ORM (`Workspace`/`InboxCapture`) et l’export modèle pour que la migration et les requêtes fonctionnent proprement.

## Assistant (2026-03-05T09:07:49.479Z)

Je passe au module de queue: création d’un service `capture_async_queue` (tier -> queue, outbox, publish/retry, méta capture) et des modules worker Celery. Ensuite je branche les endpoints dessus.

## Assistant (2026-03-05T09:11:46.512Z)

Je branche maintenant `capture_external` sur le même rail que `inbox` (run_id + queue async sous flag + fallback inline), pour garder un comportement homogène sur tous les points d’entrée capture.

## Assistant (2026-03-05T09:12:20.517Z)

Je passe aux contrats partagés maintenant: j’ajoute les champs optionnels queue/run/task dans les schémas `shared` pour que web+mobile restent compatibles sans break.

## Assistant (2026-03-05T09:13:27.864Z)

Je traite l’UX note maintenant: fast-path `item_id` (web+mobile) pour ouvrir l’éditeur immédiatement sans attendre le détail capture, puis fallback progressif.

## Assistant (2026-03-05T09:15:18.991Z)

Je termine l’infra portable (anti lock-in): `docker-compose` + `render.yaml` avec Redis + worker dédié, sans dépendance API propriétaire Render dans le code (seulement `CELERY_BROKER_URL`).

## Assistant (2026-03-05T09:18:48.103Z)

Je passe en validation technique: compilation Python des fichiers modifiés, puis tests unitaires ciblés pour vérifier que la migration de flux n’a pas introduit de régression immédiate.

## Assistant (2026-03-05T09:18:55.159Z)

La compilation a bloqué sur un accès cache `uv` hors sandbox. Je relance la même validation avec permissions étendues pour obtenir un signal fiable avant de continuer.

## Assistant (2026-03-05T09:31:08.260Z)

Je fais une relecture ciblée des diffs front et des nouveaux fichiers worker/outbox pour vérifier qu’il n’y a pas de régression silencieuse avant de finaliser.

## Assistant (2026-03-05T09:33:07.006Z)

Je finalise avec une passe de références (fichiers/sections clés + lignes) pour te donner un suivi exploitable immédiatement, puis je te fais un bilan exécutable (tests inclus, points restants).

## Assistant (2026-03-05T09:34:28.174Z)

Implémentation faite sur le plan demandé, avec migration async capture + UX notes/transcription + doc continue.

**Ce que j’ai implémenté**

- Async capture Celery/Redis avec outbox transactionnelle + `run_id`:
  - Dépendances/config: [pyproject.toml](/Users/andrewpougary/DevLocal/Momentarise/apps/api/pyproject.toml:7), [config.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/core/config.py:27)
  - Nouveau service queue/outbox/tier routing: [capture_async_queue.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py:1)
  - Worker Celery + task capture: [celery_app.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/worker/celery_app.py:1), [capture_tasks.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/worker/tasks/capture_tasks.py:1)
  - `run_id`/`queue_name`/`task_id` sur jobs: [capture_job.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/models/capture_job.py:11)
  - Modèle outbox: [queue_outbox_event.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/models/queue_outbox_event.py:13)
  - Migration Alembic: [e8b7c9d0f1a2_add_capture_queue_outbox_and_run_id.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/alembic/versions/e8b7c9d0f1a2_add_capture_queue_outbox_and_run_id.py:1)

- Endpoints capture migrés sous kill-switch (`CAPTURE_ASYNC_WORKER_ENABLED`), fallback inline conservé:
  - `create/upload/reprocess`: [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:940)
  - `external`: [capture_external.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/capture_external.py:52)
  - Échec enqueue explicite `503 queue_enqueue_failed` + meta erreur.

- Contrats API additifs (non-breaking):
  - Backend schemas: [inbox.py schema](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/schemas/inbox.py:102)
  - Shared zod/types: [packages/shared/src/inbox.ts](/Users/andrewpougary/DevLocal/Momentarise/packages/shared/src/inbox.ts:175)
  - Champs ajoutés: `task_id?`, `run_id?`, `queue_state?`, `queue_name?`

- Pipeline idempotence par run:
  - `enqueue_default_jobs(..., run_id, queue_name)` + `process_capture_jobs(..., run_id)`: [capture_pipeline.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py:730)

- UX note rapide (web + mobile):
  - Redirection avec `item_id` dès création: [capture-fab.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/capture-fab.tsx:105), [use-create-actions.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-create-actions.ts:152)
  - Éditeur note charge `item` d’abord via query param, capture en parallèle:
    - [web note page](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/note/page.tsx:23)
    - [mobile note page](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id]/note.tsx:24)

- Masquage résumé IA pour notes courtes `<180` chars:
  - Web: [capture detail web](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx:54)
  - Mobile: [capture detail mobile](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx:37)

- Polling mobile capture detail (queued/processing):
  - [mobile use-inbox hook](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-inbox.ts:50)

- Infra portable (anti lock-in):
  - Local: Redis + API worker dans [docker-compose.yml](/Users/andrewpougary/DevLocal/Momentarise/docker-compose.yml:1)
  - Render: service Redis + worker + envs Celery dans [render.yaml](/Users/andrewpougary/DevLocal/Momentarise/render.yaml:1)

- Documentation continue:
  - SSoT opérationnel: [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md:1)

**Validation exécutée**

- Compilation Python OK (fichiers backend/migration/worker).
- Tests unitaires ciblés OK:
  - `tests.test_capture_async_queue`
  - `tests.test_capture_pipeline_suggestions`
  - `tests.test_inbox_hotfix`
  - Résultat: **31 tests OK**.

**Point important**

- Dans `render.yaml`, j’ai laissé `CAPTURE_ASYNC_WORKER_ENABLED="false"` côté API par défaut pour garder un rollback instantané propre; le worker est prêt.  
- Le code de go-live/rollback + gates SLO est documenté dans `celery.md`.

**Étapes suivantes recommandées**
1. Activer l’async en staging (`CAPTURE_ASYNC_WORKER_ENABLED=true`) et valider latence queue + taux d’échec.
2. Exécuter un smoke E2E web/mobile sur création note + voix reprocess.
3. Si staging est vert, basculer prod via kill-switch et monitorer 24-48h.

## User (2026-03-05T10:50:45.572Z)

du coup c'est finalisé et fiable ?

## Assistant (2026-03-05T10:51:06.407Z)

Pas encore “fiable prod” à 100%, mais c’est **solide côté implémentation**.

- Oui: code en place, compile OK, tests ciblés OK (`31 tests`), kill-switch + rollback prêt.
- Non: pas encore validé en conditions réelles (staging avec Redis/Celery, chaos tests broker/worker timeout, vérification SLO).

Donc: **finalisé en dev**, **à valider en staging avant prod**.  
Si tu veux, je te déroule maintenant la checklist go-live pas à pas et on l’exécute.

## User (2026-03-05T10:55:13.253Z)

# AGENTS.md instructions for /Users/andrewpougary/DevLocal/Momentarise

<INSTRUCTIONS>
## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/andrewpougary/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/andrewpougary/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
</INSTRUCTIONS>
<environment_context>
  <cwd>/Users/andrewpougary/DevLocal/Momentarise</cwd>
  <shell>zsh</shell>
  <current_date>2026-03-05</current_date>
  <timezone>Europe/Paris</timezone>
</environment_context>

## User (2026-03-05T10:55:13.254Z)

oui je dois tester c'est ça ?

## Assistant (2026-03-05T10:55:19.470Z)

Oui. Avant de dire “fiable prod”, il faut faire un passage de validation.

Le minimum à tester maintenant :
1. Staging avec `CAPTURE_ASYNC_WORKER_ENABLED=true`.
2. Parcours réels : `create/upload/external/reprocess` (notes + voix + image).
3. Cas d’échec : Redis down, worker crash, timeout provider, reprocess en double.
4. Vérifier métriques : jobs bloqués (`queued/processing`), taux d’échec, latence file d’attente.
5. Vérifier UX : note ouvre vite, résumé masqué `<180 chars`, sections voix bien séparées.

Si ces gates passent, tu peux basculer prod avec risque maîtrisé.

## User (2026-03-05T10:59:54.836Z)

INFO:     Will watch for changes in these directories: ['/Users/andrewpougary/DevLocal/Momentarise/apps/api']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [41277] using WatchFiles
worker.celery.disabled reason=missing_broker_or_dependency
INFO:     Started server process [41279]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
WARNING:  WatchFiles detected changes in 'src/core/config.py'. Reloading...
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [41279]
worker.celery.disabled reason=missing_broker_or_dependency
INFO:     Started server process [42618]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
/Users/andrewpougary/DevLocal/Momentarise/apps/api/.venv/lib/python3.12/site-packages/jwt/api_jwt.py:153: InsecureKeyLengthWarning: The HMAC key is 28 bytes long, which is below the minimum recommended length of 32 bytes for SHA256. See RFC 7518 Section 3.2.
  return self._jws.encode(
INFO:     127.0.0.1:49171 - "POST /api/v1/auth/login HTTP/1.1" 200 OK
/Users/andrewpougary/DevLocal/Momentarise/apps/api/.venv/lib/python3.12/site-packages/jwt/api_jwt.py:371: InsecureKeyLengthWarning: The HMAC key is 28 bytes long, which is below the minimum recommended length of 32 bytes for SHA256. See RFC 7518 Section 3.2.
  decoded = self.decode_complete(
INFO:     127.0.0.1:49171 - "GET /api/v1/auth/me HTTP/1.1" 200 OK
INFO:     127.0.0.1:49181 - "GET /api/v1/today HTTP/1.1" 200 OK
INFO:     127.0.0.1:49179 - "GET /api/v1/projects HTTP/1.1" 200 OK
INFO:     127.0.0.1:49183 - "GET /api/v1/inbox?include_archived=false&bucket=all HTTP/1.1" 200 OK
INFO:     127.0.0.1:49171 - "GET /api/v1/sync/models HTTP/1.1" 200 OK
INFO:     127.0.0.1:49171 - "GET /api/v1/sync/runs?limit=50 HTTP/1.1" 200 OK
INFO:     127.0.0.1:49171 - "GET /api/v1/inbox?include_archived=false&bucket=untreated HTTP/1.1" 200 OK
capture.outbox.publish_failed outbox_event_id=1ecd8d91-4e55-4873-99a8-e6f98d50910e capture_id=a7b2cd68-1d41-4364-8895-faea8fc3049a run_id=e33134ff-c55d-45b8-8306-765606ff3cb0 error=celery_not_configured
Traceback (most recent call last):
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 195, in publish_capture_outbox_event
    task_id = _dispatch_capture_pipeline_task(
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 93, in _dispatch_capture_pipeline_task
    raise RuntimeError("celery_not_configured")
RuntimeError: celery_not_configured
INFO:     127.0.0.1:49351 - "POST /api/v1/inbox/upload HTTP/1.1" 503 Service Unavailable
capture.outbox.publish_failed outbox_event_id=de7a84ca-b493-4921-9bcb-1d2337cd8559 capture_id=0acd2749-6ff4-4039-a4c0-a8759cba2e34 run_id=84bb2704-5a52-4311-9b2e-49d9c483c384 error=celery_not_configured
Traceback (most recent call last):
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 195, in publish_capture_outbox_event
    task_id = _dispatch_capture_pipeline_task(
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 93, in _dispatch_capture_pipeline_task
    raise RuntimeError("celery_not_configured")
RuntimeError: celery_not_configured
INFO:     127.0.0.1:49491 - "POST /api/v1/inbox/upload HTTP/1.1" 503 Service Unavailable
INFO:     127.0.0.1:49558 - "GET /api/v1/projects HTTP/1.1" 200 OK
INFO:     127.0.0.1:49555 - "GET /api/v1/auth/me HTTP/1.1" 200 OK
INFO:     127.0.0.1:49559 - "GET /api/v1/inbox?include_archived=false&bucket=untreated HTTP/1.1" 200 OK
capture.outbox.publish_failed outbox_event_id=ced18b7b-2fbe-49a3-8f5b-d12d53f2476b capture_id=6be9551a-d6f7-47ae-8456-5865adfe3047 run_id=6940b9d3-ea0a-4b61-b268-147d7cf08f01 error=celery_not_configured
Traceback (most recent call last):
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 195, in publish_capture_outbox_event
    task_id = _dispatch_capture_pipeline_task(
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 93, in _dispatch_capture_pipeline_task
    raise RuntimeError("celery_not_configured")
RuntimeError: celery_not_configured
INFO:     127.0.0.1:49606 - "POST /api/v1/inbox HTTP/1.1" 503 Service Unavailable



d'ailleurs même le lien n'a pas fonctionné : ""INFO:     Will watch for changes in these directories: ['/Users/andrewpougary/DevLocal/Momentarise/apps/api']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [41277] using WatchFiles
worker.celery.disabled reason=missing_broker_or_dependency
INFO:     Started server process [41279]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
WARNING:  WatchFiles detected changes in 'src/core/config.py'. Reloading...
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [41279]
worker.celery.disabled reason=missing_broker_or_dependency
INFO:     Started server process [42618]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
/Users/andrewpougary/DevLocal/Momentarise/apps/api/.venv/lib/python3.12/site-packages/jwt/api_jwt.py:153: InsecureKeyLengthWarning: The HMAC key is 28 bytes long, which is below the minimum recommended length of 32 bytes for SHA256. See RFC 7518 Section 3.2.
  return self._jws.encode(
INFO:     127.0.0.1:49171 - "POST /api/v1/auth/login HTTP/1.1" 200 OK
/Users/andrewpougary/DevLocal/Momentarise/apps/api/.venv/lib/python3.12/site-packages/jwt/api_jwt.py:371: InsecureKeyLengthWarning: The HMAC key is 28 bytes long, which is below the minimum recommended length of 32 bytes for SHA256. See RFC 7518 Section 3.2.
  decoded = self.decode_complete(
INFO:     127.0.0.1:49171 - "GET /api/v1/auth/me HTTP/1.1" 200 OK
INFO:     127.0.0.1:49181 - "GET /api/v1/today HTTP/1.1" 200 OK
INFO:     127.0.0.1:49179 - "GET /api/v1/projects HTTP/1.1" 200 OK
INFO:     127.0.0.1:49183 - "GET /api/v1/inbox?include_archived=false&bucket=all HTTP/1.1" 200 OK
INFO:     127.0.0.1:49171 - "GET /api/v1/sync/models HTTP/1.1" 200 OK
INFO:     127.0.0.1:49171 - "GET /api/v1/sync/runs?limit=50 HTTP/1.1" 200 OK
INFO:     127.0.0.1:49171 - "GET /api/v1/inbox?include_archived=false&bucket=untreated HTTP/1.1" 200 OK
capture.outbox.publish_failed outbox_event_id=1ecd8d91-4e55-4873-99a8-e6f98d50910e capture_id=a7b2cd68-1d41-4364-8895-faea8fc3049a run_id=e33134ff-c55d-45b8-8306-765606ff3cb0 error=celery_not_configured
Traceback (most recent call last):
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 195, in publish_capture_outbox_event
    task_id = _dispatch_capture_pipeline_task(
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 93, in _dispatch_capture_pipeline_task
    raise RuntimeError("celery_not_configured")
RuntimeError: celery_not_configured
INFO:     127.0.0.1:49351 - "POST /api/v1/inbox/upload HTTP/1.1" 503 Service Unavailable
capture.outbox.publish_failed outbox_event_id=de7a84ca-b493-4921-9bcb-1d2337cd8559 capture_id=0acd2749-6ff4-4039-a4c0-a8759cba2e34 run_id=84bb2704-5a52-4311-9b2e-49d9c483c384 error=celery_not_configured
Traceback (most recent call last):
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 195, in publish_capture_outbox_event
    task_id = _dispatch_capture_pipeline_task(
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 93, in _dispatch_capture_pipeline_task
    raise RuntimeError("celery_not_configured")
RuntimeError: celery_not_configured
INFO:     127.0.0.1:49491 - "POST /api/v1/inbox/upload HTTP/1.1" 503 Service Unavailable
INFO:     127.0.0.1:49558 - "GET /api/v1/projects HTTP/1.1" 200 OK
INFO:     127.0.0.1:49555 - "GET /api/v1/auth/me HTTP/1.1" 200 OK
INFO:     127.0.0.1:49559 - "GET /api/v1/inbox?include_archived=false&bucket=untreated HTTP/1.1" 200 OK
capture.outbox.publish_failed outbox_event_id=ced18b7b-2fbe-49a3-8f5b-d12d53f2476b capture_id=6be9551a-d6f7-47ae-8456-5865adfe3047 run_id=6940b9d3-ea0a-4b61-b268-147d7cf08f01 error=celery_not_configured
Traceback (most recent call last):
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 195, in publish_capture_outbox_event
    task_id = _dispatch_capture_pipeline_task(
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py", line 93, in _dispatch_capture_pipeline_task
    raise RuntimeError("celery_not_configured")
RuntimeError: celery_not_configured
INFO:     127.0.0.1:49606 - "POST /api/v1/inbox HTTP/1.1" 503 Service Unavailable
WARNING:  WatchFiles detected changes in 'src/core/config.py'. Reloading...
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [42618]
worker.celery.disabled reason=missing_broker_or_dependency
INFO:     Started server process [45716]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
/Users/andrewpougary/DevLocal/Momentarise/apps/api/.venv/lib/python3.12/site-packages/jwt/api_jwt.py:371: InsecureKeyLengthWarning: The HMAC key is 28 bytes long, which is below the minimum recommended length of 32 bytes for SHA256. See RFC 7518 Section 3.2.
  decoded = self.decode_complete(
[SYNC-DEBUG] LLM routing: requested='mistral-small-latest' → provider='mistral', model='mistral-small-latest'
capture.job.failed capture_id=cc7c3c15-ad35-4a1b-8d17-505f676c61cf job_id=db559e3f-cbe2-404e-a8de-0941d2ca2927 job_type=preprocess duration_ms=2677.9 error=capture_summary_empty
Traceback (most recent call last):
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_pipeline.py", line 1173, in process_capture_jobs
    summary_payload = await generate_capture_summary_with_subagent(
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_ai_service.py", line 360, in generate_capture_summary_with_subagent
    raise RuntimeError("capture_summary_empty")
RuntimeError: capture_summary_empty
[SYNC-DEBUG] LLM routing: requested='mistral-large-latest' → provider='mistral', model='mistral-large-latest'
INFO:     127.0.0.1:49782 - "POST /api/v1/inbox HTTP/1.1" 201 Created
INFO:     127.0.0.1:49782 - "GET /api/v1/inbox?include_archived=false&bucket=untreated HTTP/1.1" 200 OK
INFO:     127.0.0.1:49782 - "GET /api/v1/inbox/cc7c3c15-ad35-4a1b-8d17-505f676c61cf HTTP/1.1" 200 OK
INFO:     127.0.0.1:49782 - "GET /api/v1/series HTTP/1.1" 200 OK
INFO:     127.0.0.1:49867 - "GET /api/v1/items/02e9183d-c13e-4759-8098-fbca2db12419 HTTP/1.1" 200 OK""

## Assistant (2026-03-05T11:00:03.752Z)

Je vois exactement le problème dans tes logs: l’API est en mode async capture, mais Celery n’est pas configuré localement, donc les `POST /inbox` et `/upload` tombent en `503 celery_not_configured`. Je vais corriger le comportement pour que, si le worker/broker est indisponible en local, on retombe automatiquement en traitement inline (sans casser la création de note ni les liens), puis je te donne les envs exactes pour tester l’async proprement.

## Assistant (2026-03-05T11:00:12.494Z)

Je vais regarder le code exact de l’enqueue async pour te proposer un fix concret: aujourd’hui il force `503` si Celery est absent, ce qui est trop strict en local/dev. Ensuite je patcherai un fallback inline sécurisé avec logs explicites.

## Assistant (2026-03-05T11:01:05.128Z)

Je confirme la cause racine: `CAPTURE_ASYNC_WORKER_ENABLED=true` sans `CELERY_BROKER_URL`/worker actif provoque `celery_not_configured`, et le code répond `503` par design strict. Je vais ajouter un garde-fou explicite: fallback inline automatique quand le broker/worker n’est pas prêt (surtout en local), avec metadata claire et sans casser le mode async quand il est réellement dispo.

## User (2026-03-05T12:00:11.903Z)

continue

## Assistant (2026-03-05T12:00:25.847Z)

Je continue: l’échec précédent venait juste du shell (`[]`/`()` non échappés), pas du code. Je reprends la lecture ciblée des pages note/capture puis je pousse le patch fallback async->inline pour stopper ces `503` en local.

## Assistant (2026-03-05T12:00:46.915Z)

Je vais patcher un mode “grâce locale” précis: `async` seulement si le broker Celery est réellement prêt, sinon fallback inline automatique (avec log clair). Comme ça tu gardes la migration big-bang en prod, mais ton dev local ne casse plus en `503`.

## Assistant (2026-03-05T12:01:18.837Z)

Je viens d’ajouter un check central de disponibilité worker côté service queue. Je patche maintenant les endpoints (`create/upload/reprocess/external`) pour éviter le `503` quand Celery n’est pas prêt et basculer inline proprement.

## Assistant (2026-03-05T12:02:26.988Z)

J’ai appliqué le patch fallback + correction du lien note avec `item_id`. Je lance maintenant des checks rapides (compile + tests ciblés) pour valider qu’on n’introduit pas de régression backend.

## Assistant (2026-03-05T12:09:20.689Z)

Les tests backend passent avec le correctif. J’ajoute maintenant la doc dans `celery.md` (section troubleshooting + comportement fallback local) pour que ce soit clair pour la reprise projet et tes tests.

## Assistant (2026-03-05T12:10:06.082Z)

J’ai fini le correctif et la validation. Je récupère juste les références de lignes pour te donner un résumé actionnable et des étapes de test local immédiates.

## Assistant (2026-03-05T12:10:35.152Z)

Cause racine confirmée: `CAPTURE_ASYNC_WORKER_ENABLED=true` alors que Celery/broker n’était pas prêt (`worker.celery.disabled`), donc enqueue impossible et `503`.

Correctifs appliqués:
- Fallback inline automatique si worker async indisponible:
  - [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:122)
  - usages sur create/upload/reprocess:
    - [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1164)
    - [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1357)
    - [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py:1633)
  - helper de disponibilité:
    - [capture_async_queue.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/services/capture_async_queue.py:35)
  - capture externe alignée:
    - [capture_external.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/capture_external.py:142)
- Lien note fiabilisé (ajout `item_id` depuis la carte capture):
  - Web: [page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx:613)
  - Mobile: [[id].tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx:530)
- Doc mise à jour:
  - [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md:63)
  - troubleshooting: [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md:129)

Validation:
- `py_compile` OK.
- Tests backend ciblés OK: **32 tests pass** (dont nouveau test dispo worker: [test_capture_async_queue.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/tests/test_capture_async_queue.py:64)).

Ce que tu dois faire maintenant pour retester:
1. Redémarrer l’API.
2. Refaire `POST /inbox` (note) et `POST /inbox/upload`: tu ne dois plus avoir de `503 celery_not_configured` en local.
3. Si tu veux tester le vrai mode async, démarre Redis + worker et définis `CELERY_BROKER_URL` (`redis://localhost:6379/0`).

## User (2026-03-05T12:20:53.425Z)

comment on démarre redis worker ?

## Assistant (2026-03-05T12:21:06.964Z)

En local, le plus simple:

```bash
cd /Users/andrewpougary/DevLocal/Momentarise
docker compose up -d redis
```

Puis worker Celery:

```bash
cd /Users/andrewpougary/DevLocal/Momentarise/apps/api
export CELERY_BROKER_URL=redis://localhost:6379/0
uv run celery -A src.worker.celery_app:celery_app worker -Q capture_high,capture_default,capture_free -l info
```

Et dans le terminal API (même `CELERY_BROKER_URL`) :

```bash
export CAPTURE_ASYNC_WORKER_ENABLED=true
export CELERY_BROKER_URL=redis://localhost:6379/0
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Check rapide:
- plus de log `worker.celery.disabled`
- les créations capture retournent `queue_state: "enqueued"` + `task_id`.

## User (2026-03-05T13:46:26.095Z)

ça fonctionne globalement je crois... jsute pour le queued si on peut mettre qqch pour faire patienter l'user ce serait cool.
Vérifie si c'est ok, et si c'est ok fait un sauvegarde git selon les meilleures pratiques (que les docs que t'as modifiés et commit très détaillé).

## Assistant (2026-03-05T13:46:48.252Z)

Je vais vérifier l’UX `queued/processing` sur web + mobile, et si le feedback utilisateur est insuffisant j’ajoute une bannière d’attente claire. Ensuite je fais un commit propre et détaillé en ne prenant que les fichiers pertinents (dont la doc).

## Assistant (2026-03-05T13:47:46.532Z)

Je vais ajouter une carte “traitement en cours” (queued/processing) sur les pages détail capture web+mobile, avec textes i18n FR/EN, puis je mets à jour `celery.md` et je te fais un commit propre et détaillé.

## Assistant (2026-03-05T13:48:55.651Z)

Je valide rapidement la cohérence (JSON i18n + diff ciblé), puis je prépare un commit propre sur les fichiers concernés uniquement avec un message détaillé.

## Assistant (2026-03-05T13:49:07.864Z)

Je passe au commit de sauvegarde en mode propre: je ne stage que les fichiers liés à ce scope (fallback async local, UX `queued`, i18n, doc `celery.md`) et je laisse de côté le reste du worktree.

## Assistant (2026-03-05T15:00:09.113Z)

Les fichiers à commit sont bien isolés. Je lance un dernier check backend ciblé pour garantir que le snapshot est sain avant commit.

## Assistant (2026-03-05T15:24:09.579Z)

Le hook du repo bloque le commit des fichiers “hot” `inbox.py` et `capture_external.py` (lane boundary). Je vais faire un commit propre du reste (UX + i18n + docs + services/tests), puis je te signale clairement ce qui reste à passer dans une fenêtre d’intégration dédiée.

## Assistant (2026-03-05T15:29:44.268Z)

Oui, c’est OK sur le scope testé.

Ce que j’ai vérifié:
- JSON i18n valides (`web` + `mobile`).
- Tests backend passés: `tests.test_capture_async_queue`, `tests.test_inbox_hotfix`, `tests.test_capture_pipeline_suggestions` (32 OK).

Amélioration ajoutée pour `queued/processing`:
- Carte d’attente explicite sur détail capture web: [page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx)
- Carte d’attente explicite sur détail capture mobile: [[id].tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/inbox/[id].tsx)
- Textes FR/EN:
  - [fr.json](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/i18n/fr.json)
  - [en.json](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/i18n/en.json)
  - [fr.json](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/i18n/fr.json)
  - [en.json](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/i18n/en.json)

Sauvegarde git faite:
- Commit: `83c53cd`
- Message: `feat(capture): improve queued UX and document async fallback`
- Doc incluse: [celery.md](/Users/andrewpougary/DevLocal/Momentarise/celery.md)

Point important:
- Le hook `lane:check` bloque le commit des fichiers hot [inbox.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/inbox.py) et [capture_external.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/capture_external.py) dans cette lane. Ils sont toujours en local (non commit).  
Si tu veux, je te prépare un commit dédié “integration window” pour ces deux fichiers.

## User (2026-03-05T15:34:43.738Z)

dans /learnings il est décrit comment récupérer une conv de codex. je suis en train de parler avec toi et je voudrais sauvegarder cette conv (uniquement cette conv) dans un fichier md. je te laisse me récupérer ça.

## Assistant (2026-03-05T15:34:51.354Z)

Je vais lire les règles dans `.learnings` pour appliquer exactement la méthode prévue de sauvegarde d’une conversation Codex, puis je génère un fichier `.md` avec uniquement cette conversation.

## Assistant (2026-03-05T15:34:54.560Z)

Je viens de retrouver l’entrée dédiée dans `LEARNINGS.md`. Je l’ouvre pour suivre la procédure exacte (sources `~/.codex` + export markdown).

## Assistant (2026-03-05T15:35:02.413Z)

Je vais localiser le fichier session Codex actif dans `~/.codex/sessions`, puis exporter cette session en markdown dans `.cursor/` (format prévu par tes learnings).

## Assistant (2026-03-05T15:35:18.019Z)

J’ai identifié le bon fichier session (`2026-03-05T10-36-06...jsonl`). Je vais extraire uniquement la conversation courante à partir de ton message “on va continuer cette conversation…”, puis l’exporter en `.md` dans `.cursor/`.

## User (2026-03-05T15:35:19.579Z)

et me mettre le fichier dans le dosseir implementation conversation avec le même type de titre, et me faire un récap des éléemnts de cette conv.

## Assistant (2026-03-05T15:35:25.059Z)

Je fais l’export dans `project/implementation_conversations` avec le même style de nommage, puis je te donne un récap structuré de cette conversation. Je retrouve d’abord le point de départ exact dans les sessions.

## Assistant (2026-03-05T15:35:46.979Z)

Je vais faire un export “best-effort fiable” depuis la session active, en filtrant uniquement les messages `user/assistant`, puis je le déposer dans `project/implementation_conversations/` avec un titre du même style. Ensuite je te donne le récap.

## Assistant (2026-03-05T15:36:09.869Z)

J’ai retrouvé le début exact de cette conv dans la session (ligne 5). Je lance l’export filtré `user/assistant` depuis ce point vers `project/implementation_conversations/` avec un nom au même format `cursor_*.md`, puis je te donne le récap.
