# Momentarise Mobile

Frontend Expo pour le Life OS Momentarise.

## Stack

- **Expo** + **Expo Router** (file-based routing)
- **Expo Go** (Phase 1)
- **NativeWind** v4 + **Tailwind CSS** v3 (styling)
- **TanStack Query** (server state)
- **Zustand** (client state)
- **Zod** (validation)
- **expo-secure-store** (stockage token)
- **@gorhom/bottom-sheet** (Bottom Sheet global)
- **i18next** + **react-i18next** (i18n)

## Setup

```bash
# Prérequis : API FastAPI lancée
npm install
npx expo start
```

Scanner le QR code avec l'app Expo Go sur votre téléphone.

## Connexion API

Le mobile appelle FastAPI directement (pas de BFF).

Configurer `EXPO_PUBLIC_API_URL` dans `.env` :

```env
# IP locale (Mac et iPhone sur le même WiFi)
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000

# OU tunnel ngrok
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
```

## Architecture

```
app/
├── _layout.tsx              # Root layout (providers, auth guard, Bottom Sheet)
├── login.tsx                # Page de connexion
├── signup.tsx               # Page d'inscription
└── (tabs)/
    ├── _layout.tsx          # Tab navigator (5 onglets)
    ├── today.tsx            # Aujourd'hui (placeholder)
    ├── inbox.tsx            # Boîte de réception (placeholder)
    ├── create.tsx           # Tab factice (intercepté → Bottom Sheet)
    ├── timeline.tsx         # Timeline (placeholder)
    └── me.tsx               # Profil + déconnexion
components/
    └── BottomSheetCreate.tsx # Bottom Sheet global
lib/
    ├── api.ts               # Fetch wrapper avec auth
    ├── auth.ts              # Login/signup/logout + SecureStore
    ├── store.ts             # Zustand (auth + create sheet)
    └── query-client.ts      # TanStack Query config
i18n/
    ├── config.ts            # Configuration i18next
    ├── fr.json              # Traductions françaises
    └── en.json              # Traductions anglaises
schemas/
    └── auth.ts              # Zod schemas
```

## Navigation

5 onglets : Today, Inbox, [+], Timeline, Me

Le bouton [+] n'entraîne aucune navigation : il ouvre le Bottom Sheet global.

## Attention - Points importants

### Tailwind CSS v3

NativeWind v4 ne supporte que Tailwind CSS v3 (3.4.x). Le web utilise Tailwind CSS v4.
Ne pas essayer de mettre à jour vers Tailwind v4 dans ce dossier.

### npm --legacy-peer-deps

Si `npm install` échoue avec ERESOLVE, utiliser `npm install --legacy-peer-deps`.

### Variables d'environnement

Expo ne lit que les variables préfixées par `EXPO_PUBLIC_`.

### CORS

Le mobile appelle FastAPI directement. Si les requêtes sont bloquées, ajouter l'IP locale dans `CORS_ORIGINS` du fichier `apps/api/.env` :

```env
CORS_ORIGINS=http://localhost:3000,http://192.168.1.42:8000
```
