import os

errors_content = """
## [ERR-20260302-001] Render API - OperationalError (Connection Refused)

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
L'API a échoué à démarrer sur Render car `DATABASE_URL` essayait de se connecter à localhost (`127.0.0.1:5432`) au lieu de la base interne PostgreSQL.

### Error
```
[Errno 111] Connect call failed ('::1', 5432, 0, 0)
sqlalchemy.exc.OperationalError: (auto_explain) [Errno 111]
```

### Context
- L'URL de la base n'était pas injectée car le Blueprint (`render.yaml`) n'avait pas été synchronisé manuellement sur le dashboard.
- Render instancie des bases de données de type `postgres://` qui ne sont pas supportées nativement par `asyncpg` sans conversion.

### Suggested Fix
1. Provisionner la base de données PostgreSQL séparément.
2. Ajouter un validateur pydantic dans `config.py` pour remplacer `postgres://` par `postgresql+asyncpg://` à la volée.
3. Injecter l'Internal DB URL correctement.

### Metadata
- Related Files: `apps/api/src/core/config.py`

---

## [ERR-20260302-002] Vercel Build - TypeScript dangerouslySetInnerHTML 

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Le déploiement Vercel a planté à l'étape "Running TypeScript" à cause d'un mismatch de type sur la prop `dangerouslySetInnerHTML` du composant `schema-display.tsx`.

### Error
```
Type error: Type 'string | number...' is not assignable to type 'string | TrustedHTML'.
dangerouslySetInnerHTML={{ __html: children ?? highlightedPath }}
```

### Context
- React 18+ strict TS typings attendent un string pur. La prop `children` était trop large.

### Suggested Fix
- Utiliser un cast explicite vers String : `dangerouslySetInnerHTML={{ __html: String(children ?? highlightedPath) }}`.

### Metadata
- Related Files: `apps/web/src/components/ai-elements/schema-display.tsx`

---

## [ERR-20260302-003] Vercel MCP - 404 SSE Error mcp-remote

**Logged**: 2026-03-02
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
Impossible de se connecter au serveur Vercel MCP via `mcp-remote` officiel (retour 404 / 405 endpoint).

### Error
```
Connection error: SseError: SSE error: Non-200 status code (404)
```

### Context
- Le serveur MCP natif Vercel requiert un token et un setup potentiellement différent.

### Suggested Fix
Utiliser le proxy communautaire `@mistertk/vercel-mcp` qui est complet via NPX en setttant la variable `VERCEL_API_KEY`.

### Metadata
- Related Files: `.gemini/antigravity/mcp_config.json`

---
"""

learnings_content = """
## [LRN-20260302-001] Déploiement Render & Vercel MCP

**Logged**: 2026-03-02
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Liaison sécurisée entre Render (Backend) et Vercel (Frontend), plus intégration des serveurs MCP.

### Details
- **Render Database Sync** : Pousser un fichier `render.yaml` ne suffit pas, il faut manuellement lancer un "Blueprint Sync" dans Render pour que l'infrastructure fantôme soit allouée. En l'absence de ça, créer la base manuellement via l'API Render reste nécessaire.
- **Asyncpg & Postgres URL** : Render donne des URL `postgres://` alors que SQLAlchemy/Asyncpg exige `postgresql+asyncpg://`. Le Pydantic `field_validator` sur Pydantic settings est indispensable.
- **MCP Vercel** : L'intégration MCP Vercel fonctionne parfaitement avec le package `@mistertk/vercel-mcp`, ce qui permet d'éditer les `API_URL` à la volée.

### Suggested Action
- Toujours vérifier le statut du déploiement Blueprint côté Render.
- Documenter l'usage des MCP en local pour administrer Vercel (`mcp_config.json`).

---
"""

with open('.learnings/ERRORS.md', 'a') as f:
    f.write(errors_content)

with open('.learnings/LEARNINGS.md', 'a') as f:
    f.write(learnings_content)

print("Appended learning logs successfully.")
