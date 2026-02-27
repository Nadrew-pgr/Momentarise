---
name: Improve timeline mobile UI
overview: Ajuster l’écran Timeline (Expo) pour que la Timeline prenne la place utile, supprimer l’overlay “Aucun évènement…” redondant, et afficher un indicateur de jour quand on swipe horizontalement — en ne modifiant que `apps/mobile/app/(tabs)/timeline.tsx`.
todos:
  - id: layout-flex-timeline
    content: Supprimer la hauteur fixe (360) et passer la Timeline en `flex-1`.
    status: completed
  - id: date-indicator
    content: Ajouter un header `Timeline — {date}` mis à jour via `CalendarProvider.onDateChanged`.
    status: completed
  - id: empty-state
    content: Ne pas rendre la liste (ScrollView) quand il n’y a aucun event et retirer l’overlay centré “Aucun évènement…”.
    status: completed
isProject: false
---

### Problème réel (d’après ta description + la capture)

- L’espace **en bas** (zone sous la timeline) est principalement créé par le `ScrollView` en `flex-1` qui contient le titre `Timeline — YYYY-MM-DD` et la liste d’événements.
  - Quand il n’y a **aucun événement**, ce `ScrollView` remplit quand même tout l’espace restant → **grand vide** inutile.
- L’overlay centré `Aucun évènement ce jour.` au-dessus de la Timeline est **redondant** et visuellement lourd.
- Le swipe horizontal change de jour (TimelineList paginée) mais il manque un **feedback clair** du jour courant.

### Changements prévus (un seul fichier)

Fichier: `[apps/mobile/app/(tabs)/timeline.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/(tabs)/timeline.tsx)`

- **Rendre la Timeline “flex-1”**
  - Supprimer le conteneur `View style={{ height: 360 }}`.
  - Mettre `TimelineList` dans un wrapper `className="flex-1"` pour qu’elle prenne tout l’espace disponible.
- **Déplacer / compacter le titre + date (indicateur de jour)**
  - Ajouter un petit header fixe en haut avec le texte `Timeline — {currentDate}`.
  - Utiliser `CalendarProvider` avec `onDateChanged={(date) => setCurrentDate(date)}` pour que le header se mette à jour quand tu swipes.
  - Conserver `single-day` (1 journée) : on n’ajoute pas de multi-day UI.
- **Masquer la zone vide quand il n’y a aucun événement**
  - Ne plus afficher le `ScrollView` (liste) quand `events.length === 0`.
  - Quand il y a des events, afficher la liste comme aujourd’hui (EventRow + tracking) sous la timeline, mais sans créer de grand vide.
- **Retirer l’overlay “Aucun évènement ce jour.” sur la grille**
  - Supprimer le bloc `pointer-events-none absolute inset-0 ...`.
  - Optionnel: si tu veux un hint, on le met en petit texte sous le header (mais on peut aussi ne rien afficher).

### Test plan (manuel)

- Ouvrir Timeline sans events: la grille occupe l’écran, pas de gros bloc vide en bas, pas d’overlay centré.
- Swipe horizontal: le header met à jour la date (indicateur clair du jour affiché).
- Avec events: la liste en bas apparaît (EventRow + boutons start/stop) sans décaler la grille de manière gênante.

