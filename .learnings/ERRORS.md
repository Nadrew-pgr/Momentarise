# ERRORS — Échecs de commandes, exceptions

Format : `## [ERR-YYYYMMDD-XXX] contexte` + Summary, Error, Context, Suggested Fix, Metadata.
Voir `project/docs/self-improvement.md` pour le détail.

---
## [ERR-20260228-001] Ligne h15 visible dans la grille FullCalendar (timegrid)

**Logged**: 2026-02-28
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Les lignes à 6:15, 7:15, etc. restaient visibles alors qu’on ne voulait que les lignes d’heures pleines (comme Coss).

### Error
Rendu visuel : une bordure horizontale apparaissait à chaque quart d’heure, en plus des lignes à 6h, 7h, 8h.

### Context
- Règle globale `.calendar-parity .fc .fc-scrollgrid-section-body td` appliquait `border-width: 0 1px 1px 0` à toutes les cellules du corps de la grille, y compris les cellules de créneaux horaires (`.fc-timegrid-slot`).
- Les règles `.fc-timegrid-slot { border-width: 0 }` et `.fc-timegrid-slot-minor { border-top: none }` ne suffisaient pas : la spécificité de `td` dans la règle scrollgrid l’emportait pour la bordure basse.

### Suggested Fix
Cibler explicitement les cellules de créneaux pour annuler la bordure basse :
`.calendar-parity .fc .fc-scrollgrid-section-body td.fc-timegrid-slot { border-bottom-width: 0 !important; }`
Pour la colonne des horaires (effet « tableau ») : retirer bordure droite et basse sur `.fc-timegrid-axis` et `.fc-timegrid-slot-label`.

### Metadata
- Related Files: `apps/web/src/app/globals.css` (bloc `.calendar-parity`)
- See also: parité visuelle FullCalendar / Coss (lignes horaires, axe)

---

## [ERR-20260228-002] Texte événement en dehors de la carte + écritures compactées sur 10 % de la largeur

**Logged**: 2026-02-28
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Le titre de l’événement dépassait sous la carte colorée ; la carte faisait toute la largeur mais le contenu (heure + titre) était compacté sur ~10 % de la largeur, les deux textes « se battant » pour la place.

### Error
1) Débordement du texte sous le bloc de l’événement (timegrid).  
2) Carte pleine largeur mais vide : heure et titre affichés en colonne (flex-col) dans une bande étroite, le reste de la carte vide.

### Context
- FullCalendar timegrid : hauteur imposée par la durée, largeur 100 % de la colonne. Le chip (`CalendarEventChip`) en `flex-col` avec deux spans (heure, titre) chacun `truncate` ; le conteneur n’utilisait pas toute la largeur (problème de chaîne flex / min-width).
- À ne pas faire : réduire la largeur de la carte (max-width, etc.) — le problème était le layout du contenu, pas la taille de la carte.

### Suggested Fix
- Conserver `overflow: hidden`, `min-height: 0`, `height: 100%` sur `.fc-event` et `.fc-event-main` pour que le texte ne dépasse pas.
- Donner toute la largeur au contenu : `.fc-event-main` avec `width: 100%`, `min-width: 0`, `display: flex`. Chip avec `w-full`, `min-w-0`, `flex-1`.
- Une seule ligne, titre prioritaire : afficher « Titre · 8:00 - 8:15 » dans un seul `span` avec `truncate` (titre en premier pour que la troncature garde le titre). Remplacer `flex-col` par une ligne unique avec `items-center`.

### Metadata
- Related Files: `apps/web/src/app/globals.css` (`.fc-event`, `.fc-event-main`), `apps/web/src/features/calendar/ui/CalendarEventChip.tsx`
- See also: ERR-20260228-001 (parité calendrier)

---

## [ERR-20260228-003] FullCalendar slotLabelFormat callback — Invalid time value

**Logged**: 2026-02-28
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
Utiliser un callback `slotLabelFormat` (ou format de date invalide) pour les libellés d’heures dans FullCalendar provoquait une exception « Invalid time value » et empêchait l’affichage correct de l’axe horaire.

