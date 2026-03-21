# Plan de refactor rapide v3

## Executive summary
Le refactor rapide reste `produit d’abord`, `migration faible`, `pas de grand reset`. L’objectif est de nettoyer les surfaces visibles et les duplications réelles du repo sans ouvrir de refonte profonde du modèle.

Les décisions maintenant figées sont:
- `/chat` passe en **compat URL avec redirect** vers `/sync`, puis suppression complète de la surface legacy après vérification analytics/links internes
- le modèle minimal de canaux à préserver est:
  - `preferred_channel`
  - `available_channels[]`
  - `channel_by_output_type`
  - avec distinction `input channel` vs `output channel`
- les métadonnées capture à ne pas casser sont:
  - `source_kind`
  - `source_app`
  - `source_url`
  - `origin_channel`
  - `shared_at?`
- `bucket/track` reste hors scope visible
- `PydanticAI` reste hors cœur du fast refactor

## Refactor principles
- Conserver stables les contrats qui portent déjà le produit réel: Sync, Events, business blocks, pipeline capture.
- Supprimer les surfaces trompeuses avant de migrer les données.
- Faire des renommages/reclassements UI d’abord, puis les migrations de schéma seulement si elles deviennent nécessaires.
- Préserver la compatibilité montante du pipeline capture, y compris pour futures share/browser extensions.
- Ne pas mélanger dans le même chantier:
  - refactor produit
  - migration forte `Moment/Event/Item`
  - refonte architecture agentique

## Fast refactor plan (macro)
### 1. `Sync` canonique
- Faire de `/sync` l’unique surface produit IA.
- Garder `/chat` uniquement comme URL de compat.
- Nettoyer navigation, wording, entrées et composants qui entretiennent un “deuxième chat”.
- Figer le modèle minimal de canaux, sans encore lancer de vraie surface channel-management.

Dépendances:
- aucune migration de données
- préalable à tout nettoyage produit visible

### 2. `Moment` comme noyau d’exécution
- Clarifier `Run` vs `Studio`.
- Faire de `Content` la surface run par défaut.
- Nettoyer la taxonomie visible des blocks sans casser le schéma existant.
- Garder le bridge actuel `Event + Item.blocks + snapshots`.

Dépendances:
- après unification de `Sync`
- pas de migration de stockage profond

### 3. `Project` / `Series` minces mais vrais
- Remplacer les pages placeholder par des pages minimales crédibles.
- Assumer `Project` comme scope de travail et `Series` comme continuité/répétition.
- Ne pas introduire `bucket/track` maintenant.

Dépendances:
- après clarification de `Moment`
- dépend du lien réel `Moment ↔ Project/Series`

### 4. `Automations` / `Connectors` honnêtes
- Garder le backend et les hooks.
- Réduire l’exposition produit là où l’UI n’est pas crédible.
- Préserver les invariants capture pour extensions futures.

Dépendances:
- après nettoyage des surfaces cœur
- aucune migration forte

### 5. Hardening prod minimal parallèle
- Ajouter le plancher minimum:
  - rate limits
  - durcissement sessions
  - observabilité de base
  - quotas hooks minimum
  - storage attachments plus propre
- Garder le vrai lot prod final avant V1 publique.

## PR-sized slices
### Slice 1 — `/chat` compat then retirement`
- Remplacer la route `/chat` par un redirect vers `/sync`.
- Retirer la navigation et le wording qui exposent `/chat` comme vraie surface.
- Vérifier analytics et liens internes.
- Supprimer ensuite `page.tsx`, layout éventuel et composants legacy inutiles.

### Slice 2 — `Sync truthfulness + channel model freeze`
- Aligner web/mobile sur une vérité visible unique de Sync.
- Figer le shape minimal des canaux dans les types/configs où nécessaire:
  - `preferred_channel`
  - `available_channels[]`
  - `channel_by_output_type`
  - distinction `input_channel` / `output_channel`
- Ne pas encore ajouter d’UI avancée de gestion des canaux.

### Slice 3 — `Moment run-first cleanup`
- Passer `Content` en vue run par défaut.
- Garder `Studio` comme surface build dédiée.
- Simplifier CTA, fermeture, cartes, labels et affordances.
- Garder `Quick update` en compat tant que le runtime en dépend.

