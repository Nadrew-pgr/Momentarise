Oui — et je réponds d’abord au point que j’avais laissé en suspens sur les interactions type `@`.

### `@`, boutons, choix rapides dans les apps de messagerie tierces
Ce ne sera **pas uniforme** selon le canal.

**Telegram** est de loin le plus flexible : inline mode avec `@botname`, claviers de réponse, inline keyboards, callback buttons, et même Mini Apps/Web Apps. Donc pour une UX “quasi in-app” ou des raccourcis structurés, Telegram est très favorable.

**WhatsApp Business** supporte bien des interactions structurées, mais plutôt sous forme de **reply buttons** et **list messages**. C’est très utile pour des choix simples, moins pour une UX riche type `@mention` libre comme Telegram. Les messages interactifs ne sont pas pensés comme des notifications hors fenêtre libre ; ils sont encadrés.

**Instagram Business** doit être traité avec plus de prudence : il existe des possibilités d’automatisation / réponses via l’écosystème Meta, mais ce n’est pas un terrain aussi souple et clair que Telegram pour des interactions structurées générales. Je garderais Instagram en canal plus borné au début.

Donc, en pratique :
- **Telegram** : oui pour une vraie UX structurée avec boutons, options, mini app, et même logique proche de `@`.
- **WhatsApp** : oui pour boutons/listes/choix rapides, non comme clone de l’UX Telegram.
- **Instagram Business** : canal plus limité et à encadrer fort en V1/V1.5.

Maintenant, je continue avec la **part 2 du doc 12**.

---
# 8. CALENDRIER INTERNE ET CONNECTEURS CALENDRIER

# 8.1 internal_calendar_core

## Nature
- cœur métier interne
- source de vérité produit
- source mémoire
- source de trigger
- cible naturelle de preview / apply / undo

## Rôle produit
Le calendrier interne Momentarise sert à :
- porter les Moments
- porter leur structure temporelle
- supporter planification et exécution
- supporter rappels / reprogrammation / suivi
- centraliser la logique métier temps / disponibilité / exécution

## Capacité V1
- lecture
- preview d’événement / Moment
- apply interne
- undo si possible
- déclencheurs temporels
- support de planification simple et riche plus tard

## Règle
Le calendrier interne ne doit jamais être traité comme un simple connecteur.
C’est une base du produit.

---

# 8.2 external_calendar_connectors

## Nature
- connecteurs externes
- sources de lecture
- sources de disponibilité
- sources potentielles de synchronisation
- sinks potentiels plus tard

## Systèmes visés
- Google Calendar
- Microsoft Calendar
- calendriers natifs iOS / Android si pertinents
- autres calendriers externes plus tard

## Rôle produit
Les connecteurs calendrier externes servent à :
- lire des événements
- enrichir la disponibilité
- détecter conflits
- importer / refléter
- éventuellement exporter certains artefacts internes

## V1
La priorité doit être :
- lecture / disponibilité / conflit
- import léger ou synchronisation prudente
- pas de promesse de sync parfaite multi-sens dès le départ

## Règle
Il faut distinguer clairement :
- calendrier interne = vérité produit
- calendrier externe = connecteur partiel

---

# 9. MAPS / TRAJETS

# 9.1 maps_travel

## Nature
- connecteur externe
- service d’enrichissement
- provider de calcul
- tool-support service

## Rôle produit
Maps / trajet sert à :
- estimer temps de trajet
- calculer buffer
- proposer heure de départ
- enrichir un preview de Moment / événement
- aider à la planification concrète

## Ce que ce n’est pas
Ce n’est pas :
- une surface
- un canal
- un espace de conversation
- une mémoire autonome principale

## Modes pertinents
- `plan`
- `deep*plan`
- `assistive`
- `automation` dans certains cas
- ponctuellement `free`

## Règle
Le modèle raisonne sur le besoin.
Le tool / service calcule le trajet.
Le runtime décide si cela influence le preview ou l’apply.

---

# 10. WEB SEARCH

# 10.1 web_search

## Nature
- connecteur externe
- tool d’enrichissement
- source d’information externe
- source ponctuelle de contexte

## Rôle produit
Web search sert à :
- vérifier une info
- compléter une capture
- aider plan / deep_plan
- nourrir une synthèse
- enrichir une proposition
- vérifier un contexte pratique

## Modes pertinents
- `free`
- `plan`
- `deep*plan`
- `assistive`
- parfois `automation` mais très borné

## Règle
Le résultat du web search ne doit pas être injecté en masse.
Il doit être :
- sélectionné
- synthétisé
- tracé
- cité ou attribué si nécessaire selon la surface

