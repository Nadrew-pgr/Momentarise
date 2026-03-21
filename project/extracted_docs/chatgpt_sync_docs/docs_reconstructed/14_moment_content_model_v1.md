# 14_moment_content_model_v1.md

## Statut
Draft v0.2 — revised content model for Moments

## Objectif
Définir un modèle de contenu de Moment :
- suffisamment structuré pour être utile à l’exécution réelle
- suffisamment riche pour préserver la vision d’origine des business blocks
- suffisamment discipliné pour rester codable rapidement
- suffisamment clair pour ne pas devenir un “studio d’admin” illisible

Ce document remplace deux mauvaises directions :
- un “block engine universel” trop abstrait
- un modèle trop simplifié qui casserait la valeur métier des Moments

La direction retenue est :
- **business blocks conservés**
- **taxonomie visible réduite**
- **grammaire produit clarifiée**
- **raw blocks + preset blocks + starter kits**
- **Run séparé du Studio/Build**
- **Coach comme assistance contextualisée**
- **Quick update supprimé comme concept UI distinct**

# 19. CORRECTIONS IMPORTANTES SUR LES BLOCKS VIVANTS

## 19.1 `timer_block` est conservé comme raw block vivant
### Décision
Le `timer_block` n’est pas relégué au rang de bloc utilitaire secondaire.

### Pourquoi
Il a une vraie utilité produit en exécution réelle, par exemple pour :
- pause entre deux sets
- sprint de travail
- intervalle court
- respiration
- cadence de travail
- micro-focus

### Règle
Le `timer_block` est un **raw block vivant**.
Il doit être pensé comme un bloc d’exécution,
pas comme un simple champ technique.

## 19.2 Focus mode plus tard
Le produit devra réfléchir plus tard à un vrai `focus mode`.

### Distinction
Il faut distinguer :
- **focus mode UX** dans l’app
- éventuelle intégration système plus profonde plus tard

### V1
En V1, le focus mode peut être traité comme :
- un changement UI/UX
- une densité plus faible
- moins de distractions
- une lecture/exécution plus directe du Moment

### Plus tard
Une intégration système plus forte pourra être étudiée séparément,
mais elle ne fait pas partie du contrat V1 du contenu de Moment.

# 25. CAPACITE GLOBALE DE SYNC SUR LES MOMENTS

## 25.1 Décision
Les capacités de construction et de modification des Moments ne doivent pas être réservées uniquement :
- au `Coach`
- ou au `Studio assistant`

`Sync` global doit aussi pouvoir agir sur les Moments dans toute leur profondeur,
y compris hors de l’UI locale du Moment.

## 25.2 Principe
Il existe un **même noyau de capacité Sync** concernant les Moments.

Ce noyau peut être exposé via plusieurs surfaces :
- `Sync` global
- `Studio assistant`
- `Coach`

La différence entre ces surfaces n’est pas une différence fondamentale de pouvoir,
mais surtout de :
- contexte déjà attaché
- posture d’usage
- UX locale
- granularité d’interaction

## 25.3 Ce que Sync global doit pouvoir faire
Selon le contexte, le mode et les permissions,
`Sync` doit pouvoir :

- créer un Moment complet
- modifier un ou plusieurs Moments
- restructurer un Moment
- ajouter, supprimer ou réordonner des blocks
- modifier l’intérieur des blocks
- préremplir certains contenus
- construire uniquement une structure
- construire une structure + draft
- compléter un Moment à partir des habitudes ou préférences connues de l’utilisateur
- agir sur plusieurs Moments si la demande le justifie

## 25.4 Portée de modification
`Sync` doit pouvoir agir sur :
- le niveau Moment
- le niveau section
- le niveau block
- le niveau contenu interne du block

### Exemples
- modifier la structure entière d’un Moment
- préremplir plusieurs `text_block`
- ajouter une section avec plusieurs blocks
- compléter un `set_block`
- ajouter des questions et des zones de réponse
- transformer une capture en contenu réparti dans plusieurs blocks

## 25.5 Différence entre surfaces spécialisées
### `Studio assistant`
Aide surtout à :
- construire
- structurer
- préremplir
- organiser les blocks
- choisir des presets / starter kits

