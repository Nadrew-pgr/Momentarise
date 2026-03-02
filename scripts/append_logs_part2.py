import os

errors_content = """
## [ERR-20260302-004] Render Postgres - 401 Unauthorized (Empty Database)

**Logged**: 2026-03-02
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
L'authentification sur Vercel (Production) échouait avec un statut 401 "Invalid credentials" malgré des identifiants corrects localement.

### Error
```
401 Unauthorized - POST /api/auth/login
```

### Context
- Une nouvelle base de données de production venait d'être créée via l'API Render.
- La base était de facto totalement vide, sans les données ni les utilisateurs du container Docker local.

### Suggested Fix
1. S'inscrire à nouveau (Sign Up) sur l'environnement de production.
2. Ou effectuer un data dump de la base locale vers la base de production (`pg_dump -a` | `psql`).

### Metadata
- Related Files: `apps/web/src/app/api/auth/login/route.ts`

---

## [ERR-20260302-005] Render Postgres - SSL Connection closed unexpectedly

**Logged**: 2026-03-02
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
La tentative de migration manuelle locale vers cloud (`pg_dump | psql`) s'est soldée par un kill de connexion SSL côté serveur Render.

### Error
```
psql: error: connection to server at "dpg-d6ikkht...oregon-postgres.render.com" failed: SSL connection has been closed unexpectedly
```

### Context
- Render bloque par défaut tout le trafic IPv4 externe vers une base de données fraîchement instanciée (`ipAllowList: null`).
- L'API Render `PUT` ne met pas à jour cette liste proprement, la méthode `PATCH` est requise pour altérer les champs spécifiques comme `ipAllowList`.

### Suggested Fix
- Utiliser un call API explicite avec `PATCH` pour autoriser temporairement `0.0.0.0/0` (anywhere).
- Exécuter la migration avec la variable d'environnement `PGSSLMODE=require` activée pour `psql`.
- Rétablir l'ipAllowList à `[]` pour couper les accès externes post-migration.

### Metadata
- Related Files: `render.yaml`

---
"""

learnings_content = """
## [LRN-20260302-002] Trousse de secours de migration Render

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Dangers d'une base de données neuve (authentification) et blocages réseau par défaut sur Render.

### Details
- Il est très facile d'oublier lors d'un déploiement que provisionner une infra neuve requiert de migrer les données initiales ("Invalid credentials" 401). Le check de santé API n'est qu'un indicateur de boot, pas de validité relationnelle.
- Render protège ses PostgreSQL cloud par des listes statiques d'IPs. La modification programmatique se fait via le endpoint d'update `PATCH /v1/postgres/{id}` et non `PUT`.
- Lors d'une connexion `psql` shell direct vers la DB Cloud, `PGSSLMODE=require` est obligatoire sous peine de fin de session SSL inattendue.

### Suggested Action
- Toujours vérifier ou automatiser le remplissage d'une base de données fraîchement déployée (seeders ou migration locale).
- Ne pas laisser `0.0.0.0/0` dans le IP Allow List d'une DB Render après une intervention locale (rétablir en `[{"cidrBlock": ".../32"}]` ou `[]`).

---
"""

with open('.learnings/ERRORS.md', 'a') as f:
    f.write(errors_content)

with open('.learnings/LEARNINGS.md', 'a') as f:
    f.write(learnings_content)

print("Appended learning logs part 2 successfully.")
