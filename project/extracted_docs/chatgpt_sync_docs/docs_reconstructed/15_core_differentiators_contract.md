# 15_core_differentiators_contract.md

## Statut
Draft v0.2 — consolidated core differentiators contract

## Objectif
Cadrer les différenciateurs centraux de Momentarise
de manière assez claire pour guider le build,
sans transformer le document en encyclopédie floue.

Ce document précise :
- le rôle produit de chaque différenciateur
- leur lien avec Sync
- leur scope V1
- leur niveau d’autonomie
- leur lien avec les connecteurs et les automations
- ce qui les distingue d’une simple app de todo/calendrier

Les blocs couverts ici sont :
- `projects`
- `series`
- `deep_plan`
- `deep_research`
- `automations`
- `agents`
- `connectors`

# 14. ALIGNEMENT AVEC WATCHLISTS, SIGNALS, EVIDENCE ET AUTOMATIONS

## 14.1 Watchlists / Signals / Evidence deviennent un cœur produit explicite
Le rôle d’assistant personnel de Momentarise ne repose pas seulement sur :
- les Moments
- Sync
- les Projects
- les Series

Il repose aussi explicitement sur :
- les **watchlists**
- les **signals**
- les **evidences**

### Règle
Ces trois briques ne sont pas des annexes techniques.
Elles font partie du cœur de l’assistant personnel branché sur le réel.

## 14.2 Evidence = optionnelle
Les evidences sont **optionnelles**.

### Règle
Le produit ne doit jamais supposer que tous les utilisateurs veulent :
- des preuves automatiques
- une lecture instrumentée de leur avancement
- une logique forte de suivi prévu ↔ réel

### Conséquence
Les evidences doivent être :
- activables
- désactivables
- réglables
- et jamais imposées comme norme produit

## 14.3 Automations comme transformation de signal
Les automations utiles de Momentarise doivent très souvent suivre ce rail :

- source / connecteur
- watchlist éventuelle
- signal détecté
- transformation utile
- sortie produit

### Sorties typiques
- digest
- alerte
- tâche
- session
- relance
- enrichissement de Project / Series / Moment

### Règle
Une automation ne vaut que si elle transforme un changement réel en action utile,
pas si elle produit du bruit.

## 14.4 Assistant personnel : preuve produit
Les trois expériences les plus démonstratives restent :

### A. Capture -> action planifiée utile
Un mail, un vocal, une note, un doc ou une capture
devient une action réellement exploitable.

### B. Watchlist / signal -> action utile
Un changement externe surveillé
devient digest, tâche, session, maintenance ou review.

### C. Exécution avec contexte prêt
Quand le Moment arrive,
le bon contexte est déjà rassemblé et Sync aide réellement à avancer.

## 14.5 Proactivité utile
La proactivité n’est pas le centre du produit,
mais une couche essentielle de qualité.

### Formes légitimes
- widget
- Today
- brief
- micro-relance intelligente
- message motivant contextuel non répétitif

### Règle
La proactivité doit rester :
- utile
- contextuelle
- peu bruyante
- jamais gnangnan ou hors-sol

## 14.6 Création des automations
Les automations doivent pouvoir être créées :
- depuis Sync en langage naturel
- puis gérées dans une surface dédiée ou mixte

### Règle
Le chat Sync sert à :
- exprimer l’intention
- générer un draft
- poser quelques questions si besoin
- montrer un preview

La surface dédiée sert à :
- activer / désactiver
- revoir
- ajuster
- comprendre l’historique
- gérer les réglages fins

## 14.7 Règle d’ensemble
Momentarise devient crédible comme assistant personnel
quand ses différenciateurs restent reliés entre eux :

- Projects
- Series
- Moments
- Sync
- Connectors
- Automations
- Watchlists
- Signals
- Evidence

# 15. CLARIFICATIONS COMPLEMENTAIRES

## 15.1 Projects vs Series — clarification canonique
### Project
Un `Project` est une unité d’issue / d’objectif / de livrable / de trajectoire de travail.

Il répond à :
- qu’est-ce que j’essaie d’obtenir
- quels Moments, captures, recherches et sorties servent ce résultat
- quelles preuves ou signaux comptent pour cet objectif

### Series
Une `Series` est un patron récurrent d’exécution, d’apprentissage, de routine ou de format.

Elle répond à :
- qu’est-ce qui revient
- qu’est-ce qui s’améliore d’une itération à l’autre
- quelle structure réutiliser ou adapter

### Règle
- un Project peut contenir plusieurs Series
- une Series peut exister sans Project
- un Moment peut être lié à un Project, une Series, les deux, ou aucun

## 15.2 Watchlists proposées à partir du contexte réel
Sync doit pouvoir proposer des watchlists à partir :
- d’un Project
- des technos réellement utilisées
- des providers dépendants
- des sources jugées critiques

### Règle
Sync propose.
L’utilisateur accepte.
La watchlist n’est pas imposée automatiquement si elle change vraiment le comportement du produit.

## 15.3 Canal préféré / le plus utilisé
Quand un signal fort ou une proactivité importante doit sortir vers l’utilisateur,
Momentarise doit privilégier :
- le canal préféré
- ou le canal réellement le plus utilisé
si ce canal est connecté et autorisé

### Exemple
Deploy failed d’un projet client -> alerte sur Telegram si c’est le canal principal de l’utilisateur.

## 15.4 Réduction des oublis
Le produit ne peut pas promettre “plus jamais rien oublié”.

### Règle
En revanche, il doit viser à réduire fortement les oublis utiles grâce à :
- captures
- watchlists
- automations
- relances
- préparation automatique de contexte
- digests
- signaux
- projets / séries / Moments bien reliés
