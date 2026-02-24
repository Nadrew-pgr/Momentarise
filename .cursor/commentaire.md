# Commentaire d'avancement — Slice 1 (corrections jusqu'à l'étape 4.5)

Date: 2026-02-23

## Statut gate 4.5
- **GO** : l'équipe peut démarrer l'étape 5.
- Validation effectuée après corrections et checks techniques.

## Verdict rapide
- Avancement solide sur le backend (étapes 1 à 4 réalisées pour Slice 1).
- L'étape 4.5 est validée (contrats + hardening + checks).
- Priorité immédiate: implémenter l'étape 5 (BFF web) sans réouvrir les contrats.

## GO / NO-GO avant étape 5
- Points validés:
1. [x] `@momentarise/shared` consommé côté web/mobile auth.
2. [x] `loginSchema` + `signupSchema` dans `packages/shared/src/auth.ts`.
3. [x] `GET /timeline?date=` renvoie 422 si format invalide.
4. [x] `get_current_workspace` filtre `workspace.deleted_at IS NULL`.
5. [x] Contrat API `actual_time_acc` conservé et documenté.
6. [x] Smoke checks: API compile, mobile typecheck OK, web lint sans erreur bloquante.

## Priorité haute (à corriger en premier)
1. `get_current_workspace` doit ignorer les workspaces supprimés.
- État actuel: sélectionne le membership le plus ancien sans vérifier `workspace.deleted_at`.
- Risque: un membership actif pointant vers un workspace soft-delete peut passer.
- Action: joindre `Workspace` et filtrer `Workspace.deleted_at IS NULL`.

2. `GET /timeline` ne doit pas fallback silencieusement si `date` invalide.
- État actuel: date invalide => fallback sur aujourd'hui UTC.
- Risque: bug silencieux côté client.
- Action: renvoyer `422` (validation explicite) ou documenter clairement ce comportement comme règle produit.

3. `events` tracking: verrouiller les garde-fous DB.
- État actuel: `actual_time_acc_seconds` et `is_tracking` non protégés côté DB.
- Action:
  - ajouter `server_default` (`0` / `false`) dans migration,
  - ajouter `CheckConstraint(actual_time_acc_seconds >= 0)`.

4. Étape 4.5 incomplète: imports encore locaux.
- État actuel: web/mobile utilisent encore `@/schemas/auth`.
- Action: basculer vers `@momentarise/shared` avant de considérer 4.5 done.

## Étape 1 — Backend workspace dependency
### OK
- `get_current_workspace` existe et retourne le membership le plus ancien.

### À corriger
1. Filtrer aussi le workspace actif (`deleted_at IS NULL`).
2. (Optionnel) clarifier le code d'erreur: `404` vs `403` selon convention produit.

## Étape 2 — Modèles + migration Item/Event
### OK
- `Item` et `Event` créés.
- Routers et imports modèles branchés.
- Migration Alembic créée.

### À corriger
1. Ajouter des index utiles dans migration:
- `items(workspace_id, priority_order)`
- `events(workspace_id, start_at)`
- `events(workspace_id, is_tracking)`

2. Ajouter des defaults DB explicites (pas seulement ORM):
- `events.actual_time_acc_seconds` default `0`
- `events.is_tracking` default `false`

3. Ajouter check contraintes:
- `actual_time_acc_seconds >= 0`
- `estimated_time_seconds >= 0` (si vous voulez verrouiller les inputs)

## Étape 3 — Schemas Pydantic
### OK
- `today.py`, `timeline.py`, `event.py` présents.

### À corriger
1. Cohérence de naming tracking:
- API DB: `actual_time_acc_seconds`
- schema stop response: `actual_time_acc`
- Action: **conserver `actual_time_acc` côté API** (contrat spec) et documenter explicitement que c'est un alias de `actual_time_acc_seconds` côté DB.

2. Typage date timeline:
- `TimelineResponse.date` est `str` libre.
- Action: `date` typé/validé (format `YYYY-MM-DD`) pour éviter les sorties ambiguës.

## Étape 4 — Routes API
### OK
- Routes `GET /today`, `GET /timeline`, `POST /events/{id}/start|stop` en place.
- Filtre `workspace_id` + `deleted_at` déjà présent sur les queries clés.

### À corriger
1. Validation `date` timeline (ne pas fallback silencieux).
2. Clarifier la règle “events du jour”:
- aujourd'hui: filtre sur `start_at` dans la journée.
- à décider: inclure ou non les events qui chevauchent la journée (début avant minuit, fin après minuit).

3. Start/stop concurrence (double tap / multi-device):
- idempotence logique OK,
- action recommandée: test explicite + éventuellement lock transactionnel si vous observez des races.

## Étape 4.5 — Contrats partagés TS (Web + Mobile)

## Ce qui est déjà bon (4.5)
- Monorepo workspaces racine en place (`package.json` racine).
- Package `packages/shared` présent avec exports (`auth/today/timeline/events`).
- Dépendance `@momentarise/shared` ajoutée dans `apps/web/package.json` et `apps/mobile/package.json`.
- Next transpile le package (`apps/web/next.config.ts`).
- Metro configuré pour le monorepo (`apps/mobile/metro.config.js`).

## À corriger maintenant (pour considérer 4.5 done)
1. Basculer les imports des schémas Auth vers `@momentarise/shared`.
- Web:
  - `apps/web/src/components/login-form.tsx`
  - `apps/web/src/components/signup-form.tsx`
- Mobile:
  - `apps/mobile/app/login.tsx`
  - `apps/mobile/app/signup.tsx`
- Actuellement ces fichiers importent encore `@/schemas/auth`.

2. Ajouter les schémas d'input auth manquants dans le shared package.
- Ajouter dans `packages/shared/src/auth.ts`:
  - `loginSchema` (+ type `LoginInput`)
  - éventuellement `signupSchema` (si différent)
- Aujourd'hui `packages/shared/src/auth.ts` expose surtout le contrat `me` (read model), pas le contrat formulaire login/signup.

3. Supprimer la duplication locale après migration d'imports.
- `apps/web/src/schemas/auth.ts`
- `apps/mobile/schemas/auth.ts`
- Option: garder un alias temporaire qui re-exporte depuis `@momentarise/shared` pour migration douce.

4. Vérifier un smoke check post-migration.
- Web: typecheck/lint/build
- Mobile: démarrage Metro + check import runtime
- Objectif: valider qu'aucune résolution de module monorepo ne casse.

## Avis sur la note "primitives à figer"
- Direction long terme: bonne.
- Pour Slice 1: trop large si appliqué maintenant (risque de sur-modélisation).
- Reco: garder ce blueprint pour Phase 2+, et rester sur les primitives nécessaires à Slice 1 (`Item`, `Event`, tracking).