### Error
Exception / erreur de rendu liée au format des labels d’heures (axe timegrid).

### Context
- Besoin d’afficher les heures dans un format donné (parité avec Coss). Un callback ou un format incorrect passé à `slotLabelFormat` faisait planter le rendu.

### Suggested Fix
Ne pas utiliser un callback `slotLabelFormat` qui retourne une valeur invalide. Utiliser `slotLabelContent` pour contrôler le rendu des libellés d’heures (ex. composant React ou chaîne) au lieu de formater via l’API de format de date si celle-ci reçoit un type inattendu.

### Metadata
- Related Files: `apps/web/src/features/calendar/adapters/fullcalendar/FullCalendarAdapter.tsx`
- See also: parité FullCalendar / Coss (slotLabelContent)

---

## [ERR-20260228-004] Page chat / sync — toute la page défile au lieu de la zone conversation

**Logged**: 2026-02-28
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Sur les pages type chat (header + zone scrollable + input fixe), c’est toute la page qui défilait (header et input inclus) au lieu de seule la zone des messages.

### Error
Comportement UX : le viewport entier scrollait ; la zone de conversation ne restait pas contrainte en hauteur.

### Context
- Layout dashboard Next.js : un wrapper `flex-1 min-h-0 overflow-hidden` sur la page ne suffit pas si les parents (contenu du layout, SidebarInset) n’ont pas `min-h-0` et que la racine n’a pas une hauteur viewport fixe.
- Sans chaîne flex cohérente, `flex-1` prend l’espace mais le contenu pousse et tout le document scroll.

### Suggested Fix
- Racine dashboard : `h-svh overflow-hidden` sur le wrapper (pas seulement `min-h-svh`).
- SidebarInset et div de contenu du layout : `min-h-0` pour que les enfants `flex-1` puissent rétrécir.
- Zone de contenu du layout : `overflow-auto` pour les pages longues (Today, Inbox).
- Page chat/sync : wrapper `flex-1 min-h-0 overflow-hidden` ; seul le bloc conversation a le scroll.

### Metadata
- Related Files: `apps/web/src/components/ui/sidebar.tsx`, `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/chat/page.tsx`, `apps/web/src/components/chatbot.tsx`
- See also: LRN-20260228-004 (LEARNINGS)

---

## [ERR-20260227-001] Timeline mobile — zone vide, overlay redondant, pas de feedback jour au swipe

**Logged**: 2026-02-27
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Écran Timeline mobile : grand vide sous la grille, overlay « Aucun événement ce jour » redondant, swipe horizontal sans indicateur de date.

### Error
- Grille hauteur fixe 360 + ScrollView flex-1 → sans événements, zone vide inutile en bas.
- Overlay centré sur la grille en doublon.
- Swipe entre les jours sans affichage de la date courante.

### Context
- Layout Timeline : grille + liste/scroll non coordonnés ; overlay affiché même quand la liste était vide ailleurs.

### Suggested Fix
Timeline en flex-1 ; header « Timeline — {currentDate} » avec `CalendarProvider.onDateChanged` ; ScrollView liste uniquement si `events.length > 0` ; suppression de l’overlay redondant ; `numberOfDays: 1` et `scrollToNow` pour le feedback jour.

### Metadata
- Related Files: `apps/mobile/app/(tabs)/timeline.tsx`
- See also: LRN-20260227-001 (LEARNINGS)

---

## [ERR-20260228-005] Expo bundler — Unable to resolve @react-native-community/datetimepicker

**Logged**: 2026-02-28
**Priority**: high
**Status**: pending
**Area**: mobile / build

### Summary
Le bundler Expo échoue si le package `@react-native-community/datetimepicker` est importé (EventSheet) mais n’est pas installé.

### Error
`Unable to resolve "@react-native-community/datetimepicker"` (bundling failed).

### Context
- `apps/mobile/components/EventSheet.tsx` importe le picker ; le package n’était pas dans les dépendances ou pas installé.
- En offline, `npx expo install` peut échouer si le registry npm est inaccessible.

