# Fast Refactor Plan v2

## Executive summary
Le refactor rapide garde le même cap: `produit d’abord`, `migration faible`, `pas de grand reset`. La priorité reste de nettoyer les surfaces visibles et les duplications du noyau actuel avant toute refonte plus ambitieuse.

Les 4 contraintes ajoutées sont maintenant explicites:
- préserver un modèle minimal de `canaux`
- préserver la compatibilité capture avec future `share extension` mobile et `browser extension`
- garder `bucket/track` hors scope visible immédiat
- ne pas introduire `PydanticAI` dans le cœur du fast refactor

## Refactor principles
- Garder stables les contrats porteurs du produit réel: `Sync`, `Events`, `business blocks`, pipeline capture.
- Réduire les mensonges UI avant de réécrire l’architecture.
- Faire des renommages et reclassements d’abord; reporter les migrations profondes.
- Préserver la compatibilité montante du pipeline capture et des URLs existantes.
- Ne pas ouvrir en même temps:
  - refactor produit
  - migration forte de données
  - refonte agentique/runtime

## Fast refactor plan (macro)
### 1. `Sync` canonique
- Faire de `/sync` l’unique surface produit IA.
- Conserver `/chat` comme URL de compatibilité seulement, via une implémentation ultra-mince de redirect vers `/sync`.
- Supprimer toute logique, layout, composants et navigation spécifiques à un “autre chat”.
- Ajouter une contrainte transverse: ne pas hardcoder une logique de sortie `in-app only` ou `push only`; garder un modèle minimal `canal préféré / canal disponible / canal par type de sortie`, sans le productiser encore.

### 2. `Moment` avant tout le reste
- Nettoyer `Moment` comme surface centrale d’exécution.
- Clarifier `Run` vs `Studio` au niveau UX avant toute migration de stockage.
- Réduire la taxonomie visible des blocks par reclassement UI.
- Garder `Quick update` en compat tant que ses dépendances runtime existent.

### 3. `Project` / `Series` minces mais vrais
- Remplacer les pages placeholder par des surfaces minimales crédibles.
- Assumer `Project` comme scope de travail et `Series` comme continuité/répétition, sans en faire encore des hubs riches.
- Rendre explicite que `bucket/track` est hors scope visible de ce refactor rapide.

### 4. `Automations` / `Connectors` honnêtes
- Garder le backend et les hooks existants.
- Réduire l’exposition produit tant que les surfaces ne sont pas crédibles.
- Éviter toute sur-promesse sur la proactivité, les connecteurs ou les agents.
- Préserver la compatibilité des entrées capture futures:
  - `capture_external`
  - metadata de source
  - routing Inbox/capture
  - future share/browser extensions

### 5. Hardening prod minimal en parallèle
- Traiter le minimum bloquant sans détourner le refactor cœur:
  - rate limits
  - durcissement sessions
  - observabilité minimale
  - quotas/billing hooks minimum
  - storage attachments plus propre
- Le lot prod sérieux complet reste juste avant V1 publique, pas avant les premières slices produit.

## PR-sized slices
### Slice 1 — `Remove chat as product surface`
- Remplacer la route [`/chat`](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/chat/page.tsx) par un redirect fin vers [`/sync`](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/sync/page.tsx).
- Supprimer toute navigation et tout wording qui laissent croire à deux assistants.
- Retirer les composants/layouts spécifiques legacy non nécessaires à la compat URL.

### Slice 2 — `Sync truthfulness cleanup`
- Aligner web/mobile sur une même vérité visible de Sync.
- Nettoyer placeholders, doublons et affordances trompeuses.
- Ajouter les points d’extension non-visibles pour `canaux` sans ouvrir de vraie surface channel-management.

### Slice 3 — `Moment run-first cleanup`
- Faire du tab `Content` la vue run par défaut.
- Garder `Studio` comme surface dédiée d’édition.
- Simplifier CTA, fermetures, header, cartes et labels.
- Ne pas toucher au bridge `Event + Item.blocks + snapshots`.

