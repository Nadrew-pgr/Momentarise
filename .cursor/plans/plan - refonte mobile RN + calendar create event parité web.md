# Plan — Refonte Mobile (RN) + Calendar Create Event (parité Web)

## Résumé
Refonte UI/UX de toutes les pages mobiles restantes en React Native (tabs + non‑tabs), avec priorité Inbox + Timeline pour parité web (UI + comportements clés). Ajout d’un **flow de création d’événement** depuis le `+` central qui **navigue vers Timeline** et **ouvre un modal/bottom‑sheet de création** identique au web (mêmes champs et validations).

## Changements publics API/interfaces/types
- Aucun changement d’API prévu **si** les champs events web existent déjà côté backend + `@momentarise/shared`.
- Vérif obligatoire que `EventOut` et endpoints events supportent:  
  `title`, `description`, `start_at`, `end_at`, `all_day`, `location`, `color`, `is_tracking`, `updated_at`.
- Si un champ manque: étendre backend + `@momentarise/shared` (mêmes noms/semantique que web).

## Scope
### Inclus
- Tabs: `today`, `inbox`, `timeline`, `me`
- Non‑tabs: `items/[id]`, `login`, `signup`, `profile`, `settings`, `help`, `sync`
- Flow création d’événement depuis `+` central → Timeline → modal création
- Parité Inbox + Timeline avec web (UI + comportements clés)

### Exclu
- Refactors backend non requis par la parité.
- Nouvelles features non présentes sur web.

---

## Plan d’implémentation (ordre strict)

## 1) Audit & alignements de base
1. Vérifier champs events disponibles dans `@momentarise/shared` et API.
2. Valider tokens/design mobile: **react-native-reusables + tokens tailwind** (règles `mobile.mdc`).
3. Confirmer règles i18n: toutes les nouvelles chaînes ajoutées à `i18n/fr.json` + `i18n/en.json`.

## 2) State global pour event modal
1. Créer store Zustand `useEventSheet` (ou équivalent) dans `apps/mobile/lib/store.ts`:
   - `isOpen`, `draftEvent`, `open(draftEvent)`, `close()`
2. `draftEvent` = objet local pour préremplir le modal (`start_at`, `end_at`, etc.).

## 3) Hooks events (mobile)
1. Créer hooks:
   - `useEventsRange` (GET `/api/v1/events?start=...&end=...`)
   - `useCreateEvent` (POST `/api/v1/events`)
   - `useUpdateEvent` (PATCH `/api/v1/events/{id}`)
   - `useDeleteEvent` (DELETE `/api/v1/events/{id}`)
2. Réutiliser `useTracking` existant pour start/stop tracking.
3. Normaliser le cache TanStack Query (`queryKey: ["events", range]`).

## 4) Bottom sheet “Create Event” (parité web)
1. Créer composant mobile: `components/EventSheet.tsx` avec @gorhom/bottom-sheet (full height).
2. Champs **identiques au web**:
   - Title
   - Description (textarea)
   - Start date
   - Start time
   - End date
   - End time
   - All day (toggle)
   - Location
   - Color (radio/chips)
   - Tracking toggle (si event existant)
   - Delete (si event existant)
3. Validation identique web:
   - End date >= start date
   - Time entre StartHour/EndHour (du web), sinon erreur
4. Date/time pickers:
   - Installer `@react-native-community/datetimepicker` via `npx expo install`
   - Start/End date + start/end time en pickers séparés
5. Defaults:
   - Start = now arrondi à 15 min
   - End = start + 1h
   - Title par défaut: `"(no title)"` si vide

## 5) Flow `+` central → Calendar + modal
1. `BottomSheetCreate`:
   - Ajouter option “Event” (icône CalendarDays).
   - `onPress`:  
     - `close()` bottom sheet  
     - `useEventSheet.open(defaultDraft)`  
     - `router.push("/(tabs)/timeline")`
2. `TimelineScreen`:
   - écoute store `useEventSheet` → si `isOpen`, ouvrir `EventSheet`.

## 6) Refonte Timeline (parité web + modal)
1. Uniformiser UI (header, section, spacing, typographies) pour matcher web.
2. Ajouter interactions:
   - Tap event → open EventSheet en mode edit
   - Create event via modal (voir étape 4)
   - Delete event (action du modal)
   - Toggle tracking (start/stop)
3. Aligner logique event list:
   - useEventsRange basé sur date affichée
   - Utiliser `eventsToCalendarFormat` existant
4. Retirer duplication UI / states obsolètes si présents.

## 7) Refonte Inbox (parité web)
1. UI:
   - Search input + filter pills
   - Grouping Today/Yesterday/Earlier
   - Cards style identique web (title/subtitle, tags)
2. Behaviors clés:
   - Preview capture
   - Apply capture
   - Process capture (modal ou inline comme web)
   - Delete/Restore capture + Item
3. Uniformiser feedback erreurs (toast + inline errors).

## 8) Refonte autres pages (UI consistante)
1. Today:
   - Uniformiser UI aux sections web (digest, next event, next action, inbox preview).
2. Me:
   - Harmoniser cards, sections, CTA.
3. Item detail:
   - Tabs + editor + details re‑styling avec UI components (cards, separators).
4. Auth (login/signup):
   - Réutiliser `@/components/ui/*` (Input, Button, Card) pour cohérence.
5. Profile/Settings/Help/Sync:
   - Page shell standard (header + content + cards).
   - “Coming soon” stylé comme web.

## 9) i18n
- Ajouter clés mobile manquantes:
  - EventSheet: labels, erreurs, CTA, couleur, all‑day
  - Inbox/TImeline parity
  - Auth + Me/Settings/Help/Sync s’il manque
- Vérifier en `fr` et `en`.

## 10) Tests et scénarios obligatoires
### Mobile — Event
1. `+` → Event → Timeline → modal ouvert avec defaults corrects.
2. Create → event visible dans Timeline.
3. Edit → update fields (date/time/color) ok.
4. Delete → event supprimé.
5. All‑day toggle → couvre journée complète.
6. Validation Start/End time.

### Mobile — Inbox parity
1. Search/filter corrects
2. Preview/apply/process flows identiques web
3. Delete/restore capture et item

### Mobile — UI consistency
1. Today/Me/Item/Auth/Profile/Settings/Help/Sync alignés aux composants UI.

---

## Assumptions et defaults retenus
1. Parité Inbox + Timeline = **UI + comportements clés**, pas 100% features web.
2. Event modal = bottom sheet (gorhom) full‑height.
3. Event fields = identiques au web (title/description/dates/times/all‑day/location/color + tracking).
4. Pas de nouvelle logique backend sauf si champs event manquent.

