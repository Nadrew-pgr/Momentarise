# Déploiement backend (API) sur Render

## Décision

- **Backend hébergé sur Render** (Web Service Docker) pour permettre au front Vercel (momentarise.vercel.app) de s’y connecter.
- **Raison** : plan gratuit utilisable sans carte ; Railway / Fly.io / autres réservés pour plus tard (usage / coût).
- **Où c’est noté** : ce fichier (`project/docs/deploy-backend-render.md`).

## Prérequis

- Repo GitHub **Nadrew-pgr/Momentarise** connecté à Render.
- Une **base PostgreSQL** sur Render (créer un “PostgreSQL” dans le dashboard ; Render fournit une Internal Database URL).

## 1. Créer la base PostgreSQL (Render)

1. Dashboard Render → **New +** → **PostgreSQL**.
2. Nom (ex. `momentarise-db`), région **Frankfurt (EU Central)** (même que le Web Service).
3. Créer la base. Une fois créée, aller dans **Connect** → **Internal Database URL** et copier l’URL (format `postgresql://user:pass@host/dbname`).
4. Pour SQLAlchemy async, remplacer le schéma : `postgresql://` → `postgresql+asyncpg://`.
  Exemple :  
   `postgresql://momentarise_xxx:yyy@dpg-xxx.frankfurt-postgres.render.com/momentarise_zzz`  
   →  
   `postgresql+asyncpg://momentarise_xxx:yyy@dpg-xxx.frankfurt-postgres.render.com/momentarise_zzz`  
   C’est la valeur à mettre dans `DATABASE_URL`.

## 2. Créer le Web Service (API)

1. **New +** → **Web Service**.
2. **Connect repository** : **Nadrew-pgr/Momentarise**, branche **main**.
3. **Configuration** :
  - **Name** : `momentarise` (ou un nom unique).
  - **Region** : **Frankfurt (EU Central)** (idéalement même que la DB).
  - **Root Directory** : `apps/api`  
  → Render exécute les commandes et le build depuis ce dossier (monorepo).
  - **Runtime** : **Docker**.
  - **Dockerfile Path** : `./Dockerfile` (relatif à Root Directory = `apps/api/Dockerfile`).
  - **Instance Type** : **Free** ($0/month) pour commencer.

### Variables d’environnement

À définir dans l’onglet **Environment** du Web Service :


| Variable       | Description                                                | Exemple / note                                                                  |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL` | URL PostgreSQL pour async (schéma `postgresql+asyncpg://`) | Voir §1 (Internal URL modifiée).                                                |
| `JWT_SECRET`   | Secret pour signer les JWT (fort, aléatoire).              | Générer ex. `openssl rand -base64 32`.                                          |
| `CORS_ORIGINS` | Origines autorisées (séparées par des virgules).           | `https://momentarise.vercel.app` (et `http://localhost:3000` en dev si besoin). |


- **Optionnel** : `JWT_ALGORITHM` = `HS256`, `JWT_EXPIRE_MINUTES` = `60` (sinon valeurs par défaut du code).

Render injecte automatiquement `**PORT`** ; le Dockerfile utilise `PORT` pour uvicorn (`--port ${PORT}`).

### Déploiement

- **Deploy** → Render build l’image depuis `apps/api/Dockerfile`, lance les migrations (`alembic upgrade head`) puis uvicorn.
- Une fois le service “Live”, l’URL sera du type :  
`https://momentarise-xxxx.onrender.com`

## 3. Vercel : pointer le front vers l’API

1. Vercel → projet **momentarise** → **Settings** → **Environment Variables**.
2. Ajouter :
  - **Name** : `API_URL`
  - **Value** : `https://momentarise-xxxx.onrender.com` (sans slash final).
  - **Environments** : Production (et Preview si tu veux que les previews appellent aussi cette API).
3. **Redeploy** le front (Deployments → … → Redeploy).

Après ça, le login depuis momentarise.vercel.app utilise le backend Render.

## 4. Résumé des fichiers concernés

- **Build / run** : `apps/api/Dockerfile` (uv, migrations, uvicorn sur `0.0.0.0:${PORT}`).
- **Ignore** : `apps/api/.dockerignore` (évite de copier .venv, .env, etc.).
- **Config API** : `apps/api/src/core/config.py` lit `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, etc.

## 5. Limitations plan Free (Render)

- Le service peut “spin down” après inactivité ; la première requête après un moment peut être lente (cold start).
- Pas de persistance disque sur l’instance ; tout doit passer par la base PostgreSQL.

## 6. Évolutions possibles

- **Starter / paid** : meilleure dispo, pas de spin down.
- **Railway / Fly.io / autre** : même principe (Docker + `DATABASE_URL` + `API_URL` sur Vercel) ; à documenter dans ce fichier ou un lien vers une autre doc si tu changes d’hébergeur.

