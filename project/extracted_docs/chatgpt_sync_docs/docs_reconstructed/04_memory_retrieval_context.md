# 04_memory_retrieval_context.md

## Statut
Draft v1

## Objectif
Définir de manière précise :
- la mémoire de Momentarise,
- la différence entre mémoire et contexte,
- le retrieval,
- les snippets injectés,
- les voisins / liens,
- les bootstrap assets,
- le contrôle utilisateur,
- l’évolution vers hybrid retrieval sans refonte profonde.

Le but est de copier la philosophie OpenClaw :
- mémoire hors contexte,
- context inspector,
- snippets avec provenance,
- prompt assets injectés avec limites,
- hard control côté runtime.

# 22. Mobile — considérations spécifiques

## 22.1 Règle
Le mobile ne doit pas recevoir du contexte trop dense ou des réponses inutilement longues.

## 22.2 Conséquences retrieval
Sur mobile, privilégier :
- snippets plus courts
- provenance claire mais compacte
- previews plutôt que longs pavés
- possibilité d’ouvrir le détail sur demande

## 22.3 Working memory mobile
Le mobile doit très bien gérer :
- reprise d’un run
- capture active
- question active
- preview actif
- Moment en cours
sans obliger l’utilisateur à relire un énorme historique
