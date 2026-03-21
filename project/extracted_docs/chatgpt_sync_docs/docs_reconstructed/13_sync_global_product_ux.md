# 13_sync_global_product_ux.md

## Statut
Draft v0.1 — initial product UX consolidation

## Objectif
Traduire l’architecture déjà cadrée de Sync en une UX produit cohérente, compréhensible et codable,
sans casser les flux déjà branchés dans l’app actuelle.

Ce document ne redéfinit pas le moteur interne de Sync.
Il définit :
- où Sync vit dans le produit
- comment l’utilisateur entre dans Sync
- comment il comprend ce que Sync peut faire
- comment il comprend les différences entre chat, capture, Moment, agents, automations et réglages
- comment les surfaces web et mobile doivent converger sans être artificiellement identiques
- comment migrer depuis l’UI actuelle sans casser l’existant

# 14. HISTORIQUE, ACTIVITE ET TRACE DE SYNC

## 14.1 Distinction structurante
Le produit doit distinguer clairement 3 couches :

1. **run history**
2. **run trace**
3. **activity timeline transverse**

Ces 3 couches ne doivent pas être fusionnées en une seule UX confuse.

## 14.2 Run history
Le run history sert à retrouver et rouvrir une conversation Sync passée.

### Contenu attendu
- titre du run
- aperçu
- date
- modèle
- actions `open / rename / delete`

### État actuel
Cette couche existe déjà :
- web : drawer riche avec recherche
- mobile : drawer plus simple sans recherche

### Décision
Le run history reste une UX de premier rang.
Ce n’est pas un simple détail de chat.

## 14.3 Run trace
La run trace sert à comprendre ce qui s’est passé **dans** un run.

### Exemples
- reasoning
- sources
- task
- queue
- notices
- previews
- apply
- undo
- questions interactives

### État actuel
Le web expose déjà une trace plus riche.
Le mobile reste plus léger.

### Décision
La différence web/mobile est acceptable à court terme,
mais la sémantique doit rester commune :
- même catégories de trace
- même logique de lecture
- même compréhension produit

## 14.4 Activity timeline transverse
L’activity timeline transverse ne sert pas à relire une conversation.
Elle sert à comprendre l’activité réelle de Sync à travers le produit.

### Exemples
- “Sync a appliqué telle action”
- “telle suggestion a été annulée”
- “telle automation a tourné”
- “tel agent a produit tel résultat”
- “tel Moment a été ajusté”
- “tel item Inbox a été créé depuis Sync”

### État actuel
Cette couche n’existe pas encore vraiment.

### Décision
Il faudra créer plus tard une vraie surface d’activité transverse,
distincte du run history.

### Règle
Un historique de chat ne remplace pas un journal produit.

# 14. HISTORIQUE, REASONING ET TRACE DE RUN

## 14.1 Distinction structurante
Le produit doit distinguer clairement 3 couches :

1. **run history**
2. **run trace**
3. **future activity center** optionnel plus tard

Ces 3 couches ne doivent pas être fusionnées.

### Règle
- `run history` = retrouver un run passé
- `run trace` = comprendre ce qui s’est passé dans un run
- `future activity center` = vue transverse éventuelle plus tard, hors chat principal

## 14.2 Run history
Le run history sert à :
- retrouver un run
- le rouvrir
- le renommer
- le supprimer
- reprendre le contexte conversationnel et ses previews

### Contenu attendu
- titre du run
- aperçu
- date
- modèle
- actions `open / rename / delete`

### État actuel
Cette couche existe déjà :
- web : drawer riche avec recherche
- mobile : drawer plus simple sans recherche

### Décision
Le run history reste une UX de premier rang.
Ce n’est pas un détail secondaire.

## 14.3 Run trace
La run trace sert à comprendre ce qui s’est passé **dans** un run,
sans exposer des logs bruts ou du debug interne illisible.

### La run trace doit pouvoir contenir
- **message principal**
- **reasoning summary** repliable quand disponible
- **tasks / tools**
- **sources utiles** si pertinentes
- **preview / apply / undo**
- erreurs utiles et compréhensibles

### Exemples de tâches / tools
- `Read capture`
- `Read note`
- `Read Moment`
- `Ran memory search`
- `Ran calendar lookup`
- `Web search failed`
- `Preview generated`
- `Apply completed`

### Exemples de reasoning utile
- ce que Sync essaie de faire
- l’angle retenu
- la logique principale
- la raison d’un appel d’outil
- la conclusion intermédiaire utile

### Règle
Le reasoning visible doit être :
- lisible
- utile
- résumé
- orienté produit

Il ne doit pas être :
- un dump technique
- un payload interne
- une suite de logs bruts
- une exposition brute du chain-of-thought interne

## 14.4 Reasoning natif vs trace produit
Le produit ne doit pas dépendre entièrement du reasoning natif d’un provider ou d’un modèle.

### Cas 1 — modèle avec reasoning exploitable
Quand le provider ou le modèle expose un reasoning summary utilisable,
le produit peut l’afficher dans un bloc repliable.

### Cas 2 — modèle sans reasoning exploitable
Si le modèle ne fournit pas de reasoning exploitable,
le produit doit quand même garder une UX solide grâce à :
- une trace de tâches
- une trace d’outils
- des erreurs utiles
- un résumé produit de ce que Sync fait

