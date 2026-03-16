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

---

## [FEAT-20260303-004] Inbox/Capture — Contexte, web research et connecteurs pilotés par sous-agent Sync
**Logged**: 2026-03-03
**Priority**: high
**Status**: pending
**Area**: backend / ai / inbox

### Requested Capability
Permettre au pipeline Inbox/Capture de s’appuyer sur un sous-agent Sync configurable (type OpenClaw) capable d’activer progressivement la recherche de contexte, la recherche web et des enrichissements via connecteurs.

### User Context
Demande explicite de préparer une structure de sous-agent Sync avec prompt builder dynamique, agents utilisateur, et mention produit \"bientôt\" pour les capacités de contexte/web/enrichissements/connecteurs.

### Suggested Implementation
- Finaliser `CaptureSubAgentRuntime` avec routage par préférences utilisateur (`capture_default_agent_id`, règles de routage).
- Activer les modules par feature flags (`CAPTURE_CONTEXT_ENRICHMENT_ENABLED`, `CAPTURE_WEB_RESEARCH_ENABLED`, `CAPTURE_SUBAGENT_ROUTING_ENABLED`).
- Ajouter des tool adapters pour web/context/connecteurs avec policy stricte (`proposal_only` vs `auto_if_safe`).
- Conserver des snapshots auditables (prompt/toolset/retrieval) pour chaque analyse capture.

---

## [FEAT-20260305-001] Journal de trading (discipline + performance) via Inbox/Timeline
**Logged**: 2026-03-05T13:41:13+01:00
**Priority**: high
**Status**: pending
**Area**: backend / frontend / analytics

### Requested Capability
Ajouter un cas d'usage "journal de trading" dans Momentarise pour suivre la discipline d'execution et la performance, avec saisie manuelle assistee par IA, support multi-marches (crypto, actions, forex, futures), et dashboard d'analytics avance.

### User Context
"idee de cas d'usage : journal de trading"

### Suggested Implementation
- Reutiliser Inbox pour capturer les entrees de trades (texte/voice/photo) avec extraction IA de champs structures (marche, instrument, side, entree/sortie, taille, stop, take profit, setup, emotion, erreurs).
- Ajouter un type/categorie dedie dans le pipeline capture pour les journaux de trading et produire des suggestions d'actions (creer trade, planifier review, tagger erreur recurrente).
- Reutiliser Timeline pour planifier et suivre les sessions (pre-market, execution window, post-trade review) et lier chaque session aux captures/trades associes.
- Exposer un dashboard avance (winrate, expectancy, profit factor, drawdown, R moyen, filtres par marche/setup/heure/emotion) avec comparatifs de performance et discipline.
- Garder V1 en saisie manuelle + IA, sans dependre d'integration broker API obligatoire.

### Metadata
- See Also: `project/docs/self-improvement.md`

## [FEAT-20260306-001] Studio Moment > Contenu inspiré Stitch
**Logged**: 2026-03-06T23:40:26+01:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Requested Capability
Transformer `Moment > Contenu` en studio de création/édition de blocks métiers avec starter kits, quick update, fullscreen web et barre d'actions mobile.

### User Context
Demande explicite d'une refonte "plus belle/agréable/qui donnait envie de créer des moments", en s'appuyant réellement sur les écrans Stitch générés pour la structure de l'expérience.

### Suggested Implementation
- Web: onglet `Contenu` = preview compact puis ouverture d'un studio fullscreen avec header fort, tuiles analytics réelles, canvas de blocks et rail sticky de création.
- Mobile: studio directement dans la page Moment avec header hiérarchisé, canvas compact, barre fixe basse `Add block` / `Quick update`, plus deux bottom sheets dédiés.
- Shared: presets `LinkedIn Post`, `Workout Log`, `Weekly Review`, previews éditoriales, logique `Quick update` appliquée aux blocks existants.

### Metadata
- See Also: `LRN-20260306-007`
---

## [FEAT-20260307-001] Runtime logging depuis FAB et voix vers le Moment en cours
**Logged**: 2026-03-07T11:44:00+01:00
**Priority**: high
**Status**: pending
**Area**: frontend / mobile / ai / product

### Requested Capability
Permettre d’ajouter des logs et ajustements d’exécution d’un Moment depuis les entrypoints globaux (`FAB`, voix, capture rapide), pas seulement depuis le studio `Moment > Contenu`.

### User Context
"Et en vrai les logs devraient être permis depuis le FAB + avec la voix etc, par exemple j'ai prévu un moment revue de code d'une heure à 17h il est 17h30 j'estime qu'il faut qu'on ajoute une étape"

### Suggested Implementation
- Introduire un flow de `runtime update` accessible depuis le FAB web/mobile et depuis la capture vocale.
- Au déclenchement, résoudre le `Moment` cible via priorité: moment en tracking > moment en cours temporellement > dernier moment ouvert > sélection explicite utilisateur.
- La capture runtime ne crée pas un système parallèle: elle produit un patch sur les `BusinessBlock[]` du moment ciblé (`task_block`, `text_block`, `status_block`, `scale_block`, etc.).
- Si l’intention détectée est structurelle (ex: "ajoute une étape de revue API"), créer/insérer un block; si elle est évaluative (ex: énergie, progrès, blocage), mettre à jour les blocks réservés du runtime.
- La voix passe d’abord par transcription, puis par une étape d’interprétation légère pour proposer soit `patch current moment`, soit `create inbox capture`, soit `ask target moment` si ambigu.

### Metadata
- See Also: `FEAT-20260306-001`, `FEAT-20260302-003`
---
## [FEAT-20260309-001] Moment Content Studio compact Builder/Run (web + mobile)
**Logged**: 2026-03-09T20:37:04+01:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Requested Capability
Refondre `Moment > Contenu` avec un mode `Builder` et un mode `Run`, UI compacte (header réduit, input IA placeholder, métriques en pills), blocks denses, et `Quick update` limité aux signaux runtime (`status`, `energy`, `progress delta`, `next action`) sans entité log séparée.

### User Context
L’utilisateur a demandé une implémentation complète du plan V2.2 avec vraie refonte mobile, auto-activation run mode (`tracking` ou plage horaire), conserver les endpoints existants, et rendre le studio plus minimaliste et agréable à utiliser.

### Suggested Implementation
- Étendre `scale_block` de manière additive (`unit`, `target`, `step`, `display_mode`).
- Introduire `ContentRenderMode` + `resolveContentRenderMode` partagé.
- Introduire un moteur partagé `applyRuntimeUpdateDraft` utilisé par les sheets Update web/mobile.
- Basculer `Moment > Contenu` web et mobile sur ce mode partagé, avec toggle manuel `Builder/Run`.
- Densifier les cards blocks et prioriser le rendu runtime compact (`checklist`, `scale`, `set`, `status`, `task`, `metric`, `inbox`).

### Metadata
- See Also: `FEAT-20260306-001`, `FEAT-20260307-001`
---
