# 17_connectors_and_automation_product_surface.md

## Statut
Draft v0.1 — connectors and automation product surface

## Objectif
Définir comment les connecteurs et les automations existent **côté produit** :

- comment l’utilisateur les découvre
- comment il les crée
- comment il les comprend
- comment il les configure
- comment il les contrôle
- comment il voit ce qui s’est déclenché
- comment tout cela reste lisible sans devenir un panneau d’admin

Ce document ne redéfinit pas tout le runtime.
Il définit la **surface produit visible**.

# 14. CREATION DIRECTE HORS CHAT

## 14.1 Règle
Les automations ne doivent pas être créables uniquement depuis Sync.

## 14.2 Double entrée
L’utilisateur peut :
- créer naturellement depuis Sync
- ou créer directement depuis la surface dédiée Automations

### Pourquoi
Le chat est excellent pour exprimer l’intention.
La surface dédiée est meilleure pour :
- les réglages experts
- la vue d’ensemble
- la création explicite sans passer par une conversation

## 14.3 Préférence de canal
Les connecteurs et automations doivent tenir compte :
- du canal préféré de l’utilisateur
- ou du canal le plus effectivement utilisé

### Règle
Une alerte ou une sortie importante doit privilégier ce canal,
dans la limite des permissions, connexions et politiques du produit.