### Suggested Fix
Installer en ligne : `cd apps/mobile && npx expo install @react-native-community/datetimepicker`. Prévoir un fallback (picker simple sans dépendance native) si environnement offline.

### Metadata
- Related Files: `apps/mobile/components/EventSheet.tsx`, `apps/mobile/package.json`
- See also: LRN-20260228-003 (LEARNINGS)

---

## [ERR-20260228-006] Vue calendrier web non persistée — retour à « mois » en revenant sur la page

**Logged**: 2026-02-28
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
En quittant la page Calendrier puis en y revenant, la vue retombait toujours sur « mois » au lieu de conserver la dernière vue (jour / semaine / mois).

### Error
Comportement : perte de la vue sélectionnée (ex. « semaine » ou « jour ») à chaque navigation.

### Context
- FullCalendar initialisé avec une vue par défaut ; aucun stockage de la vue courante.
- Demande de parité avec une attente « persister la vue ».

### Suggested Fix
Persister la vue dans `localStorage` (ex. clé `momentarise-calendar-view`) : lecture au montage avec `getStoredCalendarView()`, écriture dans `handleViewChange`. Passer la vue stockée (ou défaut) à l’option `initialView` / `view` du calendrier.

### Metadata
- Related Files: `apps/web/src/features/calendar/adapters/fullcalendar/FullCalendarAdapter.tsx`
- See also: ERR-20260228-001 (parité calendrier)

---

## [ERR-20260228-007] Colonne horaires FullCalendar — effet « tableau » (bordures)

**Logged**: 2026-02-28
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
La colonne des horaires (axe timegrid) avait l’apparence d’un tableau (bordures droite et basse sur chaque cellule), alors qu’on visait un rendu plus épuré type Coss.

### Error
Rendu visuel : bordures visibles autour des cellules d’heure donnant un effet grille/tableau marqué.

### Context
- Les cellules de l’axe (`.fc-timegrid-axis`, `.fc-timegrid-slot-label`) recevaient les mêmes bordures que le reste de la grille (`border-width: 0 1px 1px 0`).

### Suggested Fix
Retirer bordure droite et basse sur la colonne des horaires : `.calendar-parity .fc .fc-timegrid-axis, .calendar-parity .fc .fc-timegrid-slot-label { border-right-width: 0 !important; border-bottom-width: 0 !important; }`.

### Metadata
- Related Files: `apps/web/src/app/globals.css` (bloc `.calendar-parity`)
- See also: ERR-20260228-001 (ligne h15, même bloc)

---

## [ERR-20260302-001] Render API - OperationalError (Connection Refused)

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
L'API a échoué à démarrer sur Render car `DATABASE_URL` essayait de se connecter à localhost (`127.0.0.1:5432`) au lieu de la base interne PostgreSQL.

### Error
```
[Errno 111] Connect call failed ('::1', 5432, 0, 0)
sqlalchemy.exc.OperationalError: (auto_explain) [Errno 111]
```

### Context
- L'URL de la base n'était pas injectée car le Blueprint (`render.yaml`) n'avait pas été synchronisé manuellement sur le dashboard.
- Render instancie des bases de données de type `postgres://` qui ne sont pas supportées nativement par `asyncpg` sans conversion.

### Suggested Fix
1. Provisionner la base de données PostgreSQL séparément.
2. Ajouter un validateur pydantic dans `config.py` pour remplacer `postgres://` par `postgresql+asyncpg://` à la volée.
3. Injecter l'Internal DB URL correctement.

### Metadata
- Related Files: `apps/api/src/core/config.py`

---

## [ERR-20260302-002] Vercel Build - TypeScript dangerouslySetInnerHTML 

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Le déploiement Vercel a planté à l'étape "Running TypeScript" à cause d'un mismatch de type sur la prop `dangerouslySetInnerHTML` du composant `schema-display.tsx`.

