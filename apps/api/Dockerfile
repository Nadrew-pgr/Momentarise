# Momentarise API — image pour Render (Docker)
# Build depuis la racine du repo avec: docker build -f apps/api/Dockerfile apps/api
# Ou depuis apps/api avec: docker build -t momentarise-api .
FROM python:3.12-slim

WORKDIR /app

# Dépendances système éventuelles (asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Installer uv et les deps Python (projet local = tout le code nécessaire)
COPY . .
RUN pip install --no-cache-dir uv && uv sync --no-dev

# Render injecte PORT (ex: 10000). Écouter sur toutes les interfaces.
ENV PORT=8000
EXPOSE 8000

# Migrations puis démarrage du serveur
CMD uv run alembic upgrade head && uv run uvicorn src.main:app --host 0.0.0.0 --port ${PORT}
