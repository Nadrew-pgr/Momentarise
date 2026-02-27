# Timeline Troubleshooting

Guide rapide pour diagnostiquer les erreurs les plus fréquentes sur `/timeline` (web/mobile) et `/calendar` (web).

## 1) API down mais calendrier visible

Symptômes:
- message réseau du type `Unable to reach API ...`
- aucune donnée event, mais la grille horaire reste affichée.

Comportement attendu:
- la grille reste visible (fallback UX),
- seules les données événementielles sont absentes.

Actions:
1. Vérifier que l’API FastAPI tourne (`/api/v1/health` ou endpoint auth).
2. Vérifier `EXPO_PUBLIC_API_URL` côté mobile et URL backend côté web/BFF.
3. Redémarrer API puis recharger les clients.

## 2) Erreur SQLAlchemy `f405` (UndefinedColumnError)

Symptômes:
- erreurs backend `sqlalche.me/e/20/f405`
- colonnes manquantes (`events.color`, `workspace_members.preferences`, `items.kind`, etc.).

Cause:
- schéma DB pas aligné avec les modèles.

Actions:
1. Lister les révisions: `cd apps/api && uv run alembic heads`
2. Appliquer les migrations: `cd apps/api && uv run alembic upgrade head`
3. Redémarrer l’API.

## 3) Conflit multi-device sur préférences calendrier (`409`)

Symptômes:
- `PATCH /api/v1/preferences/calendar` retourne `409`.

Cause:
- un autre device/session a modifié `start_hour/end_hour` entre temps.

Comportement attendu:
- client affiche erreur explicite,
- refetch auto des préférences serveur,
- UI réhydratée avec les valeurs serveur.

Actions:
1. Recharger l’écran timeline/calendar.
2. Refaire la modification avec les nouvelles valeurs.

## 4) Vérification technique rapide

1. `npm run -w apps/web lint`
2. `cd apps/web && npx tsc --noEmit`
3. `cd apps/mobile && npx tsc --noEmit`
4. `cd apps/api && uv run python -m py_compile src/api/v1/events.py src/api/v1/timeline.py src/api/v1/preferences.py src/schemas/event.py src/schemas/timeline.py src/schemas/preferences.py`
5. `cd apps/api && uv run alembic upgrade head`