### Error
```
Type error: Type 'string | number...' is not assignable to type 'string | TrustedHTML'.
dangerouslySetInnerHTML={{ __html: children ?? highlightedPath }}
```

### Context
- React 18+ strict TS typings attendent un string pur. La prop `children` était trop large.

### Suggested Fix
- Utiliser un cast explicite vers String : `dangerouslySetInnerHTML={{ __html: String(children ?? highlightedPath) }}`.

### Metadata
- Related Files: `apps/web/src/components/ai-elements/schema-display.tsx`

---

## [ERR-20260302-003] Vercel MCP - 404 SSE Error mcp-remote

**Logged**: 2026-03-02
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
Impossible de se connecter au serveur Vercel MCP via `mcp-remote` officiel (retour 404 / 405 endpoint).

### Error
```
Connection error: SseError: SSE error: Non-200 status code (404)
```

### Context
- Le serveur MCP natif Vercel requiert un token et un setup potentiellement différent.

### Suggested Fix
Utiliser le proxy communautaire `@mistertk/vercel-mcp` qui est complet via NPX en setttant la variable `VERCEL_API_KEY`.

### Metadata
- Related Files: `.gemini/antigravity/mcp_config.json`

---

## [ERR-20260302-004] Render Postgres - 401 Unauthorized (Empty Database)

**Logged**: 2026-03-02
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
L'authentification sur Vercel (Production) échouait avec un statut 401 "Invalid credentials" malgré des identifiants corrects localement.

### Error
```
401 Unauthorized - POST /api/auth/login
```

### Context
- Une nouvelle base de données de production venait d'être créée via l'API Render.
- La base était de facto totalement vide, sans les données ni les utilisateurs du container Docker local.

### Suggested Fix
1. S'inscrire à nouveau (Sign Up) sur l'environnement de production.
2. Ou effectuer un data dump de la base locale vers la base de production (`pg_dump -a` | `psql`).

### Metadata
- Related Files: `apps/web/src/app/api/auth/login/route.ts`

---

## [ERR-20260302-005] Render Postgres - SSL Connection closed unexpectedly

**Logged**: 2026-03-02
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
La tentative de migration manuelle locale vers cloud (`pg_dump | psql`) s'est soldée par un kill de connexion SSL côté serveur Render.

### Error
```
psql: error: connection to server at "dpg-d6ikkht...oregon-postgres.render.com" failed: SSL connection has been closed unexpectedly
```

### Context
- Render bloque par défaut tout le trafic IPv4 externe vers une base de données fraîchement instanciée (`ipAllowList: null`).
- L'API Render `PUT` ne met pas à jour cette liste proprement, la méthode `PATCH` est requise pour altérer les champs spécifiques comme `ipAllowList`.

### Suggested Fix
- Utiliser un call API explicite avec `PATCH` pour autoriser temporairement `0.0.0.0/0` (anywhere).
- Exécuter la migration avec la variable d'environnement `PGSSLMODE=require` activée pour `psql`.
- Rétablir l'ipAllowList à `[]` pour couper les accès externes post-migration.

### Metadata
- Related Files: `render.yaml`

---

## [ERR-20260302-005] Backend API Crash: ImportError for get_current_user and get_workspace_id
**Logged**: 2026-03-02T20:34:46.374684+00:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
The local `uvicorn` API server crashed on startup due to hallucinated module imports in the `projects` and `series` routers.

### Error
```
ImportError: cannot import name 'get_current_user' from 'src.core.security'
ModuleNotFoundError: No module named 'src.api.context'
```

### Context
- Command: `uv run uvicorn src.main:app --reload`
- Related Files: `apps/api/src/api/v1/projects.py`, `apps/api/src/api/v1/series.py`, `apps/api/src/core/deps.py`
- Issue: AI generated endpoints utilizing dependencies that didn't exist in the declared locations.

### Suggested Fix
1. Update import path for `get_current_user` to `src.core.deps`.
2. Replace `get_workspace_id` with `get_current_workspace` from `src.core.deps` and adjust the signature to expect a `WorkspaceMember` instance rather than an isolated UUID.
---

