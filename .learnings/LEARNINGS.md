# LEARNINGS — Corrections, knowledge gaps, bonnes pratiques

Format : `## [LRN-YYYYMMDD-XXX] category` + Summary, Details, Suggested Action, Metadata.
Voir `project/docs/self-improvement.md` pour le détail des champs et la promotion vers CLAUDE.md / AGENTS.md.

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
