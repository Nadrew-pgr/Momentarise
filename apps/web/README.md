# Momentarise Web

Frontend Next.js (BFF) pour le Life OS Momentarise.

## Stack

- **Next.js 16** App Router
- **shadcn/ui** (composants UI)
- **Tailwind CSS v4** (styling)
- **TanStack Query** (server state)
- **Zustand** (client state)
- **Zod** (validation)
- **i18next** + **react-i18next** (i18n)

## Setup

```bash
# Prérequis : API FastAPI lancée sur localhost:8000
npm install
npm run dev    # → http://localhost:3000
```

## Variables d'environnement (.env.local)

| Variable | Description | Valeur dev |
|---|---|---|
| `API_URL` | URL du backend FastAPI | `http://localhost:8000` |

Cette variable est server-only (pas de `NEXT_PUBLIC_` prefix).

## Architecture BFF

Le navigateur n'appelle **jamais** FastAPI directement :

```
Browser → Next.js Route Handler (/api/...) → FastAPI (/api/v1/...)
```

Le cookie `mm_access_token` (HTTPOnly) est posé par Next.js.
FastAPI ne connaît que le header `Authorization: Bearer`.

## Routes BFF (Slice 0)

| Méthode | Route Next.js | Proxy vers FastAPI | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `/api/v1/auth/login` | Login + set cookie |
| POST | `/api/auth/signup` | `/api/v1/auth/signup` | Signup + set cookie |
| POST | `/api/auth/logout` | — | Efface le cookie |
| GET | `/api/auth/me` | `/api/v1/auth/me` | Proxy avec Bearer |

## Architecture des dossiers

```
src/
├── middleware.ts                # Auth redirect (protège les routes)
├── app/
│   ├── layout.tsx              # Root layout (fonts, providers)
│   ├── (auth)/
│   │   ├── login/page.tsx      # Page de connexion
│   │   └── signup/page.tsx     # Page d'inscription
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Cockpit (sidebar + content)
│   │   ├── today/page.tsx
│   │   ├── inbox/page.tsx
│   │   ├── timeline/page.tsx
│   │   └── me/page.tsx
│   └── api/auth/               # Route Handlers BFF
│       ├── login/route.ts
│       ├── signup/route.ts
│       ├── logout/route.ts
│       └── me/route.ts
├── components/
│   ├── ui/                     # shadcn/ui (auto-generated)
│   ├── app-sidebar.tsx         # Sidebar navigation
│   ├── login-form.tsx          # Formulaire de connexion
│   ├── signup-form.tsx         # Formulaire d'inscription
│   └── providers.tsx           # QueryClient + i18n
├── hooks/
│   ├── use-me.ts               # TanStack Query hook pour /api/auth/me
│   └── use-mobile.ts           # Détection mobile
├── i18n/
│   ├── config.ts               # Configuration i18next
│   ├── fr.json                 # Traductions françaises
│   └── en.json                 # Traductions anglaises
├── lib/
│   ├── bff.ts                  # Helper proxy avec auth
│   ├── constants.ts            # API_URL, COOKIE_NAME
│   ├── query-client.ts         # TanStack Query config
│   ├── store.ts                # Zustand
│   └── utils.ts                # cn() pour classNames
└── schemas/
    └── auth.ts                 # Zod schemas
```

## Design tokens

Couleurs définies dans `src/app/globals.css` via variables CSS OKLCH.
Light mode + dark mode prêts (toggle non implémenté en Slice 0).

Pour modifier le thème : changer uniquement les variables CSS dans `globals.css`.

## i18n

- Langue par défaut : `fr`
- Fichiers : `src/i18n/fr.json`, `src/i18n/en.json`
- Hook : `useTranslation()` dans les Client Components