## [ERR-20260302-006] SQLAlchemy InvalidRequestError: Missing ForeignKey for Workspace relations
**Logged**: 2026-03-02T20:34:46.374684+00:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
After fixing API imports, the backend crashed during SQLAlchemy mapper initialization because it couldn't infer the join conditions for `Workspace.projects` and `Workspace.series`.

### Error
```
sqlalchemy.exc.InvalidRequestError: One or more mappers failed to initialize - can't proceed with initialization of other mappers. Triggering mapper: 'Mapper[Workspace(workspaces)]'. Original exception was: Could not determine join condition between parent/child tables on relationship Workspace.projects - there are no foreign keys linking these tables.
```

### Context
- Command: `uv run uvicorn src.main:app --reload`
- Related Files: `apps/api/src/models/project.py`, `apps/api/src/models/series.py`, `apps/api/src/models/workspace.py`
- Issue: `Project` and `Series` models had a `workspace_id` column but lacked an explicit `ForeignKey("workspaces.id")` constraint, preventing the ORM from mapping the relationships defined in the `Workspace` model.

### Suggested Fix
1. Provide explicit `ForeignKey("workspaces.id")` to `workspace_id` columns in `Project` and `Series`.
2. Ensure bidirectional relationships are defined in the child classes (`workspace: Mapped["Workspace"] = relationship(back_populates="projects")`).
---
## [ERR-20260302-001] Missing Foreign Keys and Bad Imports
**Logged**: 2026-03-02T21:43:27+01:00
**Priority**: high
**Status**: closed
**Area**: backend

### Summary
The `Project` and `Series` models crashed the ORM mapper due to missing explicit `ForeignKey` mappings on the `workspace_id` column.

### Error
```
sqlalchemy.exc.InvalidRequestError: One or more mappers failed to initialize - can't proceed with initialization of other mappers. Triggering mapper: 'Mapper[Workspace(workspaces)]'. Original exception was: Could not determine join condition between parent/child tables on relationship Workspace.projects
```
(Additionally accompanied by `Uvicorn` crash `ImportError: cannot import name 'get_workspace_id' from 'src.api.context'`).

### Context
- Command: `uv run alembic revision --autogenerate` / `uv run uvicorn src.main:app`
- Related Files: `src/models/project.py`, `src/models/series.py`, `src/api/v1/projects.py`, `src/api/v1/series.py`

### Suggested Fix
- Use `src.core.deps` for user and workspace dependency extraction.
- Provide explicit `ForeignKey("workspaces.id")` to the `workspace_id` column mapping inside the child ORM model (`Project` and `Series`).
---

## [ERR-20260304-001] Next dev — lock .next/dev/lock déjà pris
**Logged**: 2026-03-04T08:51:30Z
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
`npm run dev` sur `apps/web` échoue avec “Unable to acquire lock …/.next/dev/lock” quand une autre instance Next dev tourne déjà sur le même dossier.

### Error
```
Unable to acquire lock at .../apps/web/.next/dev/lock, is another instance of next dev running?
```

### Context
- Command: `cd apps/web && npm run dev`
- Related Files: `apps/web/.next/dev/lock`
- Observed: port 3000 occupé + lock détenu par un process `node`.

### Suggested Fix
- Identifier le PID qui détient le lock avec `lsof apps/web/.next/dev/lock`.
- Tuer uniquement ce PID (ex: `kill <pid>`) puis relancer `npm run dev`.
- Éviter `pkill -f "next dev"` pour ne pas stopper d’autres apps Next en cours.
---

## [ERR-20260304-002] Next dev — lock + port 3000 occupé
**Logged**: 2026-03-04T09:10:00Z
**Priority**: low
**Status**: pending
**Area**: frontend

### Summary
Relancer `npm run dev` sur `apps/web` échoue car une autre instance Next ou un autre process occupe déjà le port 3000 et le lock `.next/dev/lock`.

### Error
```
⚠ Port 3000 is in use by process 40815, using available port 3001 instead.
⨯ Unable to acquire lock at /Users/andrewpougary/DevLocal/Momentarise/apps/web/.next/dev/lock, is another instance of next dev running?
```