### `Coach`
Aide surtout à :
- exécuter
- ajuster en cours de route
- relire le réel
- proposer des modifications situées

### `Sync` global
Aide surtout à :
- traiter des demandes transversales
- planifier / deep planifier
- travailler sur plusieurs objets
- créer ou modifier un ou plusieurs Moments sans être déjà localisé dans l’écran Moment

## 25.6 Règle produit
Le produit ne doit jamais créer la situation suivante :
- `Coach` peut faire quelque chose sur un Moment
- `Studio assistant` peut faire quelque chose sur un Moment
- mais `Sync` global ne peut pas le faire alors que la demande et le contexte le permettent

## 25.7 Règle UX
Même si la capacité de fond est partagée,
les surfaces gardent leur clarté :

- `Sync` global = surface générale et transverse
- `Studio assistant` = Sync contextualisé à la construction
- `Coach` = Sync contextualisé à l’exécution

## 25.8 Règle de sécurité et de contrôle
Toute modification significative proposée par `Sync`,
quelle que soit la surface,
doit rester gouvernée par :
- preview
- apply
- undo si possible

## 25.9 Conséquence pour `plan` / `deep_plan`
En mode `plan` ou `deep_plan`,
`Sync` doit pouvoir :
- préparer un ou plusieurs Moments
- configurer leur contenu
- remplir les blocks
- produire seulement la structure ou un remplissage complet selon la demande de l’utilisateur

### Exemple
Pour un Moment de création de posts LinkedIn,
`Sync` peut :
- créer la structure des sections
- ajouter les bons blocks
- préremplir un draft
- ou seulement préparer la structure,
selon ce que l’utilisateur demande explicitement

# 26. MAPPING DES TYPES ACTUELS VERS LA GRAMMAIRE CIBLE

## 26.1 Objectif
Ce mapping sert à clarifier, pour chaque type actuel :

- son statut cible
- sa place produit
- s’il reste un raw block
- s’il devient un preset
- s’il doit être supprimé à terme
- et comment migrer sans casser l’existant

## 26.2 Légende
### Statuts utilisés
- `RAW_CORE` : primitive centrale assumée dans la grammaire produit
- `RAW_SECONDARY` : primitive conservée mais moins centrale dans l’UX
- `PRESET_TARGET` : type existant qui doit évoluer vers preset
- `REMOVE_TARGET` : type à sortir de la création visible puis à supprimer
- `DEPRECATE_TARGET` : type à faire disparaître progressivement au profit d’un autre type

## 26.3 Mapping détaillé

### `text_block`
- Statut cible : `RAW_CORE`
- Rôle produit : bloc narratif central, riche et vivant
- Build : éditeur riche
- Run : éditeur riche également
- Direction :
  - BlockNoteJS sur web
  - Tiptap sur mobile
  - support du label
  - placeholder / contenu initial plus tard
  - peut servir de base à de nombreux presets
- Décision : reste une primitive majeure

### `checklist_block`
- Statut cible : `RAW_CORE`
- Rôle produit cible : bloc d’actions / exécution
- Décision :
  - le comportement actuel de `checklist_block` est conservé
  - il devient le nouveau `task_block` produit
- Règle :
  - la primitive cible garde le nom `task_block`
  - mais sa logique est celle de l’actuel `checklist_block`

### `section_block`
- Statut cible : `RAW_CORE`
- Rôle produit : conteneur léger de groupement
- État actuel : n’existe pas encore comme type séparé
- Cible :
  - grouper plusieurs blocks dans une même carte logique
  - améliorer le scan en Run
  - permettre un traitement “section en cours”
- Décision : nouveau raw block à introduire

### `status_block`
- Statut cible : `RAW_CORE`
- Rôle produit : état de trajectoire / santé du Moment
- Run : vivant
- Décision : reste un bloc runtime fort

### `scale_block`
- Statut cible : `RAW_CORE`
- Rôle produit cible : **`metric`**
- Run : vivant
- Direction :
  - le bloc produit visible s’appelle `Metric`
  - on part de l’actuel `scale_block`
  - il porte les usages score / énergie / progression / signal selon le contexte
- Décision :
  - l’actuel `scale_block` devient la base du futur `metric` produit

