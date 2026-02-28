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
