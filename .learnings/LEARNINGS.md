# LEARNINGS — Corrections, knowledge gaps, bonnes pratiques

Format : `## [LRN-YYYYMMDD-XXX] category` + Summary, Details, Suggested Action, Metadata.
Voir `project/docs/self-improvement.md` pour le détail des champs et la promotion vers CLAUDE.md / AGENTS.md.

---

## [LRN-20260228-005] knowledge_gap — Barre d’onglets custom (Expo Router + bottom-tabs) : screenOptions.tabBar ignoré

**Logged**: 2026-02-28
**Priority**: high
**Status**: resolved
**Area**: mobile / navigation

### Summary
Avec Expo Router et `@react-navigation/bottom-tabs`, l’option `screenOptions.tabBar` (fonction qui renvoie un composant de barre personnalisé) n’est pas transmise à la vue : la barre par défaut est toujours affichée.

### Details
- Le Navigator (createBottomTabNavigator) ne transmet pas `screenOptions` à `BottomTabView` ; il ne passe que `...rest`, `state`, `navigation`, `descriptors`. La prop `tabBar` provient donc uniquement du défaut (`renderTabBarDefault`).
- Conséquence : une barre d’onglets entièrement custom via `tabBar: (props) => <CustomTabBar ... />` dans `screenOptions` ne s’affiche jamais ; l’utilisateur voit la barre native avec les options par écran (tabBarIcon, tabBarButton, etc.).
- Pour un bouton central type « créer » (ex. +) : le rendre via l’onglet "create" avec `tabBarIcon` (cercle + icône) et `tabBarButton` (onPress → ouvrir l’overlay au lieu de naviguer). Optionnel : `tabBarItemStyle: { minWidth: 88 }` et padding horizontal autour de l’icône pour un peu plus d’espace.

### Suggested Action
Ne pas tenter de remplacer toute la barre par un composant custom via `screenOptions.tabBar`. Utiliser la barre par défaut et personnaliser l’onglet create avec `tabBarIcon` + `tabBarButton`. Voir `apps/mobile/app/(tabs)/_layout.tsx`.

### Metadata
- Related Files: `apps/mobile/app/(tabs)/_layout.tsx`, `@react-navigation/bottom-tabs` (createBottomTabNavigator.js, BottomTabView.js)
- See also: `project/docs/mobile-navigation-diagnostic.md`

---

## [LRN-20260228-004] best_practice — Scroll page chat / dashboard (Next.js flex chain)

**Logged**: 2026-02-28
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Sur une page type chat (header + zone scrollable + input fixe), si tout le contenu (y compris header et input) défile, c’est que la hauteur n’est pas contrainte dans la chaîne flex du layout.

### Details
- Un wrapper `flex-1 min-h-0 overflow-hidden` sur la page seule ne suffit pas : le parent (contenu du layout) et au-dessus doivent aussi permettre au flex de « rétrécir ». Sinon `flex-1` prend tout l’espace mais le contenu pousse et c’est toute la page qui scroll.
- **Chaîne à respecter** : (1) Racine dashboard = hauteur viewport fixe (`h-svh overflow-hidden` sur le wrapper du SidebarProvider, pas seulement `min-h-svh`). (2) SidebarInset et la div de contenu du layout avec `min-h-0` pour que les enfants `flex-1` puissent avoir une hauteur bornée. (3) Zone de contenu du layout en `overflow-auto` pour que les pages longues (Today, Inbox) scrollent dans cette zone. (4) Page chat (et sync) : wrapper `flex-1 min-h-0 overflow-hidden` ; seul le bloc conversation (ex. StickToBottom / Conversation) a le scroll.

### Suggested Action
Pour toute nouvelle page « plein écran » avec zone scrollable (chat, éditeur, etc.) : vérifier que le layout dashboard a bien `h-svh overflow-hidden` en racine, `min-h-0` sur SidebarInset et sur la div qui wrap `{children}`, et que la page elle-même a un wrapper `flex-1 min-h-0 overflow-hidden` avec le scroll uniquement dans le composant dédié.

### Metadata
- Related Files: `apps/web/src/components/ui/sidebar.tsx`, `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/chat/page.tsx`, `apps/web/src/components/chatbot.tsx`
- See also: sync page (même pattern), Conversation / StickToBottom (ai-elements)

---

## [LRN-20260227-001] correction — Timeline mobile (layout et UX)

**Logged**: 2026-02-27
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Écran Timeline mobile : zone vide inutile sous la grille, overlay redondant « Aucun événement ce jour », pas d’indicateur de jour au swipe horizontal.

### Details
- Grille en hauteur fixe 360 + ScrollView flex-1 avec titre/liste → sans events, grand vide en bas.
- Overlay centré sur la grille redondant ; swipe horizontal sans feedback de date.

