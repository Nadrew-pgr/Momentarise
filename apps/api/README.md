# Momentarise API

Backend FastAPI pour le Life OS Momentarise.

## Stack

- **Python 3.12** géré via **uv**
- **FastAPI** (async)
- **SQLAlchemy 2** (async, avec asyncpg)
- **PostgreSQL 15** (via Docker)
- **Alembic** (migrations)
- **Pydantic v2** (validation)
- **PyJWT** + **bcrypt** (auth)

## Setup

```bash
# Prérequis : Docker lancé, Postgres up (depuis la racine)
# cd ../../ && docker compose up -d db && cd apps/api

uv sync                                    # Installer les dépendances
uv run alembic upgrade head                # Appliquer les migrations
uv run python -m src.seed                  # Créer le user de test
uv run uvicorn src.main:app --reload       # Lancer (port 8000)
```

## Variables d'environnement (.env)

| Variable | Description | Valeur dev |
|---|---|---|
| `DATABASE_URL` | URL async PostgreSQL | `postgresql+asyncpg://momentarise:momentarise_dev@localhost:5432/momentarise_dev` |
| `JWT_SECRET` | Clé de signature JWT | `dev-secret-change-me-in-prod` |
| `JWT_ALGORITHM` | Algo JWT | `HS256` |
| `JWT_EXPIRE_MINUTES` | Durée du token | `60` |
| `CORS_ORIGINS` | Origines autorisées (séparées par virgule) | `http://localhost:3000` |

## Architecture des dossiers

```
src/
├── main.py              # App FastAPI + middlewares + routeurs
├── seed.py              # Script de seeding (user de test)
├── core/
│   ├── config.py        # pydantic-settings (lit .env)
│   ├── database.py      # Engine async + session factory
│   ├── security.py      # hash/verify password (bcrypt), create/decode JWT
│   └── deps.py          # Dépendances FastAPI (get_current_user, get_current_workspace)
├── models/
│   ├── base.py          # Base declarative + BaseMixin (id, timestamps, soft delete)
│   ├── enums.py         # WorkspaceRole enum
│   ├── user.py          # User + UserIdentity
│   └── workspace.py     # Workspace + WorkspaceMember
├── schemas/
│   └── auth.py          # LoginRequest, SignupRequest, TokenResponse, MeResponse
└── api/v1/
    ├── health.py        # GET /api/v1/health
    └── auth.py          # POST /api/v1/auth/login, POST /api/v1/auth/signup, GET /api/v1/auth/me
```

## Routes (Slice 0)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | Non | Liveness probe |
| POST | `/api/v1/auth/login` | Non | `{email, password}` → `{access_token}` |
| POST | `/api/v1/auth/signup` | Non | `{email, password}` → crée user + workspace → `{access_token}` |
| GET | `/api/v1/auth/me` | Bearer | Retourne user + workspace actif |

## Modèle de données (Slice 0)

```
users ──────────────── user_identities
  │                        (provider, provider_subject, hashed_password)
  │
  ├── workspaces (owner_id → users.id)
  │
  └── workspace_members (user_id + workspace_id + role)
```

- `UserIdentity` permet d'ajouter OAuth/SSO sans toucher à `users`
- `WorkspaceMember.role` : ADMIN ou USER

## Ajouter une migration

```bash
# Modifier un modèle dans src/models/, puis :
uv run alembic revision --autogenerate -m "description_du_changement"
uv run alembic upgrade head
```

## User de test (seed)

- Email : `dev@momentarise.local`
- Password : `password`
- Workspace : "Mon Workspace" (rôle ADMIN)
