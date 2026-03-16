# Momentarise — Life OS

## Présentation

Application "Life OS" : Capture → Transformer → Planifier → Exécuter → Réviser.

- **Backend** : FastAPI (Python) — `apps/api/`
- **Web** : Next.js App Router (BFF) — `apps/web/`
- **Mobile** : Expo Router — `apps/mobile/`

## Prérequis

- **Docker Desktop** (pour PostgreSQL)
- **Python 3.12+** + **uv** (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Node.js 20+** + **pnpm** (pour gérer le monorepo web et mobile)
- **Expo Go** sur iPhone/Android (pour tester le mobile)

## Démarrage rapide

### 0. Installer pnpm proprement sur macOS
Si `pnpm` n'est pas installé, il ne faut **pas** utiliser `sudo npm install -g pnpm`.
Il faut l'installer dans le répertoire global de l'utilisateur :

```bash
npm install -g pnpm --prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"
# (Ajoutez la ligne export PATH... à votre ~/.zshrc)
```

### 1. Base de données

```bash
# Depuis la RACINE du projet (Momentarise/)
docker compose up -d db
```

Cela lance PostgreSQL 15 sur `localhost:5432` (user: `momentarise`, password: `momentarise_dev`, db: `momentarise_dev`).

### 2. Backend API

```bash
cd apps/api
uv sync
uv run alembic upgrade head
uv run python -m src.seed      # → dev@momentarise.local / password
uv run uvicorn src.main:app --reload --port 8000
```

L'API est accessible sur `http://localhost:8000`.
La doc OpenAPI interactive : `http://localhost:8000/docs`.

### 3. Frontend Web

```bash
cd apps/web
pnpm install
pnpm run dev
# Ou depuis la racine : pnpm run --filter web dev
```

L'app web est accessible sur `http://localhost:3000`.

### 4. Frontend Mobile

```bash
cd apps/mobile
pnpm install
pnpm run start
# Ou depuis la racine : pnpm run --filter mobile start
```

Scanner le QR code avec l'app Expo Go sur votre téléphone.

**Important** :
- Configurer `EXPO_PUBLIC_API_URL` dans `apps/mobile/.env` avec l'IP locale du Mac (ex: `http://192.168.1.42:8000`) ou un tunnel ngrok.
- Ajouter cette même IP dans `CORS_ORIGINS` du fichier `apps/api/.env` (ex: `CORS_ORIGINS=http://localhost:3000,http://192.168.1.42:8000`).

### 5. Tester l'API

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@momentarise.local","password":"password"}'

# Signup
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","password":"password"}'

# Me (remplacer <TOKEN> par le access_token reçu)
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

## Structure du projet

```
Momentarise/
├── docker-compose.yml          # PostgreSQL (dev)
├── project/                    # Specs, idées, docs produit
│   ├── specs/                  # Spécifications techniques (SSoT)
│   ├── distilled/             # Ledger d'idées trié
│   ├── inbox_raw/             # Conversations brutes
│   └── docs/                  # Documentation opérationnelle
├── pnpm-workspace.yaml         # Configuration du monorepo pnpm
├── package.json                # Scripts globaux pnpm
├── apps/
│   ├── api/                    # Backend FastAPI
│   │   ├── .env                # Variables d'environnement
│   │   ├── pyproject.toml      # Dépendances Python (uv)
│   │   ├── alembic/            # Migrations DB
│   │   └── src/                # Code source
│   ├── web/                    # Frontend Next.js
│   │   ├── package.json        # Dépendances Node (pnpm)
│   │   └── src/                # Code source
│   └── mobile/                 # Frontend Expo
│       ├── package.json        # Dépendances Node (pnpm)
│       └── app/                # Écrans (file-based routing)
├── .cursor/
│   └── rules/                  # Conventions pour le mode auto
└── .gitignore
```

## Conventions

- **Spec source de vérité** : `project/specs/Spécifications Techniques Phase 1.md`
- **DB** : UUID partout, `DateTime(timezone=True)`, soft delete (`deleted_at`)
- **API** : toutes les routes sous `/api/v1/`
- **Auth web** : JWT stateless ; Next.js gère le cookie HTTPOnly
- **Auth mobile** : JWT stateless ; token dans `expo-secure-store`
- **i18n** : aucune string en dur (fr + en)

## Commandes utiles

| Action | Répertoire | Commande |
|---|---|---|
| Lancer Postgres | `Momentarise/` | `docker compose up -d db` |
| Stopper Postgres | `Momentarise/` | `docker compose down` |
| Installer deps Python | `apps/api/` | `uv sync` |
| Nouvelle migration | `apps/api/` | `uv run alembic revision --autogenerate -m "description"` |
| Appliquer migrations | `apps/api/` | `uv run alembic upgrade head` |
| Seeder | `apps/api/` | `uv run python -m src.seed` |
| Lancer l'API | `apps/api/` | `uv run uvicorn src.main:app --reload --port 8000` |
| Installer deps pnpm | `Momentarise/` | `pnpm install` |
| Lancer le web | `Momentarise/` | `pnpm run --filter web dev` |
| Lancer le mobile | `Momentarise/` | `pnpm run --filter mobile start` |
| Vérifier la lane (red zone) | `Momentarise/` | `pnpm run lane:check` |

## Dépannage rapide

### Guardrail lane (travail multi-agents)

Pour activer le hook git local de blocage red-zone:

```bash
git config core.hooksPath .githooks
```

Le hook exécute `npm run lane:check` avant chaque commit.

### Erreur SQLAlchemy `sqlalche.me/e/20/f405` (colonne inexistante)

Symptôme courant:
- `column items.kind does not exist`
- `column inbox_captures.capture_type does not exist`

Cause:
- les modèles Python sont plus avancés que le schéma de la base locale.

Correctif:

```bash
cd apps/api
uv run alembic upgrade head
```

Puis redémarrer l'API:

```bash
uv run uvicorn src.main:app --reload --port 8000
```

### Timeline visible mais données absentes (web/mobile)

Symptôme courant:
- La grille calendrier s'affiche, mais un message réseau apparaît.
- Les requêtes `/api/today`, `/api/inbox` ou `/api/items` retournent `500`.

Checklist:

```bash
# 1) Vérifier que l'API tourne
curl http://localhost:8000/api/v1/health

# 2) Vérifier le schéma DB (migrations à jour)
cd apps/api
uv run alembic upgrade head

# 3) Mobile: vérifier l'URL API (IP locale, pas localhost)
cat apps/mobile/.env
```

Rappel mobile:
- `EXPO_PUBLIC_API_URL` doit pointer vers une IP joignable depuis le téléphone (ex: `http://192.168.x.x:8000`).
- Si l'API est down, la timeline reste visible mais les données ne se chargent pas.
