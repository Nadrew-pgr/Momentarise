# Plan V2.2 — `Moment > Contenu` compact, mobile réel, avec `Builder` + `Run mode`

## Summary
- Le mobile n’a pas encore reçu de vraie refonte produit: le code est branché, mais l’UI reste une première passe lourde et form-like. Ce lot corrige cela explicitement.
- `Moment > Contenu` passe à un modèle unique de données, avec **deux modes d’affichage** pour les mêmes `BusinessBlock[]`:
  - `Builder` pour construire le Moment
  - `Run mode` pour suivre et mettre à jour le Moment pendant qu’il se déroule
- `Run mode` s’active en **auto + manuel**:
  - auto si le Moment est `tracking` ou si l’heure courante est dans l’intervalle `[start, end]`
  - toggle manuel toujours disponible pour revenir en Builder
- Le studio devient plus compact et plus minimaliste:
  - header réduit
  - input/composer IA avec petite icône
  - métriques condensées en chips/pills, pas en grosses cartes
  - blocks actifs plus denses, avec seulement l’essentiel visible
- `Quick update` devient un **raccourci runtime minimal**, et prépare le même moteur qui sera réutilisé plus tard par le `FAB` et la voix.

## Implementation Changes
### 1. Modèle partagé et moteur runtime
- Conserver un seul modèle de contenu: `BusinessBlock[]`.
- Introduire un mode d’affichage partagé `builder | run` côté UI, sans nouvelle entité backend.
- Remplacer la logique conceptuelle de `QuickUpdateDraft` par un **moteur partagé de runtime patch** exposé par `packages/shared`, utilisé d’abord par `Quick update`, puis plus tard par `FAB`/voix.
- Réduire le périmètre runtime patch V1 à:
  - `status`
  - `energy`
  - `progress delta`
  - `next action`
- Sortir `blockers` de `Quick update`:
  - `blockers` reste un `text_block`
  - les saisies plus verbales passeront plus tard par le composer/FAB/voix
- Étendre `scale_block.payload` de façon additive pour supporter le comportement demandé:
  - `unit?: string | null`
  - `target?: number | null`
  - `step?: number`
  - `display_mode?: "slider" | "steps"`
- Garder les routes backend existantes:
  - `GET/PATCH /api/v1/events/{event_id}/content`
- Le schéma reste `business_blocks_v1`, avec extension additive et backward-compatible.

### 2. Shell studio web
- Réduire encore le header du modal:
  - ligne 1: titre + chips projet/série + close
  - ligne 2: input/composer IA avec petite icône dédiée
  - à droite de l’input: **métriques condensées** en badges/chips compacts
- Remplacer les trois cartes `Status / Time left / Energy` par une présentation compacte du type:
  - `Status 25%`
  - `14m left`
  - `Energy 4 (+4)`
- Retirer du header toute copie non essentielle et tout texte en doublon.
- Conserver le studio fullscreen large, mais avec une densité d’information nettement plus élevée.
- Ajouter un toggle `Builder / Run` visible dans le studio web.
- En `Run mode`, rendre le canvas plus proche d’un suivi vivant que d’un formulaire.

### 3. Shell studio mobile
- Refaire réellement `Moment > Contenu` sur mobile au lieu de réutiliser seulement la première version lourde.
- Header mobile:
  - titre du Moment
  - chips projet/série
  - input/composer IA compact avec icône
  - métriques sous forme de pills compactes, pas de grosses cartes 3 colonnes
- Ajouter le même toggle `Builder / Run` avec auto-activation si tracking/in-progress.
- Garder la barre basse fixe, mais la simplifier:
  - `Add block`
  - `Update`
- Repenser les sheets mobile:
  - `Add block` plus proche d’un form builder type Tally
  - `Update` minimal et clairement runtime, pas mini studio

### 4. Densification des blocks
- Principe général:
  - une seule carte ouverte à la fois
  - carte fermée très compacte
  - carte ouverte: uniquement les champs essentiels inline
  - configuration avancée cachée derrière `Advanced` / `More`