### Context
- Command: `cd apps/web && npm run dev`
- Related Files: `apps/web/.next/dev/lock`
- Observed: Next tente le port 3001 mais échoue à cause du lock déjà pris, probablement par une autre instance `next dev` sur le même dossier.

### Suggested Fix
- Vérifier s’il y a déjà un `npm run dev` pour `apps/web` dans un autre terminal et, si oui, l’utiliser ou l’arrêter proprement (Ctrl+C).
- Une fois l’ancienne instance arrêtée, relancer `npm run dev` dans `apps/web`.
- En dernier recours seulement, supprimer le fichier `.next/dev/lock` après s’être assuré qu’aucune instance `next dev` pour ce projet ne tourne encore.
---

## [ERR-20260304-001] Debug log file missing
**Logged**: 2026-03-04T09:30:00Z
**Priority**: low
**Status**: pending
**Area**: frontend

### Summary
Attempt to clear the debug log file for the current Cursor debug session failed because the file does not exist yet.

### Error
```
Error deleting file : File not found: /Users/andrewpougary/DevLocal/Momentarise/.cursor/debug-364720.log
```

### Context
- Command: Delete tool on `/Users/andrewpougary/DevLocal/Momentarise/.cursor/debug-364720.log`
- Related Files: `.cursor/debug-364720.log`
- Observed: The debug log file is not present before the first instrumented run.

### Suggested Fix
- Treat this as expected on the first run of a debug session; no manual action needed.
- Only investigate if future deletions fail when the file should already contain logs.
---

## [ERR-20260305-001] Expo mobile lance depuis la racine du monorepo
**Logged**: 2026-03-05T10:43:01+01:00
**Priority**: medium
**Status**: resolved
**Area**: mobile / tooling

### Summary
Le bundling iOS echoue avec `Unable to resolve "../../App"` quand Expo est lance depuis la racine `Momentarise/` au lieu de `apps/mobile/`.

### Error
```
Unable to resolve "../../App" from "node_modules/expo/AppEntry.js"
```

### Context
- Command: lancement Expo depuis `/Users/andrewpougary/DevLocal/Momentarise`
- Related Files: `apps/mobile/index.js`, `apps/mobile/package.json`, `package.json`
- Observed: Expo utilise `expo/AppEntry.js` (entrypoint par defaut) et cherche `../../App`, qui n'existe pas a la racine du monorepo.

### Suggested Fix
- Demarrer Expo depuis `apps/mobile` (ou via workspace npm): `npm run start -w apps/mobile`.
- Ajouter des scripts racine dedies pour eviter l'erreur de dossier (`mobile:start`, `mobile:ios`, `mobile:android`, `mobile:web`).
---

## [ERR-20260305-002] zsh glob sur route Next.js avec parenthèses et crochets
**Logged**: 2026-03-05T22:20:00+01:00
**Priority**: low
**Status**: resolved
**Area**: docs / tooling

### Summary
Une commande `sed` sur un fichier route Next.js a echoue car le chemin n'etait pas quote et zsh a interprete `()` / `[]` comme des patterns de glob.

### Error
```
zsh:1: no matches found: apps/web/src/app/(dashboard)/inbox/items/[id]/page.tsx
```

### Context
- Command: `sed -n '1,320p' apps/web/src/app/(dashboard)/inbox/items/[id]/page.tsx`
- Related Files: `apps/web/src/app/(dashboard)/inbox/items/[id]/page.tsx`
- Reproducible: yes

### Suggested Fix
Toujours quoter les chemins Next.js contenant `()` et `[]` en shell zsh, par exemple:
`sed -n '1,320p' \"apps/web/src/app/(dashboard)/inbox/items/[id]/page.tsx\"`

### Metadata
- See Also: `ERR-20260305-001`
---