---

# 11. DEEP RESEARCH PROVIDER CAPABILITY

# 11.1 deep_research_capability

## Nature
- capacité provider
- pas une surface
- pas un simple web search
- pas un simple modèle de chat

## Rôle produit
La capacité deep research peut servir à :
- recherche longue
- recherche multi-source
- génération de rapport
- génération de plan riche
- éventuellement usage d’outils selon provider

## Distinctions importantes
Il faut distinguer :
- deep research avec tools
- deep research report-first
- long-context reasoning simple
- plan mode normal

## Règle
`deep_plan` peut s’appuyer sur cette capacité,
mais ne doit pas être réduit à “un appel deep research brut”.

---

# 12. CAPTURES

# 12.1 captures

## Nature
- objet métier central
- point d’entrée de capture
- source mémoire
- source de trigger
- support de routage
- support d’assistive mode

## Rôle produit
Une capture peut être :
- une note rapide
- une photo
- un screenshot
- un lien
- un document
- un signal d’action
- une source d’inspiration
- un déclencheur de création d’artefact

## V1
Les captures doivent pouvoir :
- être stockées
- être classées
- être résumées
- être reliées à des objets
- générer des suggestions
- générer des previews
- être routées vers des agents ou scopes

## Règle
La capture est un des cœurs du produit.
Le système capture ne doit pas être vu comme “juste une inbox”.

---

# 13. MOMENTS

# 13.1 moments_as_source_and_target

## Nature
- objet métier central
- source mémoire
- source de trigger
- cible de preview / apply / undo
- support d’exécution live

## Rôle produit
Les Moments peuvent :
- être lus
- être enrichis
- être prévisualisés
- être créés
- être modifiés
- être exécutés
- générer des événements / signaux
- servir de scope de coach

## Triggers associés possibles
- moment_starting_soon
- moment_started
- moment_finished
- moment_reprogrammed
- moment_drift_detected plus tard

## Règle
Le Moment est un objet plus riche qu’un simple événement calendrier.

---

# 14. INBOX ITEMS / NOTES

# 14.1 inbox_items_notes

## Nature
- objet métier interne
- source mémoire
- cible de preview / apply
- sink simple de transformation

## Rôle produit
Les inbox items / notes servent à :
- capturer vite
- stocker une idée
- matérialiser un résultat simple
- servir de sortie safe d’un agent ou d’une automation
- préparer une transformation ultérieure

## Règle
C’est l’un des sinks les plus safe pour :
- proactivité
- email summaries
- capture transforms
- suggestions non encore planifiées

---

# 15. DOCUMENTS / LIENS EXTERNES

# 15.1 external_docs_links

## Nature
- source mémoire
- source de retrieval
- support de capture
- support de deep_plan
- support de coaching spécialisé

## Rôle produit
Permettre à Sync de :
- conserver une source
- la résumer
- la rattacher à un scope
- la rappeler plus tard
- l’utiliser dans un plan ou un Moment

## Règle
Un lien ou document externe ne doit pas devenir automatiquement un énorme contexte injecté.
Il doit passer par ingestion / résumé / retrieval.

---

# 16. REPORTS / DEEP PLANS / SYNTHÈSES

# 16.1 reports_and_deep_plans

## Nature
- artefacts internes
- source mémoire
- source de retrieval
- parfois sink final d’un run deep_plan
- support de transformation vers objets métier

## Rôle produit
Ces artefacts servent à :
- garder trace
- relire
- transformer plus tard
- découper en actions
- servir de contexte stable

## Règle
Un rapport ou deep plan doit pouvoir exister :
- sans application immédiate
- avec application partielle
- ou comme étape intermédiaire vers plan / automations / Moments

---

# 17. SCHEDULER

# 17.1 scheduler

## Nature
- sous-système runtime
- source de trigger
- pas une surface
- pas un canal

## Rôle produit
Le scheduler sert à :
- lancer des jobs
- déclencher des runs
- rappeler
- préparer des revues
- réveiller Sync à des moments déterminés

## Règle
Le scheduler ne porte pas la logique conversationnelle.
Il déclenche le runtime.

---

# 18. HEARTBEAT

# 18.1 heartbeat

## Nature
- sous-système runtime
- source de trigger périodique
- mécanisme de proactivité légère

## Rôle produit
Le heartbeat sert à :
- faire des checks légers
- détecter s’il faut relancer
- regarder les follow-ups
- alimenter la proactivité