- `text_block`
  - label masqué par défaut
  - contenu comme surface principale
  - label déplaçable en zone avancée
- `checklist_block`
  - builder: liste compacte, compteur visible, ajout rapide
  - run: lignes ultra compactes avec simple tap pour cocher
- `scale_block`
  - builder: config légère (`label`, `unit?`, `target?`, `min/max/step` si besoin)
  - run: **slider compact** par défaut
  - `steps` reste possible seulement si `display_mode="steps"`
- `set_block`
  - builder: bloc d’exercice replié avec résumé du type `Bench Press · 4 sets`
  - run: lignes/set rows compactes, validation rapide `done`, reps/load visibles sans gros formulaire
  - `notes` et champs secondaires hors vue principale
- `status_block`
  - run: segmented control très compact
- `task_block`
  - run: une ligne, action immédiate
- `link_block`, `attachment_block`, `inbox_block`
  - rendu liste/chips compact
  - pas de gros panneaux d’édition par défaut
- `fields_block`, `table_block`, `key_value_block` et blocks rares
  - Builder prioritaire
  - Run simplifié en lecture compacte ou interaction minimale

### 5. `Quick update` et futur FAB/voix
- Renommer mentalement `Quick update` en **runtime update**.
- Ce lot ne branche pas encore `FAB`/voix, mais met en place le bon socle:
  - un moteur partagé de patch runtime
  - utilisé par le sheet `Update` dans `Contenu`
- Le futur `FAB`/voix devra réutiliser exactement ce moteur:
  - résolution du Moment cible
  - interprétation de l’intention
  - patch des blocks existants ou insertion d’un block si nécessaire
- Politique runtime pour le futur:
  - si l’intention est “évaluation/signal” → patch `status/energy/progress`
  - si l’intention est “ajoute une étape” → insertion `task_block` ou item checklist
  - si l’intention est verbale/ambiguë → capture structurée puis proposition de patch

## Public APIs / Interfaces / Types
- `scale_block.payload` gagne:
  - `unit?: string | null`
  - `target?: number | null`
  - `step?: number`
  - `display_mode?: "slider" | "steps"`
- Nouveau type partagé côté studio:
  - `ContentRenderMode = "builder" | "run"`
- Nouveau type partagé côté patch runtime:
  - `RuntimeUpdateDraft`
- Pas de nouvelle route backend pour ce lot.
- Pas de nouveau modèle de persistance séparé pour l’exécution.

## Test Plan
- Mobile:
  - `Moment > Contenu` est visiblement refondu, pas simplement inchangé
  - header compact, pills de métriques, composer IA visible
  - `Builder / Run` fonctionne en auto + manuel
- Web:
  - header du studio ne prend plus une hauteur disproportionnée
  - métriques compactes à droite du composer
  - pas de retour d’accents verts hardcodés
- Blocks:
  - une seule carte ouverte à la fois
  - carte fermée très compacte
  - `scale_block` en slider en `run`
  - `checklist_block` rapide à cocher
  - scénario workout avec 6 exercices reste lisible et non interminable
- Runtime:
  - `Quick update` réduit aux 4 signaux
  - patch des bons blocks existants
  - création des blocks runtime manquants si absents
- Data:
  - save/autosave inchangés
  - contenu existant compatible avec les anciens `scale_block`
  - aucun endpoint cassé

## Assumptions
- `Run mode` s’active automatiquement si `isTracking === true` ou si `now` est entre `start` et `end`, mais l’utilisateur peut toujours le désactiver manuellement.
- `blockers` sort de `Quick update` et reste traité comme contenu normal ou futur runtime capture.
- L’input IA reste un placeholder non branché dans ce lot.
- La présentation exacte diffère entre web et mobile, mais les règles de densité et le moteur runtime sont partagés.
- Les blocks rares gardent une édition plus simple; le polish maximal est réservé aux blocks fréquents (`text`, `checklist`, `scale`, `task`, `status`, `set`, `inbox`).