### Suggested Action
Appliqué : Timeline en flex-1, header « Timeline — {currentDate} » avec `CalendarProvider.onDateChanged`, ScrollView liste uniquement si `events.length > 0`, suppression overlay, `numberOfDays: 1` et `scrollToNow`.

### Metadata
- Related Files: `apps/mobile/app/(tabs)/timeline.tsx`
- Voir aussi: `project/docs/self-improvement.md` (section Corrections récentes)

---

## [LRN-20260228-001] best_practice — Récupération et export des conversations Codex (extension openai.chatgpt)

**Logged**: 2026-02-28
**Priority**: high
**Status**: pending
**Area**: config / tooling

### Summary
Où sont stockées les convs de l’extension Codex, comment les exporter en markdown, et que la suppression des caches Cursor ne les touche pas.

### Details
- **Extension** : Codex = `openai.chatgpt` (displayName « Codex – OpenAI's coding agent »). Données **hors** Cursor : tout est dans `~/.codex/`.
- **Stockage** : `~/.codex/state_5.sqlite` (threads, jobs, logs), `~/.codex/archived_sessions/*.jsonl` (sessions archivées), `~/.codex/sessions/YYYY/MM/DD/*.jsonl` (sessions en cours). Une session « en cours » peut être modifiée jusqu’à la dernière utilisation (ex. session du 23 fév mise à jour le 28 fév).
- **Réparer le panneau** : supprimer uniquement `~/Library/Application Support/Cursor/Service Worker`, `Cache`, `Code Cache` — **aucun impact** sur `~/.codex/`. Corriger si besoin `~/.codex/config.toml` (TOML valide, pas de typo type `[mcp_servers.stiitch]` → `stitch`).
- **Export jsonl → markdown** : chaque ligne = JSON avec `type` (session_meta, response_item) et `payload`. Pour `response_item`, `payload.content` = liste de blocs `{ type: "input_text", text: "..." }`. Script d’extraction utilisé : parcourir les lignes, émettre `# Session`, `## User` / `## Assistant` et le texte extrait ; option de troncature au-delà de N caractères par bloc.

### Suggested Action
- Sauvegardes exportées dans `.cursor/codex-export-*.md` (ex. `codex-export-momentarise-2026-02-23-ongoing.md`).
- En cas de panneau Codex bloqué après reload : redémarrer Cursor → si besoin vider Service Worker / Cache / Code Cache (Cursor fermé), puis rouvrir.

### Metadata
- Related: `~/.codex/`, `.cursor/codex-export-*.md`
- Voir aussi: GitHub openai/codex #2923 (config.toml TOML vs JSON, caches webview)

---

## [LRN-20260228-002] product — Onboarding à définir

**Logged**: 2026-02-28
**Priority**: medium
**Status**: pending
**Area**: product / UX

### Summary
L’app nécessite une stratégie d’onboarding claire (étapes, contenu, moment d’apparition, conversion) pour éviter une première session confuse.

### Details
- Le login est en place mais aucun parcours guidé n’existe après l’auth.
- Risque: utilisateur sans contexte produit (Timeline/Inbox/Sync).

### Suggested Action
Définir un onboarding minimal (1–3 écrans) + checklist première action (ex: créer une capture, ouvrir Timeline) avant d’enrichir.

### Metadata
- Related Files: `apps/mobile/app/login.tsx`, `apps/mobile/app/(tabs)/today.tsx`
- See also: `project/docs/self-improvement.md`

---

## [LRN-20260228-003] correction — DateTimePicker manquant casse le bundling Expo

**Logged**: 2026-02-28
**Priority**: high
**Status**: pending
**Area**: mobile / build

### Summary
Le bundler Expo échoue si `@react-native-community/datetimepicker` n’est pas installé alors qu’il est importé (EventSheet).

### Details
- Erreur: `Unable to resolve "@react-native-community/datetimepicker"`.
- En environnement offline, `npx expo install` échoue si le registry npm est inaccessible.

### Suggested Action
Installer en online: `cd apps/mobile && npx expo install @react-native-community/datetimepicker`.
Prévoir un fallback si offline (picker simple sans dépendance native).

### Metadata
- Related Files: `apps/mobile/components/EventSheet.tsx`, `apps/mobile/package.json`
- See also: logs Expo (bundling failed)

---

## [LRN-20260228-004] best_practice — Guardrails de lane en multi-agents

**Logged**: 2026-02-28
**Priority**: high
**Status**: applied
**Area**: process / repo

### Summary
Quand plusieurs agents modifient Sync/Capture/InBox en parallèle, il faut un garde-fou automatique qui bloque les commits hors lane.

### Details
- Mise en place d’un check red-zone (`scripts/check-lane-boundary.mjs`) basé sur `git diff --name-only --cached`.
- Les fichiers hot-path Sync/Capture/InBox sont explicitement listés et bloquent le commit.
- Hook git local versionné: `.githooks/pre-commit` + activation via `git config core.hooksPath .githooks`.

### Suggested Action
Conserver la red-zone à jour selon les ownerships de sprint, et exiger `npm run lane:check` avant merge sur branche d’intégration.

### Metadata
- Related Files: `scripts/check-lane-boundary.mjs`, `.githooks/pre-commit`, `README.md`

## [LRN-20260302-001] Déploiement Render & Vercel MCP

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Liaison sécurisée entre Render (Backend) et Vercel (Frontend), plus intégration des serveurs MCP.

### Details
- **Render Database Sync** : Pousser un fichier `render.yaml` ne suffit pas, il faut manuellement lancer un "Blueprint Sync" dans Render pour que l'infrastructure fantôme soit allouée. En l'absence de ça, créer la base manuellement via l'API Render reste nécessaire.
- **Asyncpg & Postgres URL** : Render donne des URL `postgres://` alors que SQLAlchemy/Asyncpg exige `postgresql+asyncpg://`. Le Pydantic `field_validator` sur Pydantic settings est indispensable.
- **MCP Vercel** : L'intégration MCP Vercel fonctionne parfaitement avec le package `@mistertk/vercel-mcp`, ce qui permet d'éditer les `API_URL` à la volée.

### Suggested Action
- Toujours vérifier le statut du déploiement Blueprint côté Render.
- Documenter l'usage des MCP en local pour administrer Vercel (`mcp_config.json`).

---

## [LRN-20260302-002] Trousse de secours de migration Render

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Dangers d'une base de données neuve (authentification) et blocages réseau par défaut sur Render.

### Details
- Il est très facile d'oublier lors d'un déploiement que provisionner une infra neuve requiert de migrer les données initiales ("Invalid credentials" 401). Le check de santé API n'est qu'un indicateur de boot, pas de validité relationnelle.
- Render protège ses PostgreSQL cloud par des listes statiques d'IPs. La modification programmatique se fait via le endpoint d'update `PATCH /v1/postgres/{id}` et non `PUT`.
- Lors d'une connexion `psql` shell direct vers la DB Cloud, `PGSSLMODE=require` est obligatoire sous peine de fin de session SSL inattendue.

### Suggested Action
- Toujours vérifier ou automatiser le remplissage d'une base de données fraîchement déployée (seeders ou migration locale).
- Ne pas laisser `0.0.0.0/0` dans le IP Allow List d'une DB Render après une intervention locale (rétablir en `[{"cidrBlock": ".../32"}]` ou `[]`).

---

## [LRN-20260302-003] best_practice — KeyboardAvoidingView et Absolute Positioning dans un Chat

**Logged**: 2026-03-02
**Priority**: medium
**Status**: resolved
**Area**: mobile / layout

### Summary
L'utilisation de `position: absolute` pour ancrer un input (Composer) en bas de l'écran entre en conflit avec le fonctionnement du `KeyboardAvoidingView` sur React Native.

### Details
- Quand le `KeyboardAvoidingView` pousse le contenu pour laisser la place au clavier iOS, il modifie la taille de son conteneur principal.
- Si le champ de texte est en `absolute bottom-0`, il sort du flux du layout et reste ancré au bas de l'écran global, se retrouvant caché par le clavier au lieu de remonter avec lui.
- Cette erreur imposait aussi d'ajouter de très gros `paddingBottom` (ex: 80+) artificiels sur la FlatList de la conversation pour que les derniers messages ne se cachent pas derrière l'input fixe en absolu.
- **La vraie solution** : Placer la FlatList (`flex-1`) et l'input (Composer) l'un en-dessous de l'autre dans un flex classique (sans `absolute`). Quand le clavier s'ouvre, la liste rétrécit, le composer remonte, et un simple `paddingBottom: 0` suffit pour la liste.

### Suggested Action
Toujours préférer une disposition flex en colonne (`flex-1` pour la liste, layout naturel sans absolu pour le chat input) au sein du `KeyboardAvoidingView` pour obtenir un comportement fluide et robuste avec le clavier, exactement comme l'expérience native.

---

## [LRN-20260302-003] Explicit SQLAlchemy ForeignKeys are Mandatory
**Logged**: 2026-03-02T20:34:46.374684+00:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
When defining relationships in SQLAlchemy 2.0 with type hints (`Mapped[...]`), foreign key constraints must be strictly and correctly declared.

### Details
If the parent table (`Workspace`) declares a relationship like `projects: Mapped[list["Project"]] = relationship()`, the child table (`Project`) **must** have a column explicitly marked with `ForeignKey("workspaces.id")`. Leaving it as a plain `UUID` without a foreign key constraint causes immediate crashes on API startup (`InvalidRequestError`) during mapper configuration.

### Suggested Action
Always verify `ForeignKey` metadata when defining new models linked to a `Workspace` or `Project`, and pair it with a bidirectional `relationship(back_populates="...")`.
---
## [LRN-20260302-001] correction
**Logged**: 2026-03-02T21:43:27+01:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Incorrect imports for `get_workspace_id` and `get_current_user` in new API routes, and missing explicit `ForeignKey` in SQLAlchemy models.

### Details
- **Imports:** I assumed the paths for dependency properties like `get_current_user` and `get_workspace` (`src.core.security` and `src.api.context`) which actually reside under `src.core.deps`. This crashed `uvicorn` on startup. 

---

## [LRN-20260303-001] correction — Inbox/Capture product semantics (note directe, apply aval, restore interdit)
**Logged**: 2026-03-03T12:00:00+01:00
**Priority**: high
**Status**: applied
**Area**: product / inbox / capture

### Summary
Les décisions produit Inbox/Capture imposent une sémantique stricte: note créée = item direct dans Inbox, `Apply` exécute une action aval IA (pas une création d’item), suppression finale sans restore, et menu d’actions complet visible avec actions secondaires atténuées.

### Details
- Éviter de maintenir un flux \"process\" séparé qui recrée un item.
- Éviter toute UX \"undo restore\" pour les captures supprimées.
- Afficher l’ensemble du menu `...` avec statut visuel clair pour les actions non encore actives.

### Suggested Action
Conserver ces règles comme contrat produit de référence pour tous les prochains lots Inbox/Capture (web + mobile + API), et bloquer les regressions via tests de contrat (410 restore/process, apply sans duplication d’item).
- **Database Modeling:** When declaring relationships to the `Workspace` table from the `Project` and `Series` SQLAlchemy models, I included the `Mapped[uuid.UUID]` definition but failed to attach explicitly the `ForeignKey("workspaces.id")` constraint. SQLAlchemy cannot magically infer these connections without the explicit FK declarations, leading to an ORM mapping failure. 

### Suggested Action
- Always verify the location of core dependencies like `get_current_user` in `src.core.deps` rather than guessing directory structures. Take 10 seconds to `grep` for existing usages.
- When creating new SQLAlchemy models that reference an existing parent (`Workspace`), absolute certainty applies: the column mapping MUST contain the `ForeignKey('table.id')` declaration, not just an index boolean.
- Always monitor the active `uvicorn` and `alembic` terminal windows to catch import errors or mapping failures immediately before considering the task complete.
---

## [LRN-20260303-001] best_practice — Glassmorphism Chat Composer (KeyboardAvoidingView & Absolute)
**Logged**: 2026-03-03
**Priority**: medium
**Status**: resolved
**Area**: mobile / layout

### Summary
Obtenir un chat type "Glassmorphism" (le Composer flotte par-dessus les messages qui scrollent en dessous) demande une intégration spécifique avec `KeyboardAvoidingView`.

### Details
- Mettre le Composer en `absolute` à l'intérieur du `KeyboardAvoidingView` peut causer des bugs : si positionné sur l'écran global, il ne remontera pas avec le clavier iOS. 
- L'astuce : Créer une `<View className="flex-1">` enfant *directement* dans le `KeyboardAvoidingView`.
- Placer le Composer en `absolute bottom-0` **à l'intérieur** de cette View enfant. Ainsi, il flotte visuellement au-dessus des messages de la liste.

### Suggested Action
Toujours encapsuler les layouts absolus dans un conteneur flex interne (`flex-1`) au sein du `KeyboardAvoidingView`.

---

## [LRN-20260303-002] correction — React Keys & Markdown Streaming Animation
**Logged**: 2026-03-03
**Priority**: high
**Status**: resolved
**Area**: mobile / reanimated

### Summary
Les animations `FadeIn` sur des mots (streaming) provoquent des flashs si les clés React sont instables.

### Details
- L'algorithme déduisait la `key` du type de syntaxe. L'arrivée d'un caractère de formatage modifiait le type des mots passés et invalidait les clés, générant un flash.
- L'utilisation de `delay(index * 20)` figeait la fin des très longues réponses.

### Suggested Action
Utiliser un compteur pur (ex: `{keyPrefix}-${part++}`) pour les clés et supprimer le délai pour un FadeIn.

---

## [LRN-20260303-003] correction — KeyboardAvoidingView et keyboardVerticalOffset en mode padding
**Logged**: 2026-03-03
**Priority**: high
**Status**: resolved
**Area**: mobile / layout

### Summary
L'utilisation de `keyboardVerticalOffset` sur un `KeyboardAvoidingView` peut créer un vide au-dessus du clavier.

### Details
- Définir `keyboardVerticalOffset={50}` pour compenser la hauteur du header va *s'ajouter* à la translation du clavier iOS si la vue est déjà bien placée (sous le header).
- Résultat : le padding appliqué repousse le contenu beaucoup trop haut.

### Suggested Action
Gardez `keyboardVerticalOffset={0}` si le conteneur démarre pile au bon endroit.

---

## [LRN-20260304-001] correction — Bouton de scroll chat au-dessus du composer

**Logged**: 2026-03-04
**Priority**: low
**Status**: pending
**Area**: frontend

### Summary
Déplacement naïf du contenu (padding-bottom) pour faire apparaître le bouton de scroll au-dessus du composer au lieu de traiter uniquement la position absolue du bouton.

### Details
- J’ai d’abord envisagé d’ajouter un gros `padding-bottom` sur le conteneur de conversation, ce qui aurait poussé l’historique vers le haut et changé la perception de la scroll-area.
- La bonne approche est de garder le layout inchangé (contenu qui passe derrière le composer) et de repositionner uniquement le bouton de scroll (`bottom-[8rem]` + `z-20`) pour qu’il flotte visuellement au-dessus du composer.

### Suggested Action
Pour ce pattern (chat + composer overlay) : ne pas toucher au flux du contenu pour corriger un overlay ; ajuster uniquement la position/z-index de l’élément overlay (ici le bouton de scroll) et tester sur plusieurs hauteurs de fenêtre.

### Metadata
- Related Files: `apps/web/src/components/ai-elements/conversation.tsx`, `apps/web/src/components/sync-chat/composer.tsx`, `apps/web/src/components/sync-chat/conversation-view.tsx`

---

## [LRN-20260304-002] correction — SSoT projet: la spec Phase 1 n'est plus la référence active

**Logged**: 2026-03-04
**Priority**: high
**Status**: applied
**Area**: process / product

### Summary
La spec `Phase 1` ne doit plus être traitée comme source de vérité unique pour les chantiers Sync/Chat actuels.

### Details
- J’ai initialement repris la convention historique (`project/specs/Spécifications Techniques Phase 1.md`) comme SSoT.
- Correction utilisateur explicite: cette spec est désormais dépassée pour le scope en cours.
- Risque associé: implémenter des règles obsolètes et ralentir le delivery.

### Suggested Action
Pour les lots actifs Sync/Chat, prioriser l’état réel du code + plans opérationnels récents du repo (`.cursor/plans` et conversations d’implémentation) avant toute référence à la spec Phase 1.

---

## [LRN-20260306-001] best_practice — Celery + asyncpg doit reutiliser une loop par process
**Logged**: 2026-03-06T12:10:10+01:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Dans les tasks Celery sync, `asyncio.run(...)` par invocation casse la compatibilite asyncpg/SQLAlchemy via des erreurs de loop et de transaction concurrente.

### Details
Le worker prefork executait des coroutines via une nouvelle event loop a chaque task. Avec des sessions/pools async reutilises, cela a produit:
- `Future attached to a different loop`
- `cannot perform operation: another operation is in progress`

La solution stable est d'utiliser une loop persistante par process worker pour toutes les tasks async sync.

### Suggested Action
Standardiser un helper de runner async pour les tasks Celery sync et eviter `asyncio.run` dans les handlers de tasks recurrentes.

### Metadata
- Related Files: `apps/api/src/worker/tasks/capture_tasks.py`, `apps/api/src/worker/tasks/sync_backfill_events.py`
- See Also: `ERR-20260306-003`, `ERR-20260306-002`
---

## [LRN-20260306-002] correction — Blocks metier: set block sport, liens bidirectionnels, et simplification des surfaces Moment
**Logged**: 2026-03-06T18:35:00+01:00
**Priority**: high
**Status**: applied
**Area**: product / data

### Summary
Correction utilisateur: `set_block` doit prioriser le cas sport (sets/reps/rest) et l'UX Moment ne doit pas introduire des surfaces confuses de type `Moment > Log` / `Moment > Review` tant que le modele reste simple.

### Details
- Le besoin explicite est un bloc d'execution sport (series, repetitions, charge, repos) plutot qu'un regroupement generique ambigu.
- Le besoin de liens bidirectionnels Inbox <-> Moment et Projet/Serie <-> Moment est prioritaire.
- Le `LinkBlock` sert aux URLs externes; les liens internes doivent passer par les relations d'entites (`entity_links`).
- Proposer trop tot des onglets separes `Log` et `Review` cree de la confusion produit; mieux vaut garder `Details`, `Content`, `Coach` et structurer log/review dans `Content`.

### Suggested Action
- Redefinir `set_block` comme bloc metier sport (ou l'absorber dans `fields_block` type `exercise_sets`).
- Ajouter un `entity_ref_block` pour references internes, et persister la relation via `entity_links` dans les deux sens.
- Garder une IA d'information minimale sur Moment: tabs `Details/Content/Coach` uniquement en V1.

### Metadata
- Related Files: `project/distilled/ledger.md`, `apps/api/src/models/entity_link.py`, `apps/web/src/i18n/fr.json`
- See Also: `IDEA-0310`, `IDEA-0312`, `IDEA-0314`, `IDEA-0095`
---

## [LRN-20260306-003] correction — Sync attachments doivent rester utilisables sans dépendre du worker Celery
**Logged**: 2026-03-06T21:15:00+01:00
**Priority**: high
**Status**: pending
**Area**: backend/frontend/mobile

### Summary
Correction utilisateur: l’upload attach dans Sync semblait “partir” mais le flux restait bloqué web/mobile, avec un `+` mobile perçu comme non fonctionnel.

### Details
- L’UX attach était fragile quand les captures n’atteignaient pas rapidement l’état `ready`.
- Les captures Inbox sélectionnées étaient marquées `ready` côté UI même si leur statut réel ne l’était pas encore.
- Sur mobile, le chemin `+` dépendait d’imports dynamiques pour les pickers, plus sensible aux variations runtime.

### Suggested Action
- Forcer le traitement inline pour `source=sync_attachment` côté upload API.
- Pour la sélection Inbox (web/mobile), propager le statut réel et poller jusqu’à `ready` avant envoi.
- Éviter les imports dynamiques pour `expo-image-picker` / `expo-document-picker` dans Sync mobile.

### Metadata
- Related Files: `apps/api/src/api/v1/inbox.py`, `apps/web/src/components/sync-chat/chat-shell.tsx`, `apps/mobile/app/sync.tsx`
- See Also: `ERR-20260306-005`, `ERR-20260306-003`
---

## [LRN-20260306-004] correction — ne pas masquer les modèles Sync quand une clé provider manque
**Logged**: 2026-03-06T21:30:00+01:00
**Priority**: high
**Status**: resolved
**Area**: backend/frontend

### Summary
Correction utilisateur: l’UI Sync n’affichait plus que Mistral; masquer les autres modèles selon les clés API crée une UX confuse.

### Details
- Le registre Sync filtrait la liste des modèles visibles par providers “avec clé”.
- Résultat: la liste pouvait sembler amputée (ex: Mistral seul), sans explication claire côté UI.
- Décision: garder le catalogue visible; la disponibilité runtime est gérée au moment de l’appel modèle.

### Suggested Action
Ne pas utiliser l’état des clés API pour cacher les modèles dans `/sync/models`; gérer la validation/disponibilité au runtime avec message explicite.

### Metadata
- Related Files: `apps/api/src/sync/model_registry.py`, `apps/api/src/core/config.py`
- See Also: `ERR-20260306-005`
---

## [LRN-20260306-005] best_practice — éviter le split-brain backend local vs Docker sur le même port
**Logged**: 2026-03-06T23:20:00+01:00
**Priority**: high
**Status**: pending
**Area**: infra/devx

### Summary
Faire tourner `uvicorn --reload` et `docker compose api` en parallèle sur `:8000` crée des comportements non déterministes côté Sync.

### Details
- Selon la résolution réseau (`localhost`, `127.0.0.1`, IPv6, IP LAN), web/mobile peuvent taper des instances différentes.
- Symptôme typique: modèle list/UI incohérente, warnings provider aléatoires, “ça marchait puis ça revient”.

### Suggested Action
- Convention d’équipe: une seule source API active par environnement local.
- Soit Docker (`docker compose up -d`), soit local (`uvicorn`) sur un autre port.
- Ajouter un preflight `lsof :8000` dans la checklist debug Sync.

### Metadata
- Related Files: `docker-compose.yml`
- See Also: `ERR-20260306-006`
---

## [LRN-20260306-006] best_practice — forcer `type="button"` sur les actions UI Sync hors formulaires
**Logged**: 2026-03-06T23:55:00+01:00
**Priority**: medium
**Status**: resolved
**Area**: frontend/devx

### Summary
Des boutons Sync sans `type` explicite peuvent provoquer des submit implicites et des appels `GET` parasites vers des endpoints `POST` (ex: `/sync/runs/{id}/apply`), perçus comme des erreurs 405 intermittentes.

### Details
- Les composants `PlanTrigger` et certaines actions preview/undo n'avaient pas `type="button"` explicite.
- Dans un arbre DOM contenant un `form`, le comportement par défaut peut devenir `submit`.
- Ouvrir manuellement l’URL `.../apply` en navigateur fait toujours un `GET` et retournera légitimement `Method Not Allowed` si l’endpoint est `POST` only.

### Suggested Action
- Standardiser `type="button"` pour toutes les actions cliquables Sync non soumises à un formulaire.
- Garder la vérification réseau sur la méthode HTTP réelle dans DevTools (ne pas conclure depuis l’ouverture directe de l’URL).

### Metadata
- Related Files: `apps/web/src/components/ai-elements/plan.tsx`, `apps/web/src/components/sync-chat/preview-plan-card.tsx`, `apps/web/src/components/sync-chat/actions-rail.tsx`
- See Also: `ERR-20260306-005`
---

## [LRN-20260306-007] correction — Les écrans Stitch doivent guider la structure du studio Moment, pas seulement le style
**Logged**: 2026-03-06T23:40:26+01:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Quand l'utilisateur demande de s'inspirer des écrans Stitch, il faut reprendre la structure produit (shell, hiérarchie, cards, actions, starter flows), pas faire un simple éditeur fonctionnel légèrement poli.

### Details
- Première passe insuffisante: l'UI restait un formulaire compacté autour des blocks métiers, sans vraie surface de création.
- Correction explicite de l'utilisateur: les écrans Stitch générés étaient "largement plus propres" car ils proposaient une vraie expérience de studio (header fort, strip de métriques, cards éditoriales, actions basses / rail de création).
- La bonne interprétation est produit-first: transformer `Moment > Contenu` en studio avec preview, fullscreen web, cards compactes, starter kits, quick update et une seule card ouverte à la fois.

### Suggested Action
Pour toute demande d'alignement sur des écrans Stitch ou maquettes de référence, extraire d'abord les patterns de structure et d'interaction (layout, densité, séquences d'action, hiérarchie), puis seulement les traduire dans les composants.

### Metadata
- Related Files: `apps/web/src/components/event-calendar/event-dialog.tsx`, `apps/web/src/components/business-blocks-editor.tsx`, `apps/mobile/app/moment/[id].tsx`, `apps/mobile/components/BusinessBlocksEditor.tsx`
- See Also: `LRN-20260306-002`
---

## [LRN-20260306-008] correction — Un modal fullscreen ne l'est pas si le wrapper `DialogContent` garde un `sm:max-w-*`
**Logged**: 2026-03-06T23:46:00+01:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Pour un modal web censé occuper presque tout le viewport, il faut vérifier les contraintes de largeur du composant `DialogContent` lui-même, pas seulement ajouter une classe de largeur côté usage.

### Details
- Correction explicite de l'utilisateur: le studio web restait trop limité en largeur malgré une classe locale large.
- Cause réelle: `apps/web/src/components/ui/dialog.tsx` impose aussi un `sm:max-w-100`, qui continue de contraindre le modal au breakpoint `sm` si le consumer ne le neutralise pas explicitement.
- Effet secondaire détecté en même temps: Radix exige un `DialogTitle` pour l'accessibilité, même si le header visuel du contenu semble suffire.

### Suggested Action
Sur tout modal fullscreen basé sur `DialogContent`, forcer aussi `sm:!max-w-*` ou `!max-w-none`, et toujours rendre un `DialogTitle` visible ou masqué (`sr-only` / `VisuallyHidden`) pour respecter l'accessibilité Radix.

### Metadata
- Related Files: `apps/web/src/components/ui/dialog.tsx`, `apps/web/src/components/event-calendar/event-dialog.tsx`
- See Also: `LRN-20260306-007`
---

## [LRN-20260306-007] best_practice — vérifier mobile en mode ciblé quand `tsc` global est déjà rouge
**Logged**: 2026-03-06T23:59:00+01:00
**Priority**: medium
**Status**: resolved
**Area**: mobile/devx

### Summary
Sur ce repo mobile, `npx tsc --noEmit` global échoue sur de nombreuses erreurs historiques non liées; pour valider un patch local, filtrer les erreurs sur les fichiers touchés évite les faux diagnostics.

### Details
- Le check global a renvoyé un grand volume d’erreurs existantes (`className` RN primitives, typings infra) sans lien direct avec le lot Sync en cours.
- Le contrôle utile pour ce lot consistait à filtrer la sortie sur `app/sync.tsx` et `components/react-native-ai-elements/composer.tsx`.

### Suggested Action
Conserver un check mobile ciblé (grep des fichiers modifiés) tant que la baseline TypeScript mobile n’est pas assainie.

### Metadata
- Related Files: `apps/mobile/app/sync.tsx`, `apps/mobile/components/react-native-ai-elements/composer.tsx`
- See Also: `LRN-20260306-006`
---

## [LRN-20260307-001] best_practice — éviter les régressions Sync modèles via endpoint unique + routage résilient
**Logged**: 2026-03-07T00:35:00+01:00
**Priority**: high
**Status**: resolved
**Area**: backend/infra/frontend

### Summary
Les régressions "modèles manquants" + fallback IA peuvent revenir si plusieurs backends répondent sur le port 8000 ou si un modèle sélectionné n’a plus de clé provider active.

### Details
- Symptôme récurrent observé: liste Sync incohérente et avertissement de fallback lié aux clés provider.
- Cause opérationnelle fréquente: split-brain local (`docker` + `uvicorn`) sur `:8000`.
- Durcissement appliqué:
  - `resolve_auto_model` ne force plus artificiellement Mistral sans clé.
  - `LiteLLMClient` reroute vers un modèle auto key-routable avant de tomber sur le fallback textuel.
  - Defaults API web/mobile passés à `127.0.0.1` pour éviter les ambiguïtés IPv4/IPv6 sur `localhost`.

### Suggested Action
Avant debug Sync modèles: exécuter `lsof -nP -iTCP:8000 -sTCP:LISTEN`, garder une seule instance backend active, puis vérifier `/api/v1/sync/models` et un run `auto`.

### Metadata
- Related Files: `apps/api/src/sync/model_registry.py`, `apps/api/src/sync/litellm_client.py`, `apps/web/src/lib/constants.ts`, `apps/mobile/lib/api.ts`
- See Also: `ERR-20260306-006`
---

## [LRN-20260307-002] best_practice — les zones scrollables en modal flex/grid exigent une chaîne complète `min-h-0` / `min-w-0`
**Logged**: 2026-03-07T11:10:00+01:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Dans un studio web construit en modal avec grille + flex imbriqués, le scroll du canvas principal ne fonctionne correctement que si chaque conteneur intermédiaire autorise explicitement la contraction avec `min-h-0` et `min-w-0`.

### Details
- Correction explicite de l'utilisateur: bug de scroll dans `Moment > Contenu`.
- Cause: la chaîne `DialogContent -> body grid -> colonne principale -> editor` contenait bien `overflow-hidden` / `overflow-y-auto`, mais pas toutes les contraintes de sizing nécessaires.
- Effet: le canvas des blocks pouvait se retrouver mal scrollable ou se comporter de façon incohérente selon la largeur et la hauteur du modal.
- Correctif appliqué: ajout de `min-h-0` et `min-w-0` sur la grille principale, la colonne de contenu et la racine scrollable de `BusinessBlocksEditor`.

### Suggested Action
Sur toute surface scrollable complexe (modal, split view, inspector, studio), vérifier systématiquement la chaîne complète de conteneurs avant de retoucher les dimensions ou de bricoler le CSS du child scrollable.

### Metadata
- Related Files: `apps/web/src/components/event-calendar/event-dialog.tsx`, `apps/web/src/components/business-blocks-editor.tsx`
- See Also: `LRN-20260306-008`
---

## [LRN-20260307-003] best_practice — un studio de contenu doit hériter des tokens du thème et rester plus dense que son inspiration visuelle
**Logged**: 2026-03-07T11:28:00+01:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Quand une UI interne s’inspire d’une maquette Stitch, il faut reprendre la hiérarchie et les patterns d’interaction, pas copier les accents visuels ou la densité brute du mock.

### Details
- Correction explicite de l'utilisateur: header modal trop gros, accents verts hors thème principal, cards de blocks trop volumineuses.
- La première implémentation gardait des classes `emerald-*` hardcodées et une densité trop proche d’un mock marketing mobile, ce qui mangeait l’espace utile du canvas sur desktop.
- Correction appliquée: retour aux tokens `primary/accent/border/background`, header compacté, input IA en tête, cards de blocks resserrées avec état actif/inactif plus sobre.

### Suggested Action
Pour toute surface studio interne, valider d’abord trois contraintes avant polish: 1) palette = tokens du thème, 2) header < 25% de la hauteur utile, 3) état replié des cartes assez dense pour approcher un form-builder type Tally.

