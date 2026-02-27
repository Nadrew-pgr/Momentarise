# Documentation projet (project/docs/)

Documentation opérationnelle et de référence du monorepo Momentarise. Pour les specs produit et le ledger d’idées, voir les dossiers frères (`specs/`, `distilled/`).

## Fichiers présents

| Fichier | Rôle |
|---------|------|
| **README.md** (ce fichier) | Index et organisation de la doc |
| **self-improvement.md** | Workflow d’apprentissage : quand et comment alimenter `.learnings/` (erreurs, corrections, idées), formats, promotion |
| **mobile-components-reference.md** | Référence composants React Native / Expo (libs recommandées, statut, priorité, commandes d’install) |
| **deploy-backend-render.md** | Déploiement de l’API (FastAPI) sur Render (PostgreSQL, Web Service, variables d’env) |
| **timeline-troubleshooting.md** | Runbook calendrier/timeline (API down, conflit `409`, migration manquante `f405`) |

## Où mettre quoi

- **Décisions techniques, déploiement, procédures** → un fichier dédié ici (`project/docs/<sujet>.md`).
- **Références (composants, libs, stack)** → fichier de référence comme `mobile-components-reference.md`.
- **Erreurs, corrections, bonnes pratiques** → `.learnings/` à la racine du repo (voir `self-improvement.md`).
- **Idées en vrac / fonctionnalités souhaitées** → `.learnings/IDEAS.md` ou `.learnings/FEATURE_REQUESTS.md` (pas dans les docs comme « feuilles volantes »).
- **Intention produit, décisions de fond (slices, onboarding)** → doc dédié sous `project/docs/` si besoin.
- **Spécifications techniques (SSoT)** → `project/specs/`.
- **Ledger d’idées triées** → `project/distilled/`.

## Règle Cursor

La règle `.cursor/rules/self-improvement.mdc` demande d’alimenter `.learnings/` dès qu’il y a une erreur, une correction ou une idée, et de privilégier `.learnings/` plutôt que des notes éparses dans la doc.