## Règle
Le heartbeat ne doit pas être confondu avec :
- automations utilisateur complètes
- deep_plan
- scheduler classique
Il est plus léger et plus fréquent.

---

# 19. EVENT TRIGGERS

# 19.1 event_triggers

## Nature
- mécanisme runtime
- source de déclenchement
- pas une surface
- pas un canal

## Exemples
- capture_created
- inbox_item_created
- email_received
- watchlist_match
- moment_started
- moment_finished
- calendar_conflict_detected
- sync_action_completed

## Règle
Les event triggers doivent être normalisés,
sinon la proactivité et les automations deviennent chaotiques.

---

# 20. FUTURE SYSTEMS

# 20.1 git_commits_repo_signals

## Nature
- connecteur futur
- source mémoire
- source de trigger
- support de blocs / exécution live / coaching build

## Rôle produit
Plus tard, permettre à Sync de :
- voir qu’un projet avance
- alimenter un Moment de build
- mettre à jour certains blocs
- générer un suivi

## Règle
À garder explicitement dans le radar,
mais pas à sur-prioriser en V1.

---

# 20.2 docs_changelogs_watchlists

## Nature
- sources externes
- sources mémoire
- sources de trigger
- support fort d’automations

## Rôle produit
Permettre :
- veille
- surveillance de changements
- détection d’événements pertinents
- transformation en notification, note ou tâche

---

# 20.3 external_content_analytics

## Nature
- source externe future
- source mémoire spécialisée
- support de domain-coach

## Exemples
- analytics contenu
- performances posts
- métriques campagne
- signaux d’audience

## Règle
Très utile pour agents spécialisés,
pas forcément noyau V1.

---

# 21. MATRICE DE RESPONSABILITÉ — PART 2

## 21.1 internal_calendar_core
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.2 external_calendar_connectors
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : potentiellement oui
- Trigger source : potentiellement oui
- Sink : potentiellement oui
- Apply target : selon policy

## 21.3 maps_travel
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : non principale
- Trigger source : non
- Sink : non
- Tool enrichment : oui

## 21.4 web_search
- Surface : non
- Channel : non
- Connecteur : oui
- Source mémoire : indirectement oui après ingestion/résumé
- Trigger source : non direct
- Sink : non
- Tool enrichment : oui

## 21.5 deep_research_capability
- Surface : non
- Channel : non
- Connecteur : capacité provider
- Source mémoire : indirectement oui via artefacts produits
- Trigger source : non direct
- Sink : non
- Tool enrichment : oui

## 21.6 captures
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : parfois transformation interne

## 21.7 moments
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.8 inbox_items_notes
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : oui
- Sink : oui
- Apply target : oui

## 21.9 external_docs_links
- Surface : non
- Channel : non
- Connecteur : indirect
- Source mémoire : oui
- Trigger source : parfois
- Sink : non
- Apply target : non direct

## 21.10 reports_and_deep_plans
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : oui
- Trigger source : parfois
- Sink : oui
- Apply target : indirect via transformation

## 21.11 scheduler
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

## 21.12 heartbeat
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

## 21.13 event_triggers
- Surface : non
- Channel : non
- Connecteur : non
- Source mémoire : non
- Trigger source : oui
- Sink : non

---

# 22. RÈGLES GLOBALES DU DOC 12

1. Le calendrier interne est un cœur métier, pas un connecteur.
2. Les connecteurs externes doivent être séparés du cœur métier.
3. Toutes les sources ne sont pas des surfaces.
4. Tous les canaux ne sont pas des surfaces de travail riches.
5. Toutes les sources mémoire ne doivent pas être injectées directement.
6. Les triggers doivent être traités comme une couche explicite du runtime.
7. Les systèmes futurs doivent être mentionnés pour éviter les impasses de design.

---

Là, on a un **doc 12 proprement entamé en 2 parties**.

Le plus intelligent maintenant, selon moi, c’est :
- soit tu relis le doc 12 part 1 + part 2 et on corrige
- soit on revient à ce qu’on avait dit qu’il restait à traiter hors plan/FSM/automations/agents

Et dans ce “reste”, le prochain gros bloc que je vois encore insuffisamment cadré, c’est :

## **la couche produit/UX globale de Sync**
Pas juste les modes, mais :
- où l’utilisateur voit quoi,
- comment il comprend l’autonomie,
- comment il comprend la mémoire,
- comment il comprend les agents,
- comment il comprend la proactivité,
- comment il comprend l’historique / la trace / les actions de Sync.

C’est un vrai bloc manquant pour le jumeau OpenClaw in-app.
