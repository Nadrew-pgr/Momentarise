# Refactor rapide et pragmatique du repo

## Executive summary
Le refactor doit suivre `produit d’abord`, avec `migrations faibles`, compat ascendante, et zéro grand reset. L’objectif n’est pas de rendre tout le repo “pur” d’un coup, mais de nettoyer le noyau visible et les duplications qui freinent déjà l’app: `Sync`, `Moment`, `Project`, `Series`, puis de ranger les couches scaffolding (`Automations`, `Connectors`) sans prétendre les productiser tout de suite.

L’ordre recommandé est:
1. unifier les surfaces visibles et supprimer le legacy UX évident
2. stabiliser la grammaire `Moment` sans casser le bridge `Event ↔ Item.blocks`
3. reclasser correctement `Project` / `Series` et vider les faux écrans
4. mettre `Automations` / `Connectors` au bon niveau de vérité
5. faire ensuite un hardening prod ciblé avant V1 sérieuse

## Refactor principles
- Conserver les contrats dangereux tant qu’ils portent le produit réel: `packages/shared/src/sync.ts`, `packages/shared/src/business-blocks.ts`, `apps/api/src/api/v1/events.py`, `apps/api/src/api/v1/sync.py`.
- Préférer les suppressions de surfaces trompeuses aux grosses migrations de données.
- Faire des renommages “soft” d’abord: labels UI, catalogues de blocs, classification. Reporter les suppressions de schéma quand la forme cible est stable.
- Garder le bridge actuel `Moment = Event + Item.blocks + snapshots` pendant le refactor rapide. Ne pas l’ouvrir en même temps que le nettoyage UX.
- Ne pas productiser pour de faux: si une surface `Automation`, `Connector`, `Coach`, `Project`, `Series` n’est pas crédible, elle doit être minimisée, cachée ou reclassée.

## Fast refactor plan (macro)
### 1. Nettoyage du noyau visible
- Faire de `/sync` la seule vraie surface chat IA.
- Décommissionner `/chat` en redirection simple vers `/sync`.
- Aligner web et mobile sur une même vérité UX minimale pour `Sync`: historique, composer, guided/free, modèles, contexte `@`, previews/apply/undo.
- Retirer ou minimiser les placeholders les plus trompeurs dans settings et `Me`.

Dépendances:
- aucune migration de données
- faible risque
- valeur immédiate

### 2. Stabilisation rapide du modèle `Moment`
- Figer `Moment` comme surface d’exécution centrale, sans réécrire encore son stockage.
- Garder `business blocks` comme vérité fonctionnelle, mais nettoyer le catalogue.
- Séparer plus clairement `Run` et `Studio` dans l’UX avant de toucher au schéma profond.
- Réduire la taxonomie visible des blocs par reclassement, pas par purge brutale du schéma.

Dépendances:
- après Slice 1, car `Sync` et `Moment` sont les deux surfaces qui doivent raconter la même app
- pas de migration profonde `Event ↔ Item.blocks`

### 3. Reclassification `Project` / `Series`
- Assumer `Project` et `Series` comme objets de scope réels dans le modèle, mais pas encore comme grandes surfaces riches.
- Remplacer les pages détail placeholder par des surfaces minimales crédibles ou des états “thin but real”.
- Ne pas lancer de refonte ambitieuse tant que `Moment` et `Sync` ne sont pas stabilisés.

Dépendances:
- après Slice 2
- dépend du cadrage `Moment ↔ Project/Series`

### 4. Rangement du scaffolding `Automations` / `Connectors`
- Garder le backend et les hooks existants.
- Retirer la prétention produit là où l’UI est encore faible.
- Reclasser ces éléments en `settings / advanced / internal` tant qu’ils n’ont pas de surface crédible.

Dépendances:
- après nettoyage des surfaces cœur
- aucune migration lourde requise

### 5. Hardening prod minimum avant V1 sérieuse
- Ajouter le socle indispensable: rate limits, session hardening, GDPR minimum, storage durci, observabilité exploitable.
- Ce lot ne doit pas précéder le nettoyage produit, mais il doit précéder tout ship public sérieux.

Dépendances:
- transverse
- peut démarrer en parallèle légère, mais doit finir avant V1 sérieuse

## PR-sized slices
### Slice 1 — `Sync canonical`
- Rediriger [`/chat`](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/chat/page.tsx) vers [`/sync`](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/sync/page.tsx).
- Retirer le poids produit de `Chatbot` legacy.
- Nettoyer la navigation pour qu’il n’existe qu’une seule entrée IA claire.
- Garder intacts les contrats `sync.ts` et `sync.py`.

