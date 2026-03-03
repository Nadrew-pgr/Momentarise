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
---

### Request #FR-02: Auto-fill Form Redirection on Action Apply
**ID:** FR-02
**Date Logged:** 2026-03-02
**Priority:** Medium
**Status:** Open
**Area:** Inbox & Calendar

**Requested Capability**:
When a user clicks "Apply" on an AI-suggested action (e.g., "Schedule an event"), the application should redirect the user to the corresponding creation form (e.g., Calendar Event Creation Dialog) with all the fields pre-filled based on the AI's parsed payload, rather than just executing the action blindly or returning to the inbox.

**User Context / Verbatim**:
"Et ensuite dans un futur proche, appliquer emmenera sur l'action appliquée, par exemple s'il propose de scheduler un item de l'inbox, à l'appuie sur appliquer on doit être redirigé verse la créatino d'un moment totalement préremplie"

**Implementation Strategy**:
- Add routing logic in `apps/web/src/app/(dashboard)/inbox/captures/[id]/page.tsx` and `apps/mobile/app/inbox/[id].tsx` that detects the type of action applied (`captureActionType`).
- Instead of calling the regular `applyCapture` mutation which immediately executes on the server, intercept 'schedule' or 'create_event' actions.
- Redirect to the Timeline or Calendar page while passing query parameters or using a global state store (Zustand/Context) to hydrate the `EventDialog` with the extracted `preview_payload` (title, description, start time, end time).

---

## [FEAT-20260302-002] Intégration Pronote (Calendrier & Inbox IA)
**Logged**: 2026-03-02
**Priority**: high
**Status**: pending
**Area**: backend / integrations

### Requested Capability
Connecter l'application à Pronote pour récupérer l'emploi du temps, les messages et le cahier de texte. 
Le but est d'afficher le calendrier Pronote directement dans l'application, faire remonter les communications Pronote dans la boîte de réception (Inbox), et surtout permettre à l'IA d'analyser le cahier de texte pour planifier intelligemment des sessions de devoirs ou d'exercices dans le calendrier de l'utilisateur.

### User Context
"ajouter la connexion a pronote por le calendrier.. ce sera une dinguerie ça... pour pouvoir ce genre de truc ""ça veut dire que dans mon app calendrier je pourrais afficher le calendrier pronote, dans l'inbox de mon app, il y a es message pronote et communication, et l'ia peut consulter le cahier de texte pour placer des sesison exercice dans mon calendrier genre (c'est un calendrier IA mon app)"""

### Suggested Implementation
- Créer un service d'intégration backend (ex: scrapers ou API non-officielle Pronote via Python/JS) pour synchroniser périodiquement (ou à la demande) les données de session de l'élève.
- Mapper les événements de cours Pronote vers le modèle `Event` du calendrier (en lecture seule visuellement, ou avec un tag système spécifique).
- Transformer les items du cahier de texte et les messages en `Capture` dans l'Inbox avec des sources spécifiques (`source: "pronote"`).
- Créer un agent/pipeline IA dédié à l'analyse du cahier de texte qui va suggérer (via les actions) la création de sous-tâches ou de blocs de révision dans le calendrier.

---

## [FEAT-20260302-003] Composer UI Enrichie (Voice, Context, Agents)
**Logged**: 2026-03-02
**Priority**: low
**Status**: pending
**Area**: mobile / ui / ai-elements

### Requested Capability
Transformer le `Composer` de chat en un véritable centre de commande AI.
1. **Menu '+' (Gauche)** : Uploader fichier, photo, lien, ou mentionner l'Inbox dans le contexte.
2. **Microphone (Droite)** : Activer la dictée `Voxtral` avec effet "listening" dans le champ, la transcription textuelle s'affichant pour édition avant envoi. Remplacé par le bouton "Envoyer" quand du texte est présent.
3. **Commandes avancées** : Mentions de contexte (`@`) ou slash commands (`/`).
4. **Deep Research & Agents** : Possibilité d'invoquer des recherches longues ou de basculer sur des agents spécialisés depuis l'UI.

### User Context
"un micro qui sera en fait un bouton qui utilisera voxtral pour la transcription... bouton + qui ouvrira un menu... deep research si qqun a besoin d'un plan énorme"

### Suggested Implementation
- Créer des états locaux pour `isListening` dans `Composer.tsx`.
- Intégrer un module de BottomSheet (type Gorhom) pour le menu `+`.
- Développer/Intégrer le package Voxtral pour le streaming audio-to-text.
