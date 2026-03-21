# 02_litellm_proxy_and_model_routing.md

## Statut
Draft v1

## Objectif
Définir l’architecture cible de gateway LLM pour Momentarise, en remplaçant la stratégie
de faux client multi-provider direct par un vrai **LiteLLM Proxy** centralisé.

Ce document doit permettre :
- une meilleure maintenabilité,
- une meilleure observabilité,
- un meilleur contrôle des coûts,
- un routing propre par mode / surface / user plan,
- un futur refactor sans casser Sync actuel.

# 17. Mobile — considérations spécifiques

## 17.1 Règle
Le routing modèle doit tenir compte du fait que le mobile supporte moins bien :
- longues attentes
- grosses réponses inutiles
- itérations bavardes
- latence floue

## 17.2 Conséquences
Sur mobile, favoriser quand possible :
- réponses plus compactes
- previews structurés
- escalade explicite vers deep_plan si nécessaire
- reprise facile d’un run interrompu
- streaming robuste via WebSocket

## 17.3 Règle de coût UX
Un modèle très fort mais trop lent peut dégrader fortement l’expérience mobile.
Le routing doit donc intégrer :
- coût
- qualité
- latence perçue
- densité de sortie

# 18. LiteLLM — caveat de support réel

## 18.1 Principe
LiteLLM reste la cible architecturelle pour la gateway LLM.

## 18.2 Mais
Le support LiteLLM n’est pas parfaitement homogène selon :
- provider
- endpoint
- mode streaming
- format de reasoning
- type de modèle

## 18.3 Conséquence
Le fait d’avoir bricolé un client maison multi-provider a pu venir :
- de modèles non ou mal supportés
- de capacités incomplètes
- d’écarts entre providers
- de besoins UX/runtime non couverts directement

## 18.4 Décision
La stratégie finale ne doit pas être un client métier géant provider-direct.

La stratégie cible est :
- LiteLLM Proxy comme gateway centrale
- + une couche d’adaptation légère côté Momentarise
- + capabilities matrix
- + fallbacks et dégradations propres

## 18.5 Règle
Le code métier doit parler en :
- familles de tâches
- capacités nécessaires
- modes
- surfaces

et non en appels provider bruts partout.

# Mistral Small 4 — slot économique / simple

## Décision consolidée
Pour les workloads relativement simples, fréquents ou quota-sensitive de Sync,
le modèle économique / intermédiaire à privilégier est :

- **Mistral Small 4**

## Exemples de workloads
- gestion des captures
- routing
- pré-recherche légère avant Moment
- transformations simples
- certains usages free tier avec quotas

## Règle
Si un placeholder antérieur mentionnait un ancien slot type `Small 3` pour ce rôle,
la référence consolidée à retenir est désormais :
- **Small 4**
