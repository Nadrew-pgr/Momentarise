# Diagnostic & Architecture de Momentarise

## 1. Diagnostic des branchements
L'architecture globale du projet est **très propre et bien structurée** sous forme de monorepo (via NPM Workspaces). Voici l'analyse des "branchements" :

- **Backend API (`apps/api`)** : Isolé en Python (FastAPI + PostgreSQL + Celery/Redis). Cela permet d'avoir un backend orienté data/IA très performant et asynchrone, capable d'évoluer indépendamment des interfaces.
- **Partage de code (`packages/shared`)** : Le package `@momentarise/shared` est importé avec succès par `web` et `mobile`. C'est une excellente pratique : il centralise les types TypeScript et les schémas Zod, garantissant qu'en cas de changement du modèle de données, les 2 frontends seront prévenus d'erreurs de type au moment de la compilation.
- **Web (`apps/web`)** : Utilise le framework Next.js. Plutôt que de taper l'API en direct depuis le navigateur client, le Web utilise le pattern **BFF** (Backend-For-Frontend) avec Next.js. Ainsi, l'authentification peut être gérée de manière ultra-sécurisée via des cookies `HTTPOnly`.
- **Mobile (`apps/mobile`)** : React Native avec Expo et NativeWind. Communique de manière directe avec l'API exposée par FastAPI (`EXPO_PUBLIC_API_URL`). Le token d'auth est ici géré par le keychain de l'appareil (`expo-secure-store`).
- **Base de données** : PostgreSQL avec un outillage de pointe (`Alembic` pour les migrations, `asyncpg` pour la performance).

**Conclusion** : ✔️ *Tout est parfaitement branché.* La séparation Client lourd (Mobile) / BFF (Web) / API (Data/Logic) avec un socle de typage partagé (`shared`) est l'état de l'art actuel.

## 2. Vue d'ensemble (Diagramme Mermaid)

```mermaid
flowchart TD
    %% Base de données et Infrastructure
    subgraph Infra ["Infrastructure"]
        DB[("PostgreSQL 15")]
        Redis[("Redis")]
    end

    %% Backend Python
    subgraph Backend ["apps/api (Backend FastApi)"]
        API["API FastAPI\n(Port 8000)"]
        Celery["Celery Workers\n(Tâches Asynchrones)"]
        Alembic["Alembic\n(Migrations)"]
    end

    %% Package TypeScript partagé
    subgraph SharedPkg ["packages/shared"]
        Shared["Zod Schemas\n& Types TS"]
    end

    %% Frontend Web
    subgraph Web ["apps/web (Next.js)"]
        NextBFF["Next.js API Routes\n(BFF / HTTPOnly Cookies)"]
        WebUI["Client Web React App\n(Port 3000)"]
    end

    %% Frontend Mobile
    subgraph Mobile ["apps/mobile (Expo)"]
        MobileUI["App iOS / Android\n(React Native)"]
        SecureStore["Expo Secure Store\n(JWT)"]
    end

    %% --- Connexions ---

    %% API to Infra
    API <-->|"asyncpg"| DB
    Alembic -->|"Applique les migrations"| DB
    API <-->|"Tâches de fond"| Redis
    Celery <-->|"Consomme"| Redis
    Celery <-->|"asyncpg"| DB

    %% Web to API
    WebUI <-->|"Appels locaux"| NextBFF
    NextBFF <-->|"Appels HTTP Rest"| API

    %% Mobile to API
    MobileUI <-->|"Appels HTTP Rest directs"| API
    MobileUI -.->|"Stocke Token"| SecureStore

    %% Packages partagés
    Shared -.->|"Typage et validation"| WebUI
    Shared -.->|"Typage et validation"| NextBFF
    Shared -.->|"Typage et validation"| MobileUI

    %% AI Providers
    API -.->|"Traductions, Pixtral,\nMistral OCR..."| AI_Providers(("Providers IA externes\n(Mistral, etc.)"))
```