### `metric_block`
- Statut cible : `DEPRECATE_TARGET`
- Rôle produit actuel : progression / score / mesure
- Problème :
  - doublon conceptuel avec `scale_block`
- Décision :
  - l’ancien `metric_block` doit disparaître
  - ses usages doivent converger vers le bloc produit `Metric` fondé sur `scale_block`

### `task_block` (ancien)
- Statut cible : `REMOVE_TARGET`
- Rôle produit actuel : action unique avec `title / status / due_at`
- Problème :
  - doublon de rôle avec le futur `task_block` fondé sur l’actuel `checklist_block`
- Décision :
  - l’ancien `task_block` disparaît
  - le nom `task_block` est réattribué à la logique de l’actuel `checklist_block`

### `set_block`
- Statut cible : `RAW_CORE`
- Rôle produit : bloc métier structuré de sport / répétitions / logs de série
- Run : vivant
- Direction :
  - garder
  - enrichir plus tard avec `prévu vs réel`
  - permettre capture vocale contextuelle vers le bon set
- Décision : bloc métier central à préserver

### `timer_block`
- Statut cible : `RAW_CORE`
- Rôle produit : chrono vivant d’exécution
- Run : vivant
- Exemples :
  - repos entre sets
  - sprint de focus
  - intervalle court
- Décision : conservé comme vraie primitive

### `inbox_block`
- Statut cible : `RAW_CORE`
- Rôle produit : références Inbox / captures attachées au Moment
- Décision : conservé

### `link_block`
- Statut cible : `RAW_SECONDARY`
- Rôle produit : ressource externe utile au Moment
- Décision : conservé, mais moins central que `text`, `task`, `set`, etc.

### `attachment_block`
- Statut cible : `RAW_SECONDARY`
- Rôle produit : pièce jointe utile au Moment
- Décision : conservé

### `key_value_block`
- Statut cible : `RAW_SECONDARY`
- Rôle produit : structure de référence compacte et lisible
- Direction :
  - Build : key modifiable + value modifiable
  - Run : key figée, value modifiable
- Décision : conservé

### `table_block`
- Statut cible : `REMOVE_TARGET`
- Rôle produit actuel : structure tabulaire spécifique
- Problème :
  - UI peu naturelle
  - faible justification produit
  - facilement réintroduisible plus tard si besoin réel
- Décision :
  - sortir de la cible
  - supprimer

### `fields_block`
- Statut cible : `REMOVE_TARGET`
- Rôle produit actuel : données structurées libres / type mini formulaire
- Problème :
  - bloc trop technique
  - peu “Moment-native”
  - remplaçable par `text_block` ou `key_value_block`
- Décision :
  - sortir de la cible
  - supprimer

### `goal_block`
- Statut cible : `PRESET_TARGET`
- Base cible probable :
  - `text_block`
  - éventuellement `status_block` / `task_block` / `metric`
- Décision :
  - ne plus le considérer comme primitive cœur

### `milestone_block`
- Statut cible : `PRESET_TARGET`
- Base cible probable :
  - `task_block`
  - ou preset structuré
- Décision :
  - sortir de la liste brute visible à terme

### `decision_block`
- Statut cible : `PRESET_TARGET`
- Base cible probable :
  - `text_block`
- Décision :
  - meilleur en preset qu’en primitive

### `hypothesis_block`
- Statut cible : `PRESET_TARGET`
- Base cible probable :
  - `text_block`
- Décision :
  - preset déguisé aujourd’hui

### `risk_block`
- Statut cible : `PRESET_TARGET`
- Base cible probable :
  - `text_block`
- Décision :
  - bon preset, mauvaise primitive cœur

### `constraint_block`
- Statut cible : `PRESET_TARGET`
- Base cible probable :
  - `text_block`
  - metadata simple
- Décision :
  - très bon candidat preset

### `question_block`
- Statut cible : `PRESET_TARGET`
- Base cible probable :
  - `text_block`
  - plus tard preset `Q&A`
- Décision :
  - preset cible d’abord

## 26.4 Résumé par catégories

