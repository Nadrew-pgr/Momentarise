# 06_agents_user_permissions_autonomy.md

## Statut
Draft v1

## Objectif
Définir clairement :

- ce qu’est un Agent user dans Momentarise
- comment il se relie à Sync Core
- ce que l’utilisateur peut configurer
- ce qu’il ne peut jamais configurer
- comment bornes, permissions et autonomie fonctionnent
- comment éviter qu’un Agent user devienne trop large, trop coûteux ou dangereux

Le but est d’avoir une UX simple côté produit,
tout en gardant une architecture propre et sécurisée côté runtime.

# 22. Mobile — considérations spécifiques

## 22.1 Utilisation mobile des Agents
Les Agents user doivent être pensés pour des usages mobile réalistes :
- Moment coach
- reprise rapide
- capture -> routage
- quick review
- guidance contextuelle

## 22.2 Ce qu’il faut éviter
Sur mobile, éviter :
- configuration trop complexe
- listes d’outils incompréhensibles
- permissions trop techniques
- prompts avancés exposés trop tôt

## 22.3 Règle UX
Le mobile doit surtout permettre :
- choisir un Agent
- voir ce qu’il sait faire
- lui faire confiance dans un scope clair
- annuler / ajuster facilement
Le mode avancé complet peut rester plutôt web-first.