### Règle
La UX de Sync ne doit jamais supposer que tous les modèles “raisonnent bien” de manière homogène.

## 14.5 Ordre d’affichage
Les couches visibles d’un run ne sont pas obligatoirement affichées dans un ordre fixe.

### Règle
L’ordre dépend du type de run,
mais la hiérarchie la plus saine reste généralement :

1. réponse utile
2. preview / action si pertinente
3. tasks / tools
4. reasoning summary repliable
5. sources si utiles

### Conséquence
Les blocs “message”, “reasoning”, “tasks”, “sources”, “preview/apply/undo” doivent être pensés comme des **couches composables**, pas comme un ordre figé universel.

## 14.6 Future activity center
Une vue transverse de type :
- `Sync activity`
- `Automation activity`
- `Agent activity`

peut exister plus tard,
mais elle n’est pas une priorité V1 du chat principal.

### Règle
Le chat principal de Sync ne doit pas être pollué par une activity timeline transverse.

### Décision
La priorité immédiate est :
- meilleur run history
- meilleure run trace
- meilleur reasoning summary
- meilleure visibilité des tasks / tools / erreurs

# 14. HISTORIQUE DE CONVERSATION ET TRACE VISIBLE

## 14.1 Distinction structurante
Le produit doit distinguer clairement 3 couches :

1. **conversation history**
2. **message-level visible trace**
3. **future activity center** optionnel plus tard

Ces 3 couches ne doivent pas être fusionnées.

### Règle
- `conversation history` = retrouver une conversation passée avec Sync
- `message-level visible trace` = comprendre ce qui s’est passé pendant un tour d’assistant dans la conversation
- `future activity center` = vue transverse éventuelle plus tard, hors chat principal

## 14.2 Conversation history
L’historique de conversation sert à :
- retrouver une conversation
- la rouvrir
- la renommer
- la supprimer
- reprendre ses messages, ses previews et son état visible

### Contenu attendu
- titre de conversation
- aperçu
- date
- modèle si utile
- actions `open / rename / delete`

### État actuel
Cette couche existe déjà :
- web : drawer riche avec recherche
- mobile : drawer plus simple sans recherche

### Décision
L’historique de conversation reste une UX de premier rang.
C’est le vrai concept visible pour l’utilisateur.

## 14.3 Message-level visible trace
La trace visible sert à comprendre ce qui s’est passé **dans un tour d’assistant**,
sans exposer des logs bruts ou du debug interne illisible.

### La trace visible peut contenir
- **message principal**
- **reasoning summary** repliable quand disponible
- **tasks / tools**
- **sources utiles** si pertinentes
- **preview / apply / undo**
- erreurs utiles et compréhensibles

### Exemples de tâches / tools
- `Read capture`
- `Read note`
- `Read Moment`
- `Ran memory search`
- `Ran calendar lookup`
- `Web search failed`
- `Preview generated`
- `Apply completed`

### Exemples de reasoning utile
- ce que Sync essaie de faire
- l’angle retenu
- la logique principale
- la raison d’un appel d’outil
- la conclusion intermédiaire utile

### Règle
Le reasoning visible doit être :
- lisible
- utile
- résumé
- orienté produit

Il ne doit pas être :
- un dump technique
- un payload interne
- une suite de logs bruts
- une exposition brute du chain-of-thought interne

## 14.4 Reasoning natif vs trace produit
Le produit ne doit pas dépendre entièrement du reasoning natif d’un provider ou d’un modèle.

### Cas 1 — modèle avec reasoning exploitable
Quand le provider ou le modèle expose un reasoning summary utilisable,
le produit peut l’afficher dans un bloc repliable.

### Cas 2 — modèle sans reasoning exploitable
Si le modèle ne fournit pas de reasoning exploitable,
le produit doit quand même garder une UX solide grâce à :
- une trace de tâches
- une trace d’outils
- des erreurs utiles
- un résumé produit de ce que Sync fait

### Règle
La UX de Sync ne doit jamais supposer que tous les modèles “raisonnent bien” de manière homogène.

## 14.5 Ordre d’affichage
Les couches visibles ne sont pas obligatoirement affichées dans un ordre fixe.

### Règle
L’ordre dépend du type de message ou d’action,
mais la hiérarchie la plus saine reste généralement :

1. réponse utile
2. preview / action si pertinente
3. tasks / tools
4. reasoning summary repliable
5. sources si utiles

### Conséquence
Les blocs “message”, “reasoning”, “tasks”, “sources”, “preview/apply/undo” doivent être pensés comme des **couches composables**, pas comme un ordre figé universel.

## 14.6 Future activity center
Une vue transverse de type :
- `Sync activity`
- `Automation activity`
- `Agent activity`

peut exister plus tard,
mais elle n’est pas une priorité V1 du chat principal.

### Règle
Le chat principal de Sync ne doit pas être pollué par une activity timeline transverse.

### Décision
La priorité immédiate est :
- meilleur historique de conversation
- meilleure trace visible dans les messages
- meilleur reasoning summary
- meilleure visibilité des tasks / tools / erreurs

### Note interne
Le concept de **run** reste utile côté architecture, streaming, observabilité et backend,
mais ne doit pas être le concept UX principal côté utilisateur.