### Raw blocks cœur produit
- `text_block`
- `section_block`
- `task_block` (fondé sur l’actuel `checklist_block`)
- `status_block`
- `scale_block` (bloc produit visible : `Metric`)
- `set_block`
- `timer_block`
- `inbox_block`

### Raw blocks secondaires
- `key_value_block`
- `link_block`
- `attachment_block`

### À déprécier
- `metric_block`

### À supprimer
- `task_block` (ancien)
- `fields_block`
- `table_block`

### Presets cibles
- `goal_block`
- `milestone_block`
- `decision_block`
- `hypothesis_block`
- `risk_block`
- `constraint_block`
- `question_block`

# 29. `SELECT_BLOCK`

## 29.1 Décision
Le produit peut introduire un `select_block`,
comme primitive secondaire et disciplinée.

## 29.2 Rôle produit
Le `select_block` sert à capturer un choix fermé simple.

### Exemples
- choisir un niveau
- choisir une option parmi plusieurs réponses
- choisir une variante locale
- répondre à une question fermée

## 29.3 Scope V1
### Build
L’utilisateur configure le bloc en ajoutant les items/options du select.

### Run
L’utilisateur choisit un des items configurés.

### Règles V1
- `single select` uniquement
- pas de logique conditionnelle
- pas de multi-select
- pas de champ libre “other”

## 29.4 Comportement d’insertion
Le `select_block` s’assemble automatiquement au bloc qui le précède.

### Intention
Ce bloc sert souvent de complément local à un bloc précédent,
pas de grosse carte autonome centrale.

## 29.5 Schéma conceptuel minimal
- `label?`
- `options[]`
- `selected_option`

## 29.6 Statut cible
- `RAW_SECONDARY`

### Règle
Le `select_block` n’est pas un bloc cœur.
C’est un bloc secondaire utile pour les choix fermés simples.

# 33. DECISIONS FINALES DE SCHEMA ET D’INTERACTION

## 33.1 `section_block` — décision finale
Le `section_block` est confirmé comme **raw block cœur produit**.

### Structure retenue
Le système sait explicitement quels blocs appartiennent à une section.

#### Forme conceptuelle
- `id`
- `label`
- `child_block_ids[]`
- `collapsed` optionnel si on choisit de persister l’état UI

### Règle de groupement
- une section contient explicitement ses blocs enfants
- pas de groupement implicite “jusqu’à la prochaine section”
- un seul niveau de profondeur
- une section ne contient pas une autre section

### Blocs hors section
Des blocs peuvent exister hors section.

#### Exemple
- `text_block` pour `Objectif du Moment`
- puis sections d’exécution en dessous

### Section vide
Une section vide est autorisée temporairement en Build,
mais ne constitue pas un état cible normal du Moment fini.

### Affichage par défaut
À l’ouverture du Moment :
- une seule section active peut être ouverte
- les autres peuvent être repliées

### Badge de section
Le badge de section est automatique et dérivé.

#### Règle
- il dépend uniquement des blocs “trackables”
- le texte libre ne compte pas
- pas de saisie manuelle d’un statut de section

## 33.2 `task_block` — décision finale
Le `task_block` cible reprend la logique de l’actuel `checklist_block`.

### Décision
- l’ancien `task_block` disparaît
- l’actuel `checklist_block` est renommé en `task_block`

### Schéma V1 retenu
- `items[]`
  - `id`
  - `text`
  - `done`
  - `note?`

### Règle
On ne sur-enrichit pas le `task_block` en V1.
On garde la structure simple actuelle,
avec une note optionnelle par item.

### Usages couverts
- liste d’actions
- étapes d’une session
- tâches de préparation
- actions pendant l’exécution
- “single next action” possible via un bloc avec un seul item
- preset “Next action” possible plus tard

### Build / Run
#### Build
- texte de l’item modifiable
- note optionnelle possible si besoin

#### Run
- coche directe
- note modifiable
- la note reste secondaire par rapport à l’action

## 33.3 `select_block` — décision finale
Le `select_block` est retenu comme **raw block secondaire**.

### Schéma V1 retenu
- `label?`
- `options[]`
- `selected_option`

### Comportement
#### Build
L’utilisateur configure le select en ajoutant les options.

#### Run
L’utilisateur choisit une des options.