### Slice 4 — `Business blocks reclassification`
- Réorganiser le catalogue en:
  - `raw blocks`
  - `preset blocks`
  - `starter kits`
- Déclasser les blocks spécialisés en presets/advanced.
- Préparer la dépréciation future sans rupture immédiate de schéma.

### Slice 5 — `Projects and Series thin-real`
- Remplacer les pages placeholder par des pages minces réelles.
- Montrer seulement les données et relations déjà vraies.
- Aucun `bucket/track` visible.

### Slice 6 — `Automations and connectors minimization`
- Reclasser `Automations` et `Connectors` en surfaces discrètes/advanced si besoin.
- Retirer les promesses `coming soon` les plus trompeuses.
- Préserver les invariants capture:
  - `source_kind`
  - `source_app`
  - `source_url`
  - `origin_channel`
  - `shared_at?`

### Slice 7 — `Prod floor`
- Mettre en place le minimum sur abuse, sessions, observabilité, storage.
- Sans refonte IA/agentique, sans billing complet, sans offline-first.

## What to delete
- La surface produit `/chat` en tant qu’expérience distincte.
- Les composants/layouts/wordings qui racontent encore deux assistants.
- Les placeholders visibles sur les surfaces cœur.
- L’exposition premier niveau des blocks trop spécialisés.
- Les promesses UI excessives sur `Automations`, `Connectors`, `Coach`.

## What to rename or reclassify
- `Chat` -> `Sync` partout côté UX.
- `Moment Content` -> vue `Run`.
- `Studio` -> vue `Build`.
- `Hypothesis`, `Constraint`, `Risk`, `Question`, `Decision` -> presets ou advanced.
- `Metric` -> bloc à préparer pour convergence future, sans migration forte immédiate.
- `Automations` / `Connectors` -> capacités backend ou surfaces avancées, pas piliers produit visibles.

## What to keep stable
- Le runtime `preview/apply/undo`.
- Les schémas partagés Sync et business blocks.
- Le bridge `Event + Item.blocks + snapshots`.
- Le pipeline `Inbox / capture / capture_external`.
- Les relations `Event ↔ Project/Series`.
- Le modèle minimal de canaux.
- Les métadonnées capture source nécessaires aux futures extensions.

## What must be decided before coding
- La liste exacte des `raw blocks` exposés au premier niveau.
- Les blocks à déclasser immédiatement en presets/advanced.
- Le niveau d’exposition restant pour `Automations` et `Connectors`.
- Le minimum crédible des pages `Project` et `Series`.
- La politique de compat `/chat`:
  - redirect temporaire ou permanent
  - horizon de suppression complète
  - source de vérité pour analytics et liens internes

## What can be coded immediately
- Redirect `/chat` -> `/sync`.
- Nettoyage navigation/i18n/labels pour n’avoir qu’une surface IA.
- Nettoyage UX de `Moment` sans changer son stockage.
- Reclassification UI du catalogue de blocks.
- Remplacement des pages `Project` / `Series` placeholder par des pages minces réelles.
- Minimisation de `Automations` / `Connectors`.
- Préservation explicite du modèle minimal de canaux dans les types/configs concernés.
- Préservation explicite des métadonnées capture source.
- Début du hardening minimal:
  - rate limits
  - session hardening
  - observabilité basique
  - storage attachments plus propre

## Test plan
- Vérifier que tous les anciens liens `/chat` ouvrent bien `/sync`.
- Vérifier qu’aucune navigation web/mobile n’expose encore une surface chat distincte.
- Vérifier que `Moment` reste éditable/sauvable sans régression sur `Event` et `Item.blocks`.
- Vérifier que les pages `Project` / `Series` n’affichent plus de placeholder mensonger.
- Vérifier que `capture_external` et Inbox conservent les métadonnées source attendues.
- Vérifier que les contrats Sync/business blocks/events restent compatibles avec les tests existants.

## Assumptions and locked defaults
- Priorité confirmée: `produit d’abord`.
- Migration confirmée: `faible`, compat ascendante.
- `bucket/track` est hors scope visible.
- `PydanticAI` n’est pas une dépendance du fast refactor.
- Les canaux sont figés comme contrainte de modèle minimale, pas comme chantier UX majeur.
- La compatibilité future `share extension` mobile et `browser extension` fait partie des invariants capture à ne pas casser.
