# Recouvrement de Conversation (Inaccessible via UI)
**Titre :** Interactive Plan Mode UI (S4-Interactive)
**ID :** fe171ade-0e15-4aea-a36e-c46753bf9be5
**Date :** 7 Mars 2026
**Status :** Récupéré depuis les artifacts du "Brain" Antigravity.

---

## 📝 Résumé de la Session
Cette session était focalisée sur l'implémentation du **Lot S4 : Plan Mode (Guided Chat)**, avec une extension majeure vers un **Mode Interactif**. L'objectif était de permettre à l'IA de poser des questions structurées (via l'outil `ask_question`) avec des options cliquables directement dans le chat, plutôt que de simplement proposer un plan passif.

### Points Clés :
- Introduction de l'outil `ask_question` backend.
- UI "Interactive Question" au-dessus du composer (Web & Mobile).
- Gestion de l'état `waiting_answer` dans l'orchestrateur.
- Signature visuelle "Liquid Glass" harmonisée.

---

## 🏗️ Plan d'Implémentation Retrouvé

### [Backend] (apps/api)
- **tool_registry.py** : Ajout de `ask_question(prompt, options, help_text)`.
- **tool_executor.py** : Logique de création de `AIQuestion` en base.
- **orchestrator.py** : Émission de l'event `question` et blocage du run en attente de réponse.
- **system_prompt.py** : Instructions pour privilégier `ask_question` lors de manques critiques.

### [Web] (apps/web)
- **chat-shell.tsx** : Gestion de l'event `type="question"` et état `latestQuestion`.
- **interactive-question-ui.tsx** (NOUVEAU) : Composant glassmorphe affichant les chips (options) avec animation Framer Motion.

### [Mobile] (apps/mobile)
- **sync.tsx** : Parité fonctionnelle pour l'affichage des questions interactives et des options au-dessus du clavier.

---

## ✅ Walkthrough de Validation

### Changements effectués :
1. **Web UI** : Toggle "Normal/Plan" dans le composer, icônes Zap/ClipboardList, persistance `localStorage`.
2. **Backend** : "Guided Planning Policy" intégrée au system prompt, auto-activation hint pour les intentions complexes en mode Normal.
3. **Mobile UI** : `RunModeSelector` en bottom-sheet, badge de mode dans le header.

### Résultats des tests :
- [x] Le toggle change bien le mode envoyé à l'API (`mode: "guided"`).
- [x] L'orchestrateur injecte les instructions de planning quand nécessaire.
- [x] L'UI mobile est cohérente avec le Web.

---

## ⚠️ Notes Techniques & Gaps Identifiés
- **Undo/Apply** : Besoin d'un event `undone` explicite dans le stream pour un meilleur replay UI.
- **i18n** : Des chaînes restaient hardcodées dans `preview-plan-card.tsx` (ex: "Horaire", "Cible").
- **Mobile** : Le mapping `preview_id <-> change_id` pour l'undo mobile nécessitait une fiabilisation (Lot P1).

---

> [!IMPORTANT]
> Ce document a été généré car la conversation originale était bloquée au chargement dans l'interface Antigravity. Le contenu a été reconstruit fidèlement à partir des plans et walkthroughs générés durant la session.
