# 00_momentarise_brief_for_deep_research.md

## Objectif
Donner à une IA de deep research le contexte minimal mais suffisant pour comprendre Momentarise avant de proposer des plans d’architecture ou de refonte.

## 1. Produit
Momentarise est une application orientée :
- capture
- organisation
- planification
- exécution
- mémoire personnelle / opérationnelle
- assistant IA central nommé Sync

## 2. Positionnement
Le produit vise une expérience “OpenClaw-like in-app” :
- très puissant
- très contextuel
- multi-surfaces
- mais borné à l’environnement de l’application

Le produit ne vise pas un agent système qui contrôle l’ordinateur.
Le périmètre est l’app, ses données, ses connecteurs, ses objets métier et ses canaux.

## 3. Stack cible
- Web : Next.js avec BFF
- Mobile : Expo / React Native
- Backend métier : FastAPI
- DB : PostgreSQL
- LLM Gateway : LiteLLM Proxy
- Runtime IA : Sync Core

## 4. Objets métier principaux
- Capture
- Inbox item
- Moment
- Project
- Series
- Notifications
- Automations
- AgentProfiles
- mémoire / docs / chunks

## 5. Vision IA
Sync est un runtime unique avec :
- plusieurs surfaces
- plusieurs modes
- plusieurs sous-agents / AgentProfiles
- plusieurs toolsets
- mémoire hors contexte
- preview / apply / undo

## 6. Surfaces principales
- chat principal
- capture assistant
- moment coach
- canaux externes

## 7. Modes principaux
- free
- plan
- deep_plan
- assistive
- automation

## 8. Règle fondamentale
Toute mutation métier importante doit passer par :
preview -> apply -> undo

## 9. Mémoire
La mémoire ne doit pas être injectée en masse.
Elle doit être recherchée à la demande via retrieval et injectée par snippets avec provenance.

## 10. Philosophie OpenClaw à copier
- PromptComposer modulaire
- prompt modes `full|minimal|none`
- bootstrap files injectés
- context inspector
- mémoire hors contexte
- hard enforcement côté code
- sous-agents spécialisés
- skills / AgentProfiles
- logs / replay / snapshots

## 11. Ce que la deep research doit produire
La deep research ne doit pas juste proposer “une architecture jolie”.
Elle doit produire :
- décisions à figer
- alternatives
- risques
- spec DB
- spec API
- spec runtime
- spec UX
- stratégie de migration depuis Sync actuel

## 12. Ce que la deep research doit éviter
- repartir de zéro inutilement
- casser l’existant
- ignorer les contraintes produit réelles
- inventer des capacités métier non encore supportées sans les signaler
- mélanger vision finale et slices implémentables

## 13. Vérité produit supplémentaire — mobile et blocs métiers

### Mobile
Momentarise n’est pas un produit web classique adapté ensuite au mobile.
Le mobile est une surface centrale pour :
- capture
- exécution
- proactivité
- widgets
- notifications
- quick undo
- reprogrammation rapide

### Moments
Chaque Moment possède au minimum trois onglets :
- `Détails`
- `Contenu`
- `Coach`

### Contenu du Moment
L’onglet `Contenu` est un assemblage ordonné de blocs métiers.
Exemples initiaux :
- `checklist_block`
- `text_block`
- `link_block`

À terme, les Moments et leurs blocs seront majoritairement construits par l’IA,
même si l’utilisateur peut encore les éditer manuellement.

### Conséquence
Sync ne construit pas seulement :
- des événements calendaires
- des notes
- des rappels

Il construit aussi du contenu exécutable à l’intérieur des Moments.

## 14. Vérité produit supplémentaire — blocs métiers

Le système de blocs métiers est une partie structurante de Momentarise.

### Points clés
- il existe environ 20 à 22 blocs métiers visés
- les blocs servent à structurer et suivre l’exécution d’un Moment
- ils restent optionnels pour l’utilisateur
- ils ne doivent pas créer un sentiment de contrôle forcé
- ils deviennent très puissants pour les users qui veulent un suivi fin
- à terme, l’IA doit pouvoir construire et enrichir ces blocs
- l’UI/UX des blocs est un chantier difficile et central

### Conséquence
Toute architecture Sync ou deep research qui ignore les blocs métiers
ratera une partie importante du produit.
