# 03_proactivity_scheduler_notifications.md

## Statut
Draft v1

## Objectif
Définir le sous-système de :
- proactivité
- scheduling
- notifications
- autonomie
- annulation / acknowledgment

pour Sync futur, dans une logique :
- OpenClaw-like côté runtime
- adaptée au métier Momentarise
- compatible avec agents, sous-agents, automations, surfaces et canaux

# 19. Email et widgets — précision V1

## 19.1 Email — périmètre V1
Pour V1, l’email reste principalement :
- read-only
- source mémoire
- source de déclencheurs
- source de résumés / revues

## 19.2 Email — ce que Sync peut faire en V1
- lire / résumer un email ou un thread
- proposer une action
- créer une note Inbox
- plus tard préparer un contenu au format email sans envoi réel
- plus tard préparer un draft
- plus tard seulement envoyer si le connecteur et les permissions existent

## 19.3 Règle
En V1 :
- pas d’envoi direct d’email
- pas de draft réel envoyé au provider
- seulement lecture, résumé, extraction, transformation vers artefacts internes

## 19.4 Widgets iOS / Android
La proactivité doit aussi pouvoir se matérialiser dans :
- widgets iOS
- widgets Android

## 19.5 Rôle des widgets
Les widgets servent surtout à :
- afficher un rappel
- afficher une prochaine action
- afficher un Moment imminent
- afficher une suggestion ou un état
- offrir un point d’entrée rapide vers l’app

## 19.6 Limite
Les widgets ne remplacent pas l’app comme surface d’interaction complète.
Ils servent de surface de visibilité / re-entry, pas de runtime principal.

# 20. Widgets = proactivité + capture rapide

## 20.1 Double rôle
Les widgets iOS / Android doivent servir à la fois à :
- afficher des signaux proactifs
- offrir une entrée rapide vers la capture

## 20.2 Usages cibles
Exemples :
- voir un rappel ou une suggestion de Sync
- ouvrir directement l’écran de capture
- créer rapidement une note / capture
- reprendre un Moment imminent
- ouvrir une suggestion proactive dans l’app

## 20.3 Règle
Les widgets sont une surface :
- de visibilité,
- de re-entry,
- de capture rapide,

mais pas un runtime conversationnel complet.

## 20.4 Conséquence produit
Le système de proactivité et le système de capture doivent pouvoir exposer
des "quick entrypoints" compatibles widgets.

# 21. Mobile — considérations spécifiques

## 21.1 Mobile comme surface prioritaire
Le mobile est une surface majeure pour :
- proactivité
- push
- reprise rapide
- capture instantanée
- undo rapide
- consultation de suggestions

## 21.2 UX mobile attendue
Toute proactivité importante doit pouvoir être :
- ouverte depuis une push
- comprise rapidement
- annulée ou confirmée rapidement
- reliée à l’écran pertinent dans l’app

## 21.3 Widgets
Les widgets mobile doivent être pensés comme :
- surface de visibilité
- surface de capture rapide
- surface de reprise
- point d’entrée vers suggestion / Moment / inbox / capture
