# Spécifications Techniques Architecturales — Life OS (Phase 1)

Ce document est la **source unique de vérité technique** pour la Phase 1 du “Life OS”. Il est rédigé selon le paradigme du **Spec Driven Development (SDD)**.  
Si une règle/contrat n’est **pas** dans ce document, elle n’est **pas garantie**.

## 0) Glossaire (minimal)

- **BFF (Backend For Frontend)** : couche Next.js (Route Handlers) appelée par le navigateur ; elle proxifie vers FastAPI.
- **User** : identité “globale” (compte).
- **Workspace** : tenant logique. Les données métier sont isolées par workspace.
- **Item** : donnée source (note/action/contenu/…); peut être planifiée par des Events.
- **Event** : occurrence temporelle dans la Timeline; **pointe vers un Item** (`events.item_id`).
- **InboxCapture** : sas de décompression (capture brute, non structurée, **sans JSONB**).

## 1) Décisions verrouillées (Phase 1) — NON négociables

1. **Web = TanStack Query → Route Handlers Next.js (/api/…) → FastAPI**
   - Le client web (React + TanStack Query) appelle des endpoints **locaux Next.js** (`/api/...`).
   - Les Route Handlers Next.js agissent comme un **proxy strict** vers FastAPI.

2. **FastAPI est stateless ; le cookie d’auth est géré par Next.js (BFF)**
   - FastAPI renvoie **uniquement** du JSON : `{ "access_token": "..." }`.
   - Next.js (Route Handler `/api/auth/login`) pose le cookie **HTTPOnly** et n’expose pas le token au JS du navigateur.

3. **Hiérarchie temps ↔ donnée : `Event → Item`**
   - `events.item_id` (FK) est la source de vérité.
   - Un `Item` peut avoir **0..n** Events.

4. **Navigation mobile : 5 onglets stricts**
   - `Today`, `Inbox`, `[+]`, `Timeline`, `Me`.
   - Le bouton central `[+]` **navigue vers rien** : il ouvre un **Bottom Sheet global**.

## 2) Contraintes globales (non négociables)

### 2.1 Backend

- **Stack** : Python 100% via **FastAPI**.
- **Versioning** : toutes les routes FastAPI sont préfixées par **`/api/v1`**.
- **Packaging** : géré via **uv**.
- **Validation** : **Pydantic** (entrée/sortie) + schémas explicites.
- **Déploiement** : API containerisée Docker (Railway / Render / Fly.io).
- **CORS** : origines configurables via `CORS_ORIGINS` (liste séparée par virgule dans `.env`). En dev, inclure `http://localhost:3000` + l'IP locale du mobile si besoin.

### 2.2 Database

- **SGBD** : **PostgreSQL**.
- **Migrations** : **Alembic** obligatoires ; pas de modifications manuelles en prod.
- **Timezones** : tous les timestamps en DB : `DateTime(timezone=True)` (UTC).
- **Soft delete** : champ `deleted_at` (nullable) sur les entités principales ; les requêtes applicatives excluent `deleted_at IS NOT NULL` par défaut.
- **IDs** : UUID (v4) partout.

### 2.3 Frontend Web

- **Framework** : Next.js **App Router**.
- **BFF** : Route Handlers sous `app/api/**/route.ts` (proxy strict vers FastAPI).
- **Auth** : **NextAuth interdit**.
- **UI** : shadcn/ui.
- **State** : TanStack Query (server state) + Zustand (client state).
- **Validation** : Zod.
- **i18n** : i18next, aucune string en dur.
- **Layout** : “Cockpit 3 colonnes” (Sidebar / List / Main) sur les routes authentifiées.

### 2.4 Frontend Mobile

- **Framework** : Expo + Expo Router.
- **Dev Client** : Expo Go pour la Phase 1 ; Custom Dev Client prévu pour la Phase 2 (Share Extension native).
- **Package manager** : npm (cohérent avec `apps/web/`).
- **UI** : react-native-reusables + NativeWind + design tokens (mêmes variables CSS que le web).
- **State** : TanStack Query + Zustand ; validation Zod.
- **Auth storage** : token en `expo-secure-store`.
- **Auth flow** : appel direct FastAPI (pas de BFF) ; token Bearer dans les headers.
- **Cache local** : `react-native-mmkv`.
- **Connexion API (dev)** : `EXPO_PUBLIC_API_URL` configurable (IP locale du Mac ou tunnel ngrok).

## 3) Contrat BFF (Web) — canon

### 3.1 Auth Web (cookie)

- **FastAPI** : `POST /api/v1/auth/login` renvoie `{ access_token }` (JSON).
- **Next.js** : `POST /api/auth/login` :
  - appelle FastAPI `/api/v1/auth/login`,
  - récupère `access_token`,
  - pose un cookie HTTPOnly (ex: `mm_access_token`),
  - renvoie un statut 200/204.
