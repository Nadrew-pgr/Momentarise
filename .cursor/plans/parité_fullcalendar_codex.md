# Plan — Correction Parité FullCalendar (Week/Month) + Fix du “saut” au 1er changement de mois (Web d’abord)

## Résumé
Objectif de cette passe: rendre `/calendar` (FullCalendar) **pixel + UX parity** avec `/timeline` (Coss) pour les vues **week** et **month**, et supprimer le “saut” visuel observé lors du premier changement de mois.  
Scope validé: **Web d’abord**. Le mobile sera traité juste après dans une passe dédiée.

## Constat actuel (ce qui a été modifié précédemment)
Les changements précédents ont surtout couvert:
1. Le modèle/contrat Event→Moment (`description`, `location`, `all_day`) côté API/shared.
2. Le dialog web refactoré en 3 tabs (`Détails`, `Contenu`, `Coach`) + persistance `Item.blocks`.
3. Le plumbing create/update/delete/tracking dans les adapters.
4. Quelques corrections mobile Timeline/EventSheet (RN), mais **pas** une parité visuelle FullCalendar week/month.

Donc ton constat est correct: la parité week/month FullCalendar n’est pas finalisée.

## Changements publics API/interfaces/types
1. Aucun changement public supplémentaire dans cette passe.
2. Aucun changement de schéma DB/API.
3. Aucun changement de contrat `@momentarise/shared` attendu ici.

---

## Implémentation (ordre strict)

## 1) Stabiliser la navigation (suppression du “saut”)
1. `apps/web/src/features/calendar/core/use-calendar-controller.ts`
- Initialiser `visibleRange` sur la **range month courante** (au lieu day/day) pour éviter la transition initiale “day -> month”.
- Garder `queryKey` inchangés.

2. `apps/web/src/features/calendar/ui/CalendarPageShell.tsx`
- Supprimer le layout shift du bandeau loading:
  - réserver une hauteur fixe pour la zone status/loading, ou
  - passer le loading en overlay absolu non-intrusif.
- Objectif: aucun déplacement vertical de la grille quand `isFetching` change.

3. `apps/web/src/features/calendar/adapters/fullcalendar/FullCalendarAdapter.tsx`
- Forcer `initialDate={currentDate}` et synchroniser proprement date/view pour éviter la première navigation “double passe”.
- Vérifier que `datesSet` ne provoque pas de ping-pong d’état.

## 2) Parité visuelle stricte Week/Month (FullCalendar -> Coss)
1. `apps/web/src/features/calendar/adapters/fullcalendar/FullCalendarAdapter.tsx`
- Activer/configurer FullCalendar pour alignement Coss:
  - `dayMaxEvents`, `dayMaxEventRows`, style du `+N`.
  - `allDaySlot` dynamique (visible seulement si nécessaire, comme Coss).
  - cohérence `selectable/editable/eventDrop/eventResize`.
- Uniformiser rendu event chips (time + title + états past/tracking).

2. `apps/web/src/app/globals.css` (`.calendar-parity`)
- Aligner typographie/espacements/hauteurs:
  - header jours, axe horaire, taille slots (alignée à Coss),
  - style cellules outside-month,
  - event pills/chips (radius, padding, border, muted, strike past),
  - now-indicator.
- Ajuster month/week grid pour densité identique à Coss.

3. `apps/web/src/features/calendar/ui/CalendarEventChip.tsx`
- Ajuster structure/typo pour matcher `EventItem` Coss (lisibilité + densité).

## 3) Parité comportementale Week/Month
1. `apps/web/src/features/calendar/adapters/fullcalendar/FullCalendarAdapter.tsx`
- Vérifier et aligner:
  - click day/cell -> create moment,
  - click event -> open dialog edit,
  - drag/drop + resize -> mêmes retours que Coss,
  - all-day/multi-day comportement identique,
  - tracking/past states identiques.

2. `apps/web/src/features/calendar/ui/CalendarToolbar.tsx`
- Conserver la même toolbar entre `/timeline` et `/calendar` (source unique), sans divergence moteur.

## 4) Nettoyage & logs
1. Retirer logs/debug éventuels côté calendrier.
2. Vérifier qu’aucune logique moteur-spécifique ne crée d’écart non voulu entre `/timeline` et `/calendar`.

---

## Tests et scénarios obligatoires

## A) Non-régression fonctionnelle
1. Month/week/day/agenda chargent correctement dans `/calendar`.
2. Create/edit/delete moment fonctionne depuis `/calendar`.
3. Drag/drop et resize persistés sans régression.
4. Tracking start/stop inchangé.

## B) Parité visuelle (checklist stricte)
1. `/timeline` vs `/calendar` sur week:
- header jours, axe horaire, hauteur slots, now-indicator, style events.
2. `/timeline` vs `/calendar` sur month:
- grille, cellules hors mois, pills events, overflow `+N`, états past/tracking.
3. Aucun écart majeur de spacing/typo/couleur.

## C) Fix du saut
1. Premier changement de mois: **aucun jump vertical**.
2. Changements suivants: pas de saut non plus.
3. `isFetching` ne doit pas déplacer la grille.

## D) Validation technique
1. `npm run -w apps/web lint`
2. smoke test manuel `/timeline` + `/calendar` (week/month).

---

## Assumptions & defaults
1. “Totalement identique” = **pixel + UX parity** sur week/month, avec FullCalendar forcé par config + CSS si nécessaire.
2. Scope de cette passe = **Web seulement**.
3. Mobile: pas de FullCalendar; passe dédiée juste après pour alignement RN.
4. Aucun changement d’API/DB supplémentaire dans ce lot.
