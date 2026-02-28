---
name: Parite horaires FC-Coss
overview: "Corriger les 3 ecarts visuels restants entre FullCalendar et Coss dans les vues semaine/jour : hauteur des creneaux horaires (4x trop grande), sous-lignes de 15 min visibles, et poids de police des en-tetes."
todos:
  - id: slot-height
    content: "globals.css : changer .fc-timegrid-slot height de 64px a calc(64px/4)=16px et supprimer min-height: 4rem"
    status: completed
  - id: minor-lines
    content: "globals.css : ajouter .fc-timegrid-slot-minor { border-top-style: none } pour masquer les lignes 15/30/45 min"
    status: completed
  - id: header-weight
    content: "globals.css : changer .fc-col-header-cell-cushion font-weight de 600 a normal"
    status: completed
isProject: false
---

# Parite visuelle FullCalendar / Coss -- vues semaine et jour

## Diagnostic (ce qui ne va pas et pourquoi)

En comparant cote a cote Timeline (Coss) et Calendrier (FullCalendar), il reste **3 ecarts visuels** :

### Ecart 1 -- Les heures sont 4 fois trop espacees (CRITIQUE)

**Ce qu'on voit :** Sur Coss, entre "6 AM" et "7 AM", il y a environ 64px. Sur FullCalendar, la meme distance fait ~256px.

**Pourquoi c'est casse :** FullCalendar decoupe chaque heure en 4 creneaux de 15 minutes (`slotDuration="00:15:00"` dans `FullCalendarAdapter.tsx` ligne 398). Le CSS actuel dans [globals.css](apps/web/src/app/globals.css) ligne 224-228 dit :

```css
.calendar-parity .fc .fc-timegrid-slot {
  height: var(--week-cells-height, 64px);  /* <-- 64px par creneau de 15 min */
  min-height: 4rem;                         /* <-- force aussi 64px minimum */
}
```

Chaque creneau de 15 minutes fait 64px. Donc une heure = 4 x 64 = 256px. Coss met 64px pour une heure **entiere** (`WeekCellsHeight = 64` dans [constants.ts](apps/web/src/components/event-calendar/constants.ts) ligne 13).

**Le fix :** Diviser la hauteur par 4 et retirer le min-height :

```css
.calendar-parity .fc .fc-timegrid-slot {
  height: calc(var(--week-cells-height, 64px) / 4);
  min-height: 0;
  background: var(--background);
}
```

Resultat : 64px / 4 = 16px par creneau de 15 min. 4 x 16px = 64px par heure. Identique a Coss.

---

### Ecart 2 -- Des lignes horizontales tous les 15 min (Coss n'en a pas)

**Ce qu'on voit :** Sur FullCalendar, il y a des traits horizontaux a 6h00, 6h15, 6h30, 6h45, 7h00, etc. Sur Coss, il n'y a qu'un trait a chaque heure pleine (6h00, 7h00, 8h00...).

**Pourquoi :** FullCalendar met la classe `.fc-timegrid-slot-minor` sur les creneaux qui ne sont pas sur une heure pleine (le "15", le "30", le "45"). Ces creneaux ont un `border-bottom` par defaut. On ne les a jamais masques.

**Le fix :** Ajouter cette regle dans [globals.css](apps/web/src/app/globals.css), juste apres le bloc `.fc-timegrid-slot` existant :

```css
.calendar-parity .fc .fc-timegrid-slot-minor {
  border-top-style: none;
}
```

Resultat : seules les lignes horaires restent visibles, comme sur Coss.

---

### Ecart 3 -- La police des en-tetes de jours est trop grasse

**Ce qu'on voit :** Sur Coss, les en-tetes "Sun 22", "Mon 23" sont en police legere (poids normal, 400). Sur FullCalendar, ils sont en semi-bold (600) et paraissent plus lourds.

**Pourquoi :** Le CSS dans [globals.css](apps/web/src/app/globals.css) ligne 244-245 dit :

```css
.calendar-parity .fc .fc-col-header-cell-cushion {
  font-weight: 600;  /* <-- semi-bold */
}
```

Alors que Coss utilise `CALENDAR_DAY_HEADER_CLASSES = "py-2 text-center text-muted-foreground/70 text-sm"` (dans [calendar-appearance.ts](apps/web/src/components/event-calendar/calendar-appearance.ts) ligne 10) qui n'a **aucun** `font-bold` ni `font-semibold` -- donc c'est du poids normal (400).

**Le fix :** Changer `font-weight: 600` en `font-weight: normal` :

```css
.calendar-parity .fc .fc-col-header-cell-cushion {
  font-size: 0.875rem;
  font-weight: normal;        /* <-- etait 600, Coss = normal */
  padding: 0.5rem 6px;
  color: color-mix(in oklch, var(--muted-foreground) 70%, transparent);
  text-transform: none;
  letter-spacing: normal;
}
```

Et garder `font-weight: 700` sur le jour "today" (deja en place, pas a toucher).

---

## Fichier unique a modifier

Toutes les corrections se font dans **un seul fichier** : [apps/web/src/app/globals.css](apps/web/src/app/globals.css), dans le bloc `.calendar-parity`.

Rien a changer dans `FullCalendarAdapter.tsx`, `calendar-appearance.ts`, ni les vues Coss.

---

## Resume des 3 modifications dans globals.css


| Ligne actuelle                                                                    | Ce qu'on change                                | Nouvelle valeur                                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `.fc-timegrid-slot { height: var(--week-cells-height, 64px); min-height: 4rem; }` | Diviser la hauteur par 4, supprimer min-height | `height: calc(var(--week-cells-height, 64px) / 4); min-height: 0;` |
| (a ajouter apres)                                                                 | Cacher les lignes des creneaux de 15 min       | `.fc-timegrid-slot-minor { border-top-style: none; }`              |
| `.fc-col-header-cell-cushion { font-weight: 600; }`                               | Aligner sur Coss (pas de gras)                 | `font-weight: normal;`                                             |