- **Attributs cookie** :
  - `httpOnly: true`
  - `sameSite: "lax"`
  - `path: "/"`
  - `secure: process.env.NODE_ENV === "production"` (obligatoire pour que le login fonctionne en dev http://localhost)
  - `maxAge: 7 jours` (604800 secondes)
- **Stratégie expiration** : le cookie dure 7 jours ; le JWT expire en 60 minutes (`JWT_EXPIRE_MINUTES`). Si le JWT est expiré, FastAPI renvoie 401 et le BFF/middleware redirige vers `/login`. Pas de refresh token en Phase 1.

### 3.2 Proxying (toutes les routes BFF)

Pour toute route web `GET/POST/PATCH /api/**` (hors `/api/auth/login` et `/api/auth/logout`) :

- Lire le cookie `mm_access_token`.
- Si absent → **401**.
- Appeler FastAPI en ajoutant `Authorization: Bearer <token>`.
- Ne jamais forward le cookie au backend ; FastAPI ne connaît que l’entête Authorization.

## 4) Slices (Phase 1)

> Chaque slice suit strictement la même structure : **User Story → DoD → Out of scope → API Contract → DB Contract → UI Routes**.

---

## Slice 0 — Fondations & Squelette (DB/Auth/BFF + shells UI)

### User Story

En tant que dev, je peux démarrer la stack (DB + API + Web + Mobile), m’authentifier, ouvrir l’app sur iOS/Android, et naviguer fluidement sur des vues vides. Le BFF web et le routage mobile sont validés.

### DoD (Checklist d’acceptation)

- [x] **DB** : PostgreSQL tourne ; migrations Alembic appliquées.
- [x] **API** : `GET /api/v1/health` répond 200.
- [x] **API** : `POST /api/v1/auth/login` retourne `{ access_token }`.
- [x] **API** : `GET /api/v1/auth/me` retourne `{ user, active_workspace }` (voir contrat).
- [x] **API** : `POST /api/v1/auth/signup` crée un user + workspace + retourne `{ access_token }`.
- [x] **Web** : `POST /api/auth/login` pose un cookie HTTPOnly ; la session survit à un refresh.
- [x] **Web** : `POST /api/auth/signup` fonctionne via BFF (cookie posé après signup).
- [x] **Web** : `GET /api/auth/me` fonctionne via BFF (cookie → bearer → FastAPI).
- [x] **Web** : layout “Cockpit 3 colonnes” s’affiche sans erreur sur les routes protégées.
- [x] **Mobile** : les 5 onglets (`Today`, `Inbox`, `[+]`, `Timeline`, `Me`) s’affichent.
- [x] **Mobile** : le bouton `[+]` n’entraîne aucune navigation et ouvre un Bottom Sheet global.
- [x] **Mobile** : login + signup fonctionnent (token stocké dans `expo-secure-store`).
- [x] **Mobile** : auth guard redirige vers `/login` si pas de token valide.

### Out of scope

- Fonctionnalités métier : Inbox, Items, Timeline, IA.
- Gestion avancée multi-workspace (switcher fonctionnel).

### API Contract

#### FastAPI (`/api/v1`)

- `GET /health`
  - Public.
  - 200 `{ "status": "ok" }`.
- `POST /auth/login`
  - Body : `{ "email": string, "password": string }`
  - 200 `{ "access_token": string, "token_type": "bearer" }`
- `POST /auth/signup`
  - Body : `{ "email": string, "password": string }`
  - 200 `{ "access_token": string, "token_type": "bearer" }`
  - 409 si email déjà pris.
  - Crée : `User` + `UserIdentity(provider="password")` + `Workspace("My Workspace")` + `WorkspaceMember(role=ADMIN)`.
- `GET /auth/me`
  - Auth : `Authorization: Bearer …`
  - 200 :
    - `{ "user": { "id": uuid, "email": string }, "active_workspace": { "id": uuid, "name": string, "role": "ADMIN" | "USER" } }`
  - Règle Phase 1 : si plusieurs workspaces, `active_workspace` = workspace le plus ancien où l’utilisateur est membre (pas de switcher en Slice 0).

#### Next.js BFF (Route Handlers `/api`)

- `POST /api/auth/login`
  - Appelle FastAPI `/api/v1/auth/login`
  - Set-cookie HTTPOnly
  - 200 `{ "ok": true }`
- `POST /api/auth/signup`
  - Appelle FastAPI `/api/v1/auth/signup`
  - Set-cookie HTTPOnly
  - 200 `{ "ok": true }`
- `POST /api/auth/logout`
  - Efface le cookie
  - 204
- `GET /api/auth/me`
  - Proxy vers FastAPI `/api/v1/auth/me`
  - 200 payload FastAPI

### DB Contract

#### Mixins / conventions

- `id` : UUID PK
- `created_at`, `updated_at` : `DateTime(timezone=True)`
- `deleted_at` : `DateTime(timezone=True)`, nullable

#### Tables

##### `users`

- `id` UUID PK
- `email` TEXT unique, non-null
- `revenuecat_app_user_id` TEXT nullable
- `created_at`, `updated_at`, `deleted_at`

##### `user_identities`

Objectif : préparer OAuth/SSO sans refonte.

- `id` UUID PK
- `user_id` UUID FK → `users.id`
- `provider` TEXT non-null (ex: `"password"`, `"google"`, `"oidc"`)
- `provider_subject` TEXT non-null (ex: `sub` OAuth ; pour `"password"`, valeur = email normalisé)
- `hashed_password` TEXT nullable (utilisé uniquement si `provider="password"`)
- Contrainte unique : `(provider, provider_subject)`

##### `workspaces`

- `id` UUID PK
- `name` TEXT non-null
- `owner_id` UUID FK → `users.id`
- `created_at`, `updated_at`, `deleted_at`

##### `workspace_members`

- `id` UUID PK
- `workspace_id` UUID FK → `workspaces.id`
- `user_id` UUID FK → `users.id`
- `role` ENUM (`ADMIN`, `USER`)
- Contrainte unique : `(workspace_id, user_id)`
- `created_at`, `updated_at`, `deleted_at`

### UI Routes

#### Web (Next.js)

- Public :
  - `/login`
  - `/signup`
- Auth :
  - `/today`
  - `/inbox`
  - `/timeline`
  - `/me`
- Layout cockpit 3 colonnes appliqué à toutes les routes Auth.

#### Mobile (Expo Router)

- `/login`
- `/signup`
- `/(tabs)/today`
- `/(tabs)/inbox`
- `/(tabs)/create` (tab “dummy” intercepté ; n’est jamais réellement navigué)
- `/(tabs)/timeline`
- `/(tabs)/me`
- Bottom Sheet global “Create” ouvert par le bouton `[+]` (pas de navigation).

---

## Slice 1 — Vues Principales (Today vs Timeline)

### User Story

En tant qu’utilisateur, je consulte un digest “Today” (macro) et une Timeline “jour” (vérité du temps). Je peux démarrer/stopper un suivi de temps sur un Event.

### DoD (Checklist d’acceptation)

- [x] **DB** : tables `items` (minimal) et `events` créées ; migrations appliquées.
- [x] **API** : `GET /api/v1/today` retourne un digest valide (même si vide).
- [x] **API** : `GET /api/v1/timeline` retourne la liste des Events sur une journée.
- [x] **API** : start/stop tracking met à jour `actual_time_acc` de manière idempotente.
- [x] **Mobile** : Today tab + Timeline tab affichent des états vides propres (i18n).
- [x] **Mobile** : le chrono UI reste fluide (tick local) même si le réseau est lent.
- [x] **Web** : pages Today/Timeline intégrées au cockpit ; requêtes via `/api/*` (BFF).

### Out of scope

- Vue semaine, drag & drop, récurrence.
- Sync calendrier externe (Google/Outlook).
- Shifting automatique (“l’IA décale l’agenda”) : interdit en Phase 1.

### API Contract

#### FastAPI (`/api/v1`)

- `GET /today`
  - 200 `{ "priorities": [], "next_event": null, "next_action": null }` (forme minimale)
  - `priorities` = items du workspace courant ayant `priority_order IS NOT NULL`, triés par `priority_order ASC`, limite 3.
- `GET /timeline?date=YYYY-MM-DD`
  - 200 `{ "date": "YYYY-MM-DD", "events": [ ... ] }`
- `POST /events/{event_id}/start`
  - 200 `{ "event_id": uuid, "is_tracking": true, "tracking_started_at": datetime }`
- `POST /events/{event_id}/stop`
  - 200 `{ "event_id": uuid, "is_tracking": false, "actual_time_acc": number }`

#### Next.js BFF (Route Handlers `/api`)

- Le web consomme les mêmes ressources via :
  - `GET /api/today` → proxy `/api/v1/today`
  - `GET /api/timeline?date=...` → proxy `/api/v1/timeline`
  - `POST /api/events/{id}/start` → proxy `/api/v1/events/{id}/start`
  - `POST /api/events/{id}/stop` → proxy `/api/v1/events/{id}/stop`

### DB Contract

#### `items` (minimal, sans JSONB en Slice 1)

- `id` UUID PK
- `workspace_id` UUID FK → `workspaces.id`
- `title` TEXT non-null
- `priority_order` INTEGER nullable (1-3 = priorités du jour ; rempli manuellement en Phase 1, auto-calculé par Sync/IA en Phase 2)
- `created_at`, `updated_at`, `deleted_at`

#### `events`

- `id` UUID PK
- `workspace_id` UUID FK → `workspaces.id`
- `item_id` UUID FK → `items.id`
- `start_at` `DateTime(timezone=True)` non-null
- `end_at` `DateTime(timezone=True)` non-null
- `estimated_time_seconds` INTEGER non-null (par défaut `end_at - start_at`)
- `actual_time_acc_seconds` INTEGER non-null default 0
- `is_tracking` BOOLEAN non-null default false
- `tracking_started_at` `DateTime(timezone=True)` nullable
- `created_at`, `updated_at`, `deleted_at`

### UI Routes

#### Mobile

- `/(tabs)/today`
- `/(tabs)/timeline` (vue jour uniquement)

#### Web

- `/today`
- `/timeline`


### Décisions verrouillées (Slice 1)

- **Dependency injection workspace** : `get_current_workspace` existe dans `src/core/deps.py` (déjà implémentée). Toutes les queries métier filtrent par `workspace_id` dès cette slice.
- **Page Today** : digest (pas une timeline). Wireframe de référence : `project/inbox_raw/2026-02-16_chatgpt_conv-01.md` lignes 11738-11756.
- **Timeline mobile** : `react-native-calendars` (Wix, composant `TimelineList`) + Adapter Pattern (`lib/adapters/calendarAdapter.ts`). Référence : IDEA-0542/0543/0601.
- **Timeline web** : liste chronologique simple (events triés par heure, avec heure + titre + bouton start/stop). Pas de grille calendrier complexe en Phase 1.
- **Pas de seed automatique** : créer les données de test via l'UI (signup + endpoints).

### Guide d'implémentation

#### Étape 1 : Backend — Dépendance workspace

- `get_current_workspace` est **déjà implémentée** dans `apps/api/src/core/deps.py` (ajoutée lors du hardening Slice 0).
- Signature : `async def get_current_workspace(current_user, db) -> WorkspaceMember` — retourne le membership le plus ancien, 404 si aucun workspace.
- Vérifier qu'elle fonctionne correctement avant de continuer.

#### Étape 2 : Backend — Modèles Item + Event

- Créer `apps/api/src/models/item.py` → suivre le pattern de `src/models/user.py` (hériter `Base, BaseMixin`).
- Créer `apps/api/src/models/event.py` → même pattern.
- Importer les deux dans `apps/api/src/models/__init__.py`.
- Générer la migration : `uv run alembic revision --autogenerate -m "add_items_events"`
- Appliquer : `uv run alembic upgrade head`

#### Étape 3 : Backend — Schemas Pydantic

- Créer `apps/api/src/schemas/today.py` : `TodayResponse(priorities, next_event, next_action)`.
- Créer `apps/api/src/schemas/timeline.py` : `TimelineResponse(date, events)`, `EventOut(id, item_id, title, start_at, end_at, ...)`.
- Créer `apps/api/src/schemas/event.py` : `StartTrackingResponse`, `StopTrackingResponse`.
- Pattern : suivre `src/schemas/auth.py`.

#### Étape 4 : Backend — Routes API

- Créer `apps/api/src/api/v1/today.py` : `GET /today` → query items marqués prioritaires + prochain event + prochaine action.
- Créer `apps/api/src/api/v1/timeline.py` : `GET /timeline?date=YYYY-MM-DD` → query events du jour.
- Créer `apps/api/src/api/v1/events.py` : `POST /events/{id}/start` et `POST /events/{id}/stop`.
- Enregistrer les routeurs dans `src/main.py` : `app.include_router(today.router, prefix="/api/v1")`, idem pour timeline et events.
- Toutes les routes utilisent `Depends(get_current_workspace)` pour filtrer par `workspace_id`.

#### Étape 4.5 : Stabilisation contrats & hardening (gate avant Web/Mobile)

- Cette étape est un **gate NO-GO** : ne pas démarrer l'étape 5 tant que les points ci-dessous ne sont pas validés.
- **Workspace dependency** :
  - `get_current_workspace` doit ignorer les memberships pointant vers des workspaces soft-delete (`workspace.deleted_at IS NULL`).
- **Timeline date** :
  - `GET /api/v1/timeline?date=...` retourne **422** si `date` n'est pas au format `YYYY-MM-DD` (pas de fallback silencieux).
- **Tracking contract** :
  - le champ API de stop reste `actual_time_acc` (contrat public Slice 1),
  - le stockage DB reste `actual_time_acc_seconds`,
  - mapping explicite et documenté entre les deux.
- **Migration hygiene** :
  - defaults DB explicites sur `events.actual_time_acc_seconds` (= 0) et `events.is_tracking` (= false),
  - contraintes/checks (`actual_time_acc_seconds >= 0`, `estimated_time_seconds >= 0`),
  - index ciblés (`items(workspace_id, priority_order)`, `events(workspace_id, start_at)`, `events(workspace_id, is_tracking)`),
  - via migration dédiée et lisible (pas de mega-migration).
- **Contrats partagés TS** :
  - package `@momentarise/shared` présent et exportant `auth/today/timeline/events`,
  - web + mobile importent les schemas communs depuis ce package,
  - pas de duplication locale résiduelle des schemas transverses (`auth`, puis Slice 1 `today/timeline/events`).
- **Validation minimale** :
  - API compile,
  - web lint/typecheck sans erreur bloquante,
  - mobile typecheck sans erreur bloquante.

#### Étape 5 : Web — BFF Routes

- Créer `apps/web/src/app/api/today/route.ts` → proxy `/api/v1/today` (suivre pattern de `api/auth/me/route.ts` avec `proxyWithAuth`).
- Créer `apps/web/src/app/api/timeline/route.ts` → proxy `/api/v1/timeline`.
- Créer `apps/web/src/app/api/events/[id]/start/route.ts` et `stop/route.ts` → proxy POST.

#### Étape 6 : Web — Hooks TanStack Query

- Créer `apps/web/src/hooks/use-today.ts` → `useQuery({ queryKey: ["today"], queryFn: () => fetch("/api/today") })`.
- Créer `apps/web/src/hooks/use-timeline.ts` → `useQuery({ queryKey: ["timeline", date], ... })`.
- Créer `apps/web/src/hooks/use-tracking.ts` → `useMutation` pour start/stop.
- Pattern : suivre `src/hooks/use-me.ts`.

#### Étape 7 : Web — Pages Today + Timeline

- Modifier `apps/web/src/app/(dashboard)/today/page.tsx` : remplacer le placeholder par le digest (priorities, next event, next action).
- Modifier `apps/web/src/app/(dashboard)/timeline/page.tsx` : afficher la liste chronologique des events avec boutons start/stop.
- Ajouter les clés i18n dans `src/i18n/fr.json` et `src/i18n/en.json`.

#### Étape 8 : Mobile — Adapter Pattern

- Créer `apps/mobile/lib/adapters/calendarAdapter.ts` : fonction `eventsToCalendarFormat(events)` qui convertit les events API en format `react-native-calendars`.
- Installer : `npx expo install react-native-calendars` dans `apps/mobile/`.

#### Étape 9 : Mobile — Pages Today + Timeline

- Modifier `apps/mobile/app/(tabs)/today.tsx` : afficher le digest (mêmes sections que le web).
- Modifier `apps/mobile/app/(tabs)/timeline.tsx` : utiliser `TimelineList` de `react-native-calendars` avec l'adapter.
- Créer `apps/mobile/hooks/use-today.ts` et `use-timeline.ts` (même pattern que le web, mais appel direct FastAPI).

#### Étape 10 : i18n

- Ajouter toutes les clés nécessaires dans les 4 fichiers i18n (web fr/en + mobile fr/en).

---

## Slice 2 — Inbox & Vue Détail (cœur de la donnée)

### User Story

En tant qu’utilisateur, je capture du brut dans l’Inbox (sas), puis je le transforme en Item structuré et je l’édite dans une vue détail.

### DoD (Checklist d’acceptation)

- [ ] **DB** : table `inbox_captures` créée ; migration `items.blocks` ajoutée.
- [ ] **API** : création et listing Inbox (`POST/GET /api/v1/inbox`).
- [ ] **API** : transformation `POST /api/v1/inbox/{id}/process` crée un Item et soft-delete la capture.
- [ ] **API** : `PATCH /api/v1/items/{id}` met à jour `blocks` (JSONB) et persiste correctement.
- [ ] **Mobile** : Inbox tab liste + détail item en Bottom Sheet (3 onglets : Détails, Blocs, Coach placeholder).
- [ ] **Web** : inbox list en colonne 2 ; item detail en colonne 3 ; mutations en optimistic UI via TanStack Query.

### Out of scope

- IA (parsing/génération) : le processing peut être manuel (règles simples) en Phase 1.
- Attachments / fichiers / OCR.
- Marketplace templates.

### API Contract

#### FastAPI (`/api/v1`)

- `GET /inbox`
  - 200 `{ "captures": [ { "id": uuid, "raw_content": string, "created_at": datetime } ] }`
- `POST /inbox`
  - Body `{ "raw_content": string }`
  - 201 `{ "id": uuid }`
- `POST /inbox/{capture_id}/process`
  - Body `{ "title": string }`
  - L'utilisateur saisit le titre manuellement avant de confirmer le processing.
  - 200 `{ "item_id": uuid }`
- `GET /items/{item_id}`
  - 200 `{ "id": uuid, "title": string, "blocks": [] }`
- `PATCH /items/{item_id}`
  - Body `{ "blocks": [] }`
  - 200 `{ "id": uuid, "blocks": [] }`

#### Next.js BFF (Route Handlers `/api`)

- `GET /api/inbox` → proxy `/api/v1/inbox`
- `POST /api/inbox` → proxy `/api/v1/inbox`
- `POST /api/inbox/{id}/process` → proxy `/api/v1/inbox/{id}/process`
- `GET/PATCH /api/items/{id}` → proxy `/api/v1/items/{id}`

### DB Contract

#### `inbox_captures`

- `id` UUID PK
- `workspace_id` UUID FK → `workspaces.id`
- `user_id` UUID FK → `users.id`
- `raw_content` TEXT non-null
- `source` TEXT nullable, default `"manual"` (valeurs possibles : `"manual"`, `"deeplink"`, `"extension"`, `"share"` ; utilisé par Slice 3)
- `created_at`, `updated_at`, `deleted_at`

#### `items` (extension Slice 2)

- Ajouter `blocks` JSONB non-null, default `[]`
  - SQLAlchemy : `MutableList.as_mutable(JSONB)`

##### Format des blocks (Phase 1)

Le champ `blocks` stocke le JSON ProseMirror natif tel que produit par BlockNote (web) et TenTap (mobile). Le backend valide uniquement la structure de base : chaque noeud doit avoir un champ `type` (string) et optionnellement `content` (array) et `attrs` (object). Aucune conversion n'est nécessaire entre les éditeurs.

Schema Pydantic minimal de validation :

```python
class ProseMirrorNode(BaseModel):
    type: str
    content: list["ProseMirrorNode"] | None = None
    attrs: dict | None = None
    text: str | None = None
    marks: list[dict] | None = None
```

### UI Routes

#### Mobile

- `/(tabs)/inbox`
- Détail Item : Bottom Sheet modal partagé (3 onglets : Détails / Blocs / Coach placeholder)

#### Web

- `/inbox` (cockpit)
  - Colonne 2 : liste Inbox / Items
  - Colonne 3 : détail Item


### Décisions verrouillées (Slice 2)

- **Éditeur web** : BlockNote.js (`@blocknote/react`, MIT, basé sur ProseMirror).
- **Éditeur mobile** : TenTap Editor (`@10play/tentap-editor`, MIT, basé sur Tiptap/ProseMirror).
- **Format JSON `blocks`** : format ProseMirror natif stocké tel quel. BlockNote (web) et TenTap (mobile) produisent un JSON compatible. Le backend valide uniquement la structure de base (`type` + `content` + `attrs`). Aucune conversion entre éditeurs.
- **Processing inbox** : manuel en Phase 1 (pas d'IA). L'utilisateur clique "Process" → saisit un titre → un Item est créé. Le body est `{ "title": string }`.

### Guide d'implémentation

#### Étape 1 : Backend — Modèle InboxCapture + extension Item

- Créer `apps/api/src/models/inbox_capture.py` → suivre le pattern de `src/models/user.py`.
- Modifier `apps/api/src/models/item.py` : ajouter colonne `blocks` JSONB (`MutableList.as_mutable(JSONB)`, default `[]`).
- Générer la migration : `uv run alembic revision --autogenerate -m "add_inbox_captures_and_item_blocks"`
- Appliquer : `uv run alembic upgrade head`

#### Étape 2 : Backend — Schemas + Routes Inbox

- Créer `apps/api/src/schemas/inbox.py` : `InboxCaptureOut`, `CreateCaptureRequest`, `ProcessCaptureResponse`.
- Créer `apps/api/src/schemas/item.py` : `ItemOut`, `UpdateItemRequest`.
- Créer `apps/api/src/api/v1/inbox.py` : `GET /inbox`, `POST /inbox`, `POST /inbox/{id}/process`.
- Créer `apps/api/src/api/v1/items.py` : `GET /items/{id}`, `PATCH /items/{id}`.
- Toutes les routes filtrent par `workspace_id` via `get_current_workspace`.

#### Étape 3 : Web — BFF + Hooks

- Créer les Route Handlers BFF : `api/inbox/route.ts`, `api/inbox/[id]/process/route.ts`, `api/items/[id]/route.ts`.
- Créer les hooks : `use-inbox.ts`, `use-item.ts` avec optimistic updates via TanStack Query.

#### Étape 4 : Web — Éditeur BlockNote

- Installer : `npm install @blocknote/core @blocknote/react @blocknote/mantine` dans `apps/web/`.
- Modifier `apps/web/src/app/(dashboard)/inbox/page.tsx` : cockpit 3 colonnes (liste inbox en col 2, détail item en col 3).
- Créer `apps/web/src/components/block-editor.tsx` : wrapper BlockNote qui lit/écrit le JSON `blocks`.

#### Étape 5 : Mobile — Éditeur TenTap

- Installer : `npm install @10play/tentap-editor react-native-webview` dans `apps/mobile/`.
- Modifier `apps/mobile/app/(tabs)/inbox.tsx` : liste des captures.
- Créer `apps/mobile/components/ItemDetailSheet.tsx` : Bottom Sheet modal avec 3 onglets (Détails / Blocs / Coach placeholder).
- Créer `apps/mobile/components/BlockEditor.tsx` : wrapper TenTap pour éditer les blocks.

---

## Slice 3 — Journaling & Capture (omnicanal)

### User Story

En tant qu’utilisateur, je peux capturer depuis l’extérieur (web extension / share / deep link) vers l’Inbox et je peux logger une humeur simple (1–5).

### DoD (Checklist d’acceptation)

- [ ] **API** : endpoint capture externe insère dans `inbox_captures`.
- [ ] **Mobile** : Deep Link `lifeos://share?text=...` ouvre l’app et crée une capture.
- [ ] **DB** : table `habit_logs` créée ; mood score validé.
- [ ] **Web** : widget “mood” présent (Me ou Sidebar), i18n compliant.

### Out of scope

- Share Extension native complète (iOS/Android) si elle impose trop de natif en Phase 1 (peut être “prep-only”).
- Habit tracker complexe.

### API Contract

#### FastAPI (`/api/v1`)

- `POST /capture/external`
  - Body `{ "raw_content": string, "source": "deeplink" | "extension" | "share" }`
  - 201 `{ "capture_id": uuid }`
- `POST /habits/log`
  - Body `{ "date": "YYYY-MM-DD", "mood_score": 1..5 | null }`
  - 200 `{ "ok": true }`

#### Next.js BFF (Route Handlers `/api`)

- Web : `POST /api/capture/external` → proxy `/api/v1/capture/external`
- Web : `POST /api/habits/log` → proxy `/api/v1/habits/log`

### DB Contract

#### `habit_logs`

- `id` UUID PK
- `workspace_id` UUID FK → `workspaces.id`
- `user_id` UUID FK → `users.id`
- `date` DATE non-null
- `mood_score` INTEGER nullable (1..5)
- Contrainte unique : `(user_id, date)`
- `created_at`, `updated_at`, `deleted_at`

### UI Routes

#### Mobile

- Deep link handler (pas forcément une route visible)
- Mood log accessible via `/(tabs)/me` (ou widget)

#### Web

- Widget mood dans `/me` (ou Sidebar cockpit)


### Décisions verrouillées (Slice 3)

- **Deep link scheme** : `lifeos://share?text=...` (configuré dans `app.json` Expo).
- **Mood widget** : composant simple (5 étoiles/émojis) dans la page `/me`, pas un onglet séparé.
- **Share Extension native** : prep-only en Phase 1 (deep link uniquement).

### Guide d'implémentation

#### Étape 1 : Backend — Endpoints

- Créer `apps/api/src/api/v1/capture.py` : `POST /capture/external` → insère dans `inbox_captures` avec champ `source`.
- Créer `apps/api/src/models/habit_log.py` : table `habit_logs`.
- Créer `apps/api/src/schemas/habit.py` + `apps/api/src/api/v1/habits.py` : `POST /habits/log`.
- Migration : `uv run alembic revision --autogenerate -m "add_habit_logs"`

#### Étape 2 : Web — BFF + Widget Mood

- Route Handler BFF : `api/capture/external/route.ts`, `api/habits/log/route.ts`.
- Modifier `apps/web/src/app/(dashboard)/me/page.tsx` : ajouter widget mood (5 boutons 1-5, appel `POST /api/habits/log`).
- Hook : `use-mood.ts` avec `useMutation`.

#### Étape 3 : Mobile — Deep Link Handler

- Configurer le scheme dans `apps/mobile/app.json` : `"scheme": "lifeos"`.
- Créer un handler dans `apps/mobile/app/_layout.tsx` : écouter `Linking.addEventListener` → si URL `lifeos://share?text=...` → appeler `POST /api/v1/capture/external`.
- Ajouter widget mood dans `apps/mobile/app/(tabs)/me.tsx`.

---

## Slice 4 — Hardening multi-tenant & préparation IA/RAG

### User Story

En tant qu’utilisateur, mes données sont strictement isolées par workspace. En tant que dev, je prépare les fondations (pgvector, proxy LLM, règles de sécurité) sans coupler l’app à un fournisseur.

### DoD (Checklist d’acceptation)

- [ ] **Backend** : toute requête sur une ressource tenant-aware est filtrée par `workspace_id` (pas de fuite inter-tenant).
- [ ] **Sécurité** : cross-tenant access renvoie **404** (pas 403) pour éviter la fuite d’existence.
- [ ] **DB** : extension pgvector activable par migration ; tables `documents` + `embeddings` créées (si in-scope).
- [ ] **API** : endpoint `POST /api/v1/rag/search` (stub ou impl minimal) derrière contrat stable.

### Out of scope

- UI complète “Memory/RAG”.
- Agents IA autonomes (Sync/Plan Builder) : uniquement préparation d’architecture.

### API Contract

#### FastAPI (`/api/v1`)

- `POST /rag/search`
  - Body `{ "query": string, "filters": object }`
  - 200 `{ "results": [] }` (forme stable, même si stub)

#### Next.js BFF (Route Handlers `/api`)

- `POST /api/rag/search` → proxy `/api/v1/rag/search`

### DB Contract

#### `documents`

- `id` UUID PK
- `workspace_id` UUID FK → `workspaces.id` (index)
- `metadata` JSONB non-null (index selon besoin)
- `created_at`, `updated_at`, `deleted_at`

#### `embeddings`

- `id` UUID PK
- `document_id` UUID FK → `documents.id`
- `embedding` VECTOR(1536) (pgvector)
- `created_at`, `updated_at`, `deleted_at`

### UI Routes

- Aucun écran obligatoire en Phase 1 (préparation backend).


### Décisions verrouillées (Slice 4)

- **Cross-tenant** : retourner 404 (pas 403) pour ne pas révéler l'existence d'une ressource.
- **pgvector** : extension PostgreSQL, activée via migration Alembic.
- **RAG endpoint** : stub qui retourne `{ "results": [] }` ; contrat stable pour l'avenir.

### Guide d'implémentation

#### Étape 1 : Backend — Audit workspace_id

- Vérifier que TOUTES les routes métier (today, timeline, events, inbox, items, capture, habits) filtrent par `workspace_id`.
- Écrire des tests : tenter d'accéder à une ressource d'un autre workspace → doit retourner 404.
- Pattern : `query.where(Model.workspace_id == current_workspace.workspace_id, Model.deleted_at.is_(None))`.

#### Étape 2 : Backend — pgvector + tables documents/embeddings

- Installer : `uv add pgvector` dans `apps/api/`.
- Créer `apps/api/src/models/document.py` et `apps/api/src/models/embedding.py`.
- Migration : activer l'extension pgvector (`op.execute("CREATE EXTENSION IF NOT EXISTS vector")`) puis créer les tables.
- `uv run alembic revision --autogenerate -m "add_pgvector_documents_embeddings"`

#### Étape 3 : Backend — RAG stub

- Créer `apps/api/src/api/v1/rag.py` : `POST /rag/search` → retourne `{ "results": [] }`.
- BFF : `apps/web/src/app/api/rag/search/route.ts` → proxy.

---

## Onboarding UX (Post-Phase 2)

> Cette section est hors scope Phase 1. Elle est documentee ici pour preparer l'architecture.

### Scope prevu

- **Slides de bienvenue** : 3-4 ecrans swipables presentant les features cles (Today, Timeline, Inbox, IA)
- **Configuration initiale** : langue, horaires travail/perso, 3 objectifs majeurs (IDEA-0258/0259)
- **Tour guide interactif** : tooltips/highlights sur les onglets et boutons cles
- **Flag** : `users.has_onboarded` (BOOLEAN default false) — a ajouter quand l'onboarding est implemente
- **Raison du timing** : l'onboarding presente les features IA (Phase 2), inutile de le faire avant

### Preparation Phase 1

- Ne PAS ajouter `has_onboarded` maintenant (pas de migration inutile)
- Apres signup, l'utilisateur arrive directement sur `/today`

---

## Annexe A — Notes de recherche (Méta) déplacées

### Slice 0

- Concepts : Screen Contract, AppText, Design Tokens, Navigation, Tab Bar, Cockpit, Me.
- Ledger : IDEA-0001 (Dashboard cockpit “Centre de commande”), IDEA-0015 (Navigation 5 onglets).

### Slice 1

- Concepts : S01_TODAY, S03_TIMELINE, Adapter, react-native-calendars, Prévu vs Réel.
- Ledger : IDEA-0002 (Timeline calendar-first), IDEA-0003 (3 objectifs du jour / Digest).

### Slice 2

- Concepts : S02_INBOX, S06_ITEM_DETAIL, “Sas de décompression”, Items, Blocks.
- Ledger : IDEA-0004 (Inbox universelle / bouton central).

### Slice 3

- Concepts : Share Extension, Mood Tracker, Capture, Journaling.
- Ledger : IDEA-0016 (Liquid Glass / modale), IDEA-0018 (Capture omnicanale).

### Slice 4

- Concepts : workspace_id, multi-tenant, Hybrid RAG, LiteLLM, OAuth.

## Annexe B — Sources (références)

- Next.js — Backend for Frontend guide : `https://nextjs.org/docs/app/guides/backend-for-frontend`
- React Native Bottom Sheet : `https://gorhom.github.io/react-native-bottom-sheet/`
- Expo Sharing : `https://docs.expo.dev/versions/latest/sdk/sharing/`
- iOS Share Extensions / Android Intents (article) : `https://www.devas.life/supporting-ios-share-extensions-android-intents-on-react-native/`
- Hybrid RAG (exemple) : `https://github.com/conan505/Hybrid-RAG`
- LiteLLM docs : `https://docs.litellm.ai/docs/`
- Discussion FastAPI (cookies vs tokens) : `https://github.com/fastapi/full-stack-fastapi-template/discussions/1564`