### Slice 2 — `Moment UX cleanup`
- Faire de `Content` la surface run par défaut.
- Garder le `Studio` comme surface d’édition dédiée.
- Réduire le bruit de `Quick update` sans casser sa mécanique backend.
- Nettoyer les CTA, fermetures, labels et affordances les plus trompeurs sur web/mobile.

### Slice 3 — `Business blocks visible taxonomy`
- Reclasser le catalogue de blocs en `raw blocks`, `preset blocks`, `starter kits`.
- Supprimer d’abord l’exposition UI des blocs les plus douteux, sans retirer immédiatement leur support de schéma.
- Préparer les dépréciations de `hypothesis`, `constraint`, `milestone`, `metric` via mapping/catalogue, pas via rupture de schéma.

### Slice 4 — `Projects and Series truthfulness`
- Remplacer les pages détail placeholder [`projects/[id]`](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/projects/[id]/page.tsx) et [`series/[id]`](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/series/[id]/page.tsx) par une vue minimale réelle.
- Montrer seulement ce qui existe vraiment: métadonnées, moments liés, contexte Sync éventuel.
- Retirer tout langage qui sur-vend ces surfaces.

### Slice 5 — `Automations and Connectors reclassification`
- Garder les endpoints/hook existants.
- Déplacer l’exposition UI de `Automations` vers une zone `advanced/internal` ou la masquer tant qu’elle n’est pas crédible.
- Remplacer les faux panneaux “connectors coming soon” par une formulation plus honnête et plus légère.

### Slice 6 — `Prod floor`
- Rate limits sur auth/upload/sync/capture external.
- durcissement session
- export/delete minimum
- storage attachments durci
- observabilité minimale corrélée

## What to delete
- La surface `/chat` comme produit distinct.
- Les labels et entrées UI qui font croire que `Projects`, `Series`, `Coach`, `Automations`, `Connectors` sont déjà plus mûrs qu’ils ne le sont.
- Les placeholders “Slice 1 / Slice 2 / Coming soon” visibles sur les surfaces cœur.
- L’exposition UI directe de certains blocks trop spécialisés comme primitives de premier niveau, sans supprimer tout de suite leur support technique.

## What to rename or reclassify
- `Chat` -> `Sync` partout où la distinction persiste encore.
- `Moment Content` -> surface `Run`; `Studio` -> surface `Build`.
- `Metric` -> préparer un reclassement vers `Signal/Metric` unifié, mais sans migration de schéma immédiate.
- `Hypothesis`, `Constraint`, `Risk`, `Question`, `Decision` -> reclasser comme `presets métier` ou blocs avancés, pas comme primitives principales.
- `Automations` et `Connectors` -> reclasser comme capacités backend/advanced tant qu’une vraie surface produit n’existe pas.

## What to keep stable
- Les contrats partagés Sync et events.
- Le runtime `preview/apply/undo`.
- Le bridge actuel `Event + Item.blocks + snapshots`.
- Les IDs et relations `Event ↔ Project/Series`.
- Le pipeline Inbox/capture.
- Les endpoints et schémas existants tant qu’une suppression n’apporte pas une vraie simplification visible.

## What must be decided before coding
- La taxonomie visible cible des blocs: quelles primitives restent exposées en premier niveau.
- La décision de dépréciation UI exacte sur `metric`, `hypothesis`, `constraint`, `milestone`, `task`.
- Le niveau d’exposition produit autorisé pour `Automations` et `Connectors` dans cette phase.
- Le minimum crédible pour `Project` et `Series`: simple page réelle mince, ou retrait temporaire de certaines promesses UI.
- Le wording canonique des surfaces: `Sync`, `Moment`, `Studio`, `Project`, `Series`.

## What can be coded immediately
- Redirection `/chat` -> `/sync`.
- Nettoyage navigation/labels/i18n pour supprimer les duplications visibles.
- Suppression ou réduction des placeholders les plus trompeurs.
- Reclassification UI du catalogue de business blocks sans casser les schémas.
- Passage de `Moment Content` vers un vrai défaut `Run`, avec `Studio` derrière un CTA.
- Remplacement des pages `Project` / `Series` placeholder par une version mince mais vraie.
- Masquage ou déplacement des surfaces `Automations`/`Connectors` trop faibles.
- En parallèle court: mise en place du socle prod minimal sur rate limits + session hardening + observabilité de base.

## Assumptions and defaults
- Priorité retenue: `produit d’abord`.
- Niveau de migration retenu: `faible`, compat ascendante, suppressions de schéma différées.
- Le refactor rapide ne touche pas encore au stockage profond de `Moment`.
- Le refactor rapide ne tente pas de matérialiser toute la vision `watchlists / evidence / adaptive coaching`.
- Le hardening prod est traité comme un lot parallèle minimal, puis un vrai lot de pré-ship public.
