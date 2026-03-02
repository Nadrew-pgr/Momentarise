# FEATURE_REQUESTS — Capacités demandées

Format : `## [FEAT-YYYYMMDD-XXX] capability` + Requested Capability, User Context, Complexity, Suggested Implementation, Metadata.
Voir `project/docs/self-improvement.md` pour le détail.

---

## [FEAT-20260302-001] Widgets de capture rapide
**Logged**: 2026-03-02
**Priority**: medium
**Status**: pending
**Area**: frontend

### Requested Capability
Rendre l'application accessible directement via des widgets natifs sur toutes les plateformes (iOS, Android, macOS, Windows). L'objectif est de permettre à l'utilisateur de logger rapidement tout ce qu'il souhaite (notes, moments) depuis son écran d'accueil sans ouvrir l'application complète.

### User Context
"rendre l'app accessible directement via des widget sur mobile (ios et android) et ordis (macos et windows), afin que l'user n'ait pas à entrer dans l'ap pour ensuite logguer ce qu'il veut logguer."

### Suggested Implementation
Utiliser Expo Widgets sur mobile pour iOS/Android, et des frameworks adaptés (WinUI/AppKit ou frameworks cross-platform type Electron/Tauri) sur desktop.
---