### Règles V1
- single select uniquement
- pas de multi-select
- pas de logique conditionnelle
- pas de champ libre “other”

### Position produit
- le `select_block` peut exister seul
- il peut aussi être attaché visuellement et logiquement au bloc précédent
- son usage naturel sera souvent contextuel à un bloc voisin,
  mais il n’est pas forcé d’être toujours rattaché

## 33.4 `key_value_block` — décision finale
Le `key_value_block` est conservé comme raw block secondaire.

### Règle d’édition
#### Build
- key modifiable
- value modifiable

#### Run
- key figée
- value modifiable

### Type de valeur en Run
La valeur peut être modifiée selon un format adapté au besoin,
et pas seulement comme texte brut.

## 33.5 `text_block` — décision finale complémentaire
Le `text_block` reste :
- riche
- central
- vivant en Run

### Option de verrouillage
Le `text_block` peut supporter une option `readonly` plus tard,
plutôt qu’un bloc séparé de texte figé.

## 33.6 Capture contextuelle en Run
Quand un Moment est ouvert en Run,
le système doit automatiquement attacher le contexte utile à la capture.

### Contexte typique
- `moment_id`
- `section_id` si pertinent
- `active_block_id` si pertinent
- type du bloc actif
- exercice / set courant si pertinent

### Apply
L’application directe peut être réglable par l’utilisateur :
- preview obligatoire
- ou apply direct si confiance forte + undo

## 33.7 `objective_summary`
Le Moment porte un champ explicite :
- `objective_summary`

### Rôle
Exprimer le but réel du Moment au-delà du titre et de la description.

## 33.8 Studio assistant
L’assistant de Studio peut :
- proposer une structure
- proposer une structure + préremplissage
- produire un draft complet
selon la demande de l’utilisateur.

## 33.9 Presets et starter kits utilisateur
La cible produit retient :
- starter kits utilisateur d’abord
- presets utilisateur plus tard

# 28. QUESTIONS OUVERTES APRES CE MAPPING

## 28.1 Questions encore ouvertes
- politique exacte de migration technique depuis les anciens types
- timing précis d’introduction du `select_block`
- timing précis du support `readonly` pour `text_block`
- stratégie exacte de capture contextuelle selon la confiance et le mode utilisateur
- première liste officielle des presets V1 système
- première liste officielle des starter kits V1 système

## 28.2 Questions closes
Les points suivants sont désormais tranchés :
- schéma du `section_block`
- un seul niveau de groupement
- blocs hors section autorisés
- badge automatique de section
- disparition de l’ancien `task_block`
- renommage de l’actuel `checklist_block` en `task_block`
- structure V1 simple du nouveau `task_block`
- maintien du `select_block` comme bloc secondaire
- `select_block` autorisé seul
- édition Run du `key_value_block`
- `objective_summary`
- capacité du Studio assistant

# 34. `TASK_BLOCK` — NOTE / COMMENTAIRE PAR ITEM

## 34.1 Décision
Le `task_block` doit permettre une note ou un commentaire optionnel par item.

## 34.2 Pourquoi
Un item coché ou avancé ne suffit pas toujours à capturer le réel.

L’utilisateur peut avoir besoin d’ajouter une précision, par exemple :
- résultat partiel
- difficulté rencontrée
- observation utile
- contexte ou nuance
- commentaire court lié à l’exécution

## 34.3 Schéma V1 ajusté
Le `task_block` conserve la logique simple de checklist,
mais chaque item peut porter en plus :

- `id`
- `text`
- `done`
- `note?`

## 34.4 Règle Build / Run
### Build
- texte de l’item modifiable
- note optionnelle possible si besoin

### Run
- coche directe de l’item
- ajout ou édition de la note possible
- la note reste secondaire par rapport à l’action principale

## 34.5 Règle UX
La note ne doit pas alourdir le bloc par défaut.

### Direction
Elle doit être accessible simplement,
par exemple via une action discrète sur l’item,
sans transformer chaque ligne en mini formulaire visible en permanence.

## 34.6 Exemples
- “fait mais qualité moyenne”
- “à reprendre demain”
- “10 reps au lieu de 12”
- “client ok sur le budget, pas sur le délai”
