# 21. Bootstrap files modifiables par l’utilisateur

## 21.1 Principe
Momentarise copie la philosophie OpenClaw des bootstrap files injectés à chaque run,
mais tous les fichiers ne sont pas éditables par l’utilisateur.

## 21.2 Fichiers user-editable
Les fichiers suivants peuvent être modifiés par l’utilisateur, avec UI dédiée ou mode avancé :
- `USER.md`
- `STYLE.md`
- `WORKFLOW.md`
- `MEMORY_CURATED.md` plus tard
- éventuellement certains fichiers d’agent user

## 21.3 Fichiers non éditables par l’utilisateur
Les fichiers suivants restent système ou fortement protégés :
- `IDENTITY.md`
- `BOUNDARIES.md`
- `TOOLS.md` généré
- `HEARTBEAT.md`
- `AGENTS.md` système si présent
- toute policy de sécurité ou d’autorisation

## 21.4 Règle
L’utilisateur peut personnaliser le comportement,
mais ne peut jamais modifier les garde-fous hard ni les permissions réelles.

# 27. Proactivité — philosophie cible

## 27.1 Principe
La proactivité de Sync ne doit pas être un simple comportement implicite du modèle.
Elle doit être orchestrée par le runtime.

## 27.2 Mécanismes cibles
Momentarise doit prévoir une logique proche d’OpenClaw :
- heartbeat périodique
- scheduler / cron
- wakeups
- delivery policies
- canal préféré
- quiet hours
- ack / ignore / undo

## 27.3 Règle
Le modèle peut proposer ou décider dans un cadre,
mais la proactivité effective doit rester gouvernée par :
- policies
- horaires
- permissions
- budgets
- anti-spam
- confidence thresholds

# 32. Mobile — principe transverse

## 32.1 Règle
Le mobile ne doit pas être considéré comme une adaptation tardive du web.

Chaque décision d’architecture Sync doit être pensée pour :
- web
- mobile
- canaux externes

## 32.2 Conséquences
Chaque bloc de spec doit vérifier au minimum :
- contraintes d’espace mobile
- contraintes d’interaction mobile
- transport temps réel mobile
- notifications / widgets
- reprise de contexte
- quick actions
- capture rapide

## 32.3 Règle produit
Le mobile n’est pas seulement une UI plus petite.
C’est une surface prioritaire de :
- capture
- exécution
- notification
- reprise
- reprogrammation rapide

# 33. Reasoning, trace opératoire et UX

## 33.1 Trois niveaux à distinguer

### A. Reasoning modèle brut
Contenu reasoning éventuellement renvoyé par certains modèles / providers.

### B. Reasoning UX visible
Résumé ou bloc repliable expliquant ce que Sync est en train de faire ou de penser à haut niveau.

### C. Trace opératoire
Liste structurée de :
- tools utilisés
- recherches lancées
- tâches effectuées
- previews créés
- artefacts modifiés
- étapes du run

## 33.2 Règle
Momentarise ne doit pas dépendre du reasoning brut provider pour son architecture produit.

## 33.3 Priorité
La priorité produit doit être :
1. trace opératoire fiable
2. reasoning UX résumé si utile
3. raw reasoning seulement si disponible et pertinent

## 33.4 Conséquence
Le runtime doit pouvoir générer lui-même une trace compréhensible,
même si le provider ne donne aucun reasoning exploitable.