## [ERR-20260306-001] MCP Stitch startup failure due to header/env mismatch
**Logged**: 2026-03-06T12:08:00+01:00
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
Le serveur MCP `stitch` est configure et active, mais le runtime de session echoue au demarrage en demandant une variable d'environnement manquante.

### Error
```
resources/list failed: failed to get client: MCP startup failed: Environment variable X-Goog-Api-Key for MCP server 'stitch' is not set
```

### Context
- Command: `list_mcp_resources(server="stitch")` et `list_mcp_resource_templates(server="stitch")`
- Related Files: `~/.codex/config.toml`, `~/.cursor/mcp.json`
- Reproducible: yes

### Suggested Fix
- Redemarrer la session Codex/Cursor apres modification MCP.
- Verifier que la conf chargee par le runtime utilise bien `http_headers` (ou `env_http_headers` + variable exportee) pour `X-Goog-Api-Key`.
- Re-tester via `codex mcp get stitch` puis `list_mcp_resources(server="stitch")`.

### Metadata
- See Also: `LRN-20260228-001`
---

## [ERR-20260306-002] Note summary refresh returns 500 when model summary is empty
**Logged**: 2026-03-06T12:10:10+01:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
`POST /api/v1/inbox/{capture_id}/note-summary/refresh` returned 500 when AI payload had no summary text.

### Error
```
RuntimeError: capture_summary_empty
```

### Context
- Command: Celery/API processing on capture preprocess and note-summary refresh endpoint
- Related Files: `apps/api/src/services/capture_ai_service.py`, `apps/api/src/api/v1/inbox.py`
- Reproducible: yes

### Suggested Fix
Use deterministic fallback summary/title when AI returns empty summary and handle endpoint fallback without raising 500.

### Resolution
- Resolved: 2026-03-06
- Change: Added deterministic fallback in summary generation and guarded `note-summary/refresh` with fallback payload.

### Metadata
- See Also: `ERR-20260306-003`, `LRN-20260306-001`
---

## [ERR-20260306-003] Celery async worker loop mismatch with asyncpg sessions
**Logged**: 2026-03-06T12:10:10+01:00
**Priority**: critical
**Status**: resolved
**Area**: backend

### Summary
Celery tasks intermittently failed with loop mismatch and asyncpg interface errors due to new asyncio loop per task execution.

### Error
```
RuntimeError: ... got Future ... attached to a different loop
sqlalchemy.exc.InterfaceError: ... cannot perform operation: another operation is in progress
```

### Context
- Command: `uv run celery -A src.worker.celery_app:celery_app worker -Q capture_high,capture_default,capture_free -l info`
- Related Files: `apps/api/src/worker/tasks/capture_tasks.py`, `apps/api/src/worker/tasks/sync_backfill_events.py`
- Reproducible: yes

### Suggested Fix
Run async coroutines on a persistent event loop per worker process instead of `asyncio.run(...)` on each task invocation.

### Resolution
- Resolved: 2026-03-06
- Change: Replaced per-task `asyncio.run` with process-local persistent loop runner in Celery task modules.

### Metadata
- See Also: `LRN-20260306-001`
---

## [ERR-20260306-004] uv commands blocked by sandbox cache permissions
**Logged**: 2026-03-06T20:45:00+01:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
`uv run ...` failed in sandbox because `~/.cache/uv` was not readable from the restricted environment.

### Error
```
error: failed to open file `/Users/andrewpougary/.cache/uv/sdists-v9/.git`: Operation not permitted (os error 1)
```

### Context
- Command: `cd apps/api && PYTHONPATH=. uv run python -m py_compile ...` and `cd apps/api && PYTHONPATH=. uv run python -m unittest tests.test_event_contracts -v`
- Related Files: `apps/api/src/api/v1/events.py`, `apps/api/src/api/v1/inbox.py`, `apps/api/src/api/v1/items.py`
- Reproducible: yes

### Suggested Fix
Re-run the same `uv` command with elevated sandbox permissions when cache-access errors occur.

### Resolution
- Resolved: 2026-03-06
- Change: Re-ran validation commands with escalated permissions and added this runbook entry.