### Metadata
- Related Files: `apps/web/src/components/event-calendar/event-dialog.tsx`, `apps/web/src/components/business-blocks-editor.tsx`
- See Also: `LRN-20260306-007`, `LRN-20260307-002`
---

## [LRN-20260307-004] best_practice — dans un drawer tabbé, le scroll doit appartenir à l’onglet actif, pas au conteneur global
**Logged**: 2026-03-07T11:43:00+01:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Pour un panneau latéral avec tabs et footer fixe, laisser `SidebarContent` scroller globalement crée des conflits de hauteur; chaque onglet doit gérer son propre scroll.

### Details
- Symptôme utilisateur: bug de scroll persistant dans l’onglet `Contenu`.
- Cause: `SidebarContent` portait un `overflow-auto` global alors que `details`, `content` et `coach` avaient des comportements de hauteur différents, avec un footer positionné en bas de colonne.
- Correctif appliqué: `SidebarContent` est forcé en `overflow-hidden`, chaque onglet devient `min-h-0 flex-1 overflow-y-auto`, et le footer devient `shrink-0`.

### Suggested Action
Sur toute UI "tabs + footer fixe" dans un panneau, attribuer le scroll au body de chaque tab dès le départ plutôt qu’au wrapper partagé.

### Metadata
- Related Files: `apps/web/src/components/event-calendar/event-dialog.tsx`
- See Also: `LRN-20260307-002`
---