### Slice 4 — `Business blocks reclassification`
- Réorganiser le catalogue en:
  - `raw blocks`
  - `preset blocks`
  - `starter kits`
- Déclasser en UI les blocks spécialisés, sans rupture de schéma.
- Préparer les dépréciations futures sans les imposer tout de suite.

### Slice 5 — `Projects and Series thin-real pages`
- Remplacer les pages placeholder par des pages réelles minimales.
- Montrer uniquement ce qui est déjà vrai: relations, moments, contexte, métadonnées.
- Ne pas introduire `bucket/track`.

### Slice 6 — `Automations and connectors minimization`
- Reclasser `Automations` et `Connectors` en zones discrètes/advanced si nécessaire.
- Retirer les promesses “coming soon” les plus trompeuses.
- Garder les hooks/endpoints existants intacts.

### Slice 7 — `Prod floor`
- Ajouter les contrôles minimum côté abuse/sessions/storage/observabilité.
- Sans refonte architecture IA ni refonte complète billing/compliance.

## What to delete
- Le produit `/chat` comme surface distincte.
- Les layouts, composants et wording qui entretiennent cette duplication.
- Les placeholders visibles sur les surfaces cœur quand ils n’aident plus.
- L’exposition de blocks trop spécialisés comme primitives de premier niveau.
- Les promesses UI excessives sur `Automations`, `Connectors`, `Coach`, `Project`, `Series`.

## What to rename or reclassify
- `Chat` -> `Sync` partout côté UX.
- `Moment Content` -> vue `Run`.
- `Studio` -> vue `Build`.
- `Hypothesis`, `Constraint`, `Risk`, `Question`, `Decision` -> presets ou blocs avancés.
- `Metric` -> bloc à préparer pour convergence future avec `Scale`, sans migration forte maintenant.
- `Automations` / `Connectors` -> capacités backend ou surfaces avancées, pas piliers produit visibles pour l’instant.

## What to keep stable
- Le runtime `preview/apply/undo`.
- Les schémas partagés `sync.ts` et `business-blocks.ts`.
- Le bridge `Event + Item.blocks + snapshots`.
- Le pipeline `Inbox / capture / capture_external`.
- Les relations `Event ↔ Project/Series`.
- Les métadonnées de source capture nécessaires aux futures extensions.
- L’espace pour un modèle minimal de canaux, sans encore l’exposer fortement.

## What must be decided before coding
- La liste exacte des `raw blocks` visibles en premier niveau.
- Les blocks à déclasser immédiatement en presets/advanced.
- Le niveau d’exposition restant pour `Automations` et `Connectors`.
- Le minimum crédible de page `Project` et `Series`.
- Le shape minimal des canaux à préserver:
  - préférence
  - disponibilité
  - type de sortie
- La politique exacte de compat `/chat`:
  - redirect permanent ou temporaire
  - conservation des anciens liens analytiques si nécessaire

## What can be coded immediately
- Redirection `/chat` -> `/sync` avec suppression de la surface chat legacy.
- Nettoyage navigation / labels / i18n pour n’avoir qu’une seule surface IA.
- Nettoyage UX de `Moment` sans changer son stockage.
- Reclassification UI du catalogue de blocks.
- Remplacement des pages `Project` / `Series` placeholder par des pages minces réelles.
- Minimisation de `Automations` / `Connectors` en UI.
- Préservation explicite des métadonnées de source capture pour futures extensions.
- Début du hardening minimal:
  - rate limits
  - session hardening
  - observabilité basique
  - storage attachments plus propre

## Assumptions and defaults
- Priorité confirmée: `produit d’abord`.
- Migration confirmée: `faible`, compat ascendante.
- `Bucket/track` reste hors scope visible du fast refactor.
- `PydanticAI` est hors cœur de ce refactor; à traiter plus tard en sous-chantier ciblé si utile.
- Les `canaux` sont préservés comme contrainte de modèle, pas comme gros chantier UX immédiat.
- La compatibilité future `share extension` mobile et `browser extension` fait partie des invariants capture à ne pas casser.
