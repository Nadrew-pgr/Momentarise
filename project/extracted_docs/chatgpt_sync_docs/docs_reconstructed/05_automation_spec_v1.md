# 05_automation_spec_v1.md

## Statut
Draft v1

## Objectif
Définir la forme minimale mais propre des automations dans Momentarise, de façon compatible avec :

- Sync Core
- sous-agents / AgentProfiles
- proactivité
- scheduler / heartbeat
- notifications
- preview / apply / undo
- autonomie progressive
- future UI builder plus avancée

Le but n’est pas de faire un workflow builder géant dès V1.
Le but est de définir une base solide, compatible avec l’ambition finale.

# 23. Mobile — considérations spécifiques

## 23.1 Lien avec mobile
Les automations doivent pouvoir produire des résultats utiles pour mobile :
- push
- suggestion in-app
- quick action
- widget update plus tard

## 23.2 UX mobile
Une automation V1 ne doit pas générer une expérience trop lourde à consommer sur téléphone.

Privilégier :
- résumé court
- CTA clair
- preview concis
- entrée directe vers l’écran utile

## 23.3 Règle
Les automations mobile-first doivent favoriser :
- lecture rapide
- décision rapide
- undo rapide
- continuité de contexte