### Metadata
- See Also: `LRN-20260228-001`
---

## [ERR-20260306-005] Sync attachments stalled before send (web/mobile)
**Logged**: 2026-03-06T21:15:00+01:00
**Priority**: high
**Status**: resolved
**Area**: backend/frontend/mobile

### Summary
Sync attachment flow could appear uploaded but remain unusable: send stayed blocked or failed after attach.

### Error
```
User symptom: "ça semble uploader mais c'est tt" (web) and "+" menu opens without effective attach flow (mobile).
```

### Context
- Command: runtime UX issue reported during Sync attach tests (web + mobile)
- Related Files: `apps/api/src/api/v1/inbox.py`, `apps/web/src/components/sync-chat/chat-shell.tsx`, `apps/mobile/app/sync.tsx`
- Reproducible: yes

### Suggested Fix
Force inline processing for `sync_attachment`, propagate real capture status for Inbox picks (poll until ready), and replace mobile picker dynamic imports with static imports.

### Resolution
- Resolved: 2026-03-06
- Change: Added `sync_attachment` inline path in upload API, non-ready Inbox capture polling on web/mobile, static picker imports on mobile, and explicit stream error feedback.

### Metadata
- See Also: `LRN-20260306-003`, `ERR-20260306-003`
---

## [ERR-20260306-006] Sync model list inconsistency due to backend split-brain on port 8000
**Logged**: 2026-03-06T23:20:00+01:00
**Priority**: high
**Status**: resolved
**Area**: infra/backend

### Summary
Web/mobile could hit different API instances on the same port (`docker` + local `uvicorn`), causing inconsistent Sync model lists and fallback warnings.

### Error
```
User symptom: only Mistral models visible + "MISTRAL API key missing, fallback enabled".
```

### Context
- Command: `lsof -nP -iTCP:8000 -sTCP:LISTEN`
- Related Files: `docker-compose.yml`, `apps/api/src/sync/model_registry.py`, `apps/api/src/core/config.py`
- Reproducible: yes

### Suggested Fix
Use a single backend instance per port, ensure Docker API loads `apps/api/.env`, and avoid provider-key-based hiding in `/sync/models`.

### Resolution
- Resolved: 2026-03-06
- Change: added `env_file: ./apps/api/.env` to `api` and `api-worker`, rebuilt containers, and removed provider-key gating from Sync model catalog.

### Metadata
- See Also: `LRN-20260306-004`, `ERR-20260306-005`
---
## [ERR-20260309-001] zsh glob path with square brackets
**Logged**: 2026-03-09T20:37:04+01:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
Shell commands failed when targeting `app/moment/[id].tsx` without quoting the path.

### Error
```
zsh: no matches found: apps/mobile/app/moment/[id].tsx
```

### Context
- Command: `rg ... apps/mobile/app/moment/[id].tsx` and `npx tsc ... app/moment/[id].tsx`
- Related Files: `apps/mobile/app/moment/[id].tsx`
- Reproducible: yes

### Suggested Fix
Quote paths containing bracket characters: `'apps/mobile/app/moment/[id].tsx'`.

### Metadata
- See Also: `LRN-20260309-001`
---
## [ERR-20260311-001] Exploration shell commands assumed unavailable aliases and unsafe quoting
**Logged**: 2026-03-11T23:20:00+01:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
Two repo-inspection commands failed because `python` was not installed in PATH and a zsh search command used mismatched quotes.

### Error
```
zsh:1: command not found: python
zsh:1: unmatched '
```

### Context
- Command: `python - <<'PY' ...` and `rg -n 'href="/me"|...|router.push\('/me' ...`
- Related Files: `.learnings/ERRORS.md`
- Reproducible: yes

### Suggested Fix
Use `python3` explicitly in this environment and prefer simpler search commands or double-quoted shell strings when regex patterns contain mixed quotes.

### Resolution
- Resolved: 2026-03-11
- Change: switched repo scans to `python3` and tightened shell quoting for follow-up commands.

### Metadata
- See Also: `ERR-20260309-001`
---
