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
- **@gorhom/bottom-sheet** (Bottom Sheet global pour `[+]`)
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
├── items/[id].tsx           # Détail item plein écran (Détails/Blocs/Coach)
└── (tabs)/
    ├── _layout.tsx          # Tab navigator (5 onglets)
    ├── today.tsx            # Aujourd'hui (placeholder)
    ├── inbox.tsx            # Boîte de réception (captures + items récents)
    ├── create.tsx           # Capture "Note" (ouvert depuis le Bottom Sheet +)
    ├── timeline.tsx         # Timeline (placeholder)
    └── me.tsx               # Profil + déconnexion
lib/
    ├── api.ts               # Fetch wrapper avec auth
    ├── auth.ts              # Login/signup/logout + SecureStore
    ├── store.ts             # Zustand (auth)
    └── query-client.ts      # TanStack Query config
components/
    ├── BottomSheetCreate.tsx # Bottom Sheet global (+)
    └── BlockEditor.tsx       # TenTap editor + toolbar
i18n/
    ├── config.ts            # Configuration i18next
    ├── fr.json              # Traductions françaises
    └── en.json              # Traductions anglaises
schemas/
    └── auth.ts              # Zod schemas
```

## Navigation

5 onglets : Today, Inbox, [+], Timeline, Me

Le bouton `[+]` ouvre un Bottom Sheet (mi-hauteur) avec plusieurs moyens de capture.
Seule l'option **Note** est active pour l'instant et ouvre l'écran `create`.

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

## Troubleshooting (erreurs déjà rencontrées)

### Erreur Babel : `.plugins is not a valid Plugin property`

**Symptôme**

- Bundle fail au démarrage Metro sur `expo-router/entry.js`.

**Cause**

- `nativewind/babel` mis dans `plugins` au lieu de `presets`.

**Fix**

- Vérifier `apps/mobile/babel.config.js` :

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

### Erreur Expo Router : `process.env.EXPO_ROUTER_APP_ROOT` / `require.context(...)`

**Symptôme**

- `Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT`
- `First argument of require.context should be a string`

**Cause**

- Entrée Router non stabilisée en monorepo / variable absente au runtime Metro.

**Fix appliqué**

- `apps/mobile/index.js` comme entrée (`ExpoRoot` + `require.context("./app")`)
- `apps/mobile/package.json` avec `"main": "index.js"`
- `apps/mobile/metro.config.js` fallback : `EXPO_ROUTER_APP_ROOT=app`
- `apps/mobile/.env` contient aussi `EXPO_ROUTER_APP_ROOT=app`

### Erreur React : `Invalid hook call` / `useSyncExternalStore of null`

**Symptôme**

- Crash sur `useTranslation` ou hooks Zustand/React Query.

**Cause**

- Résolution multiple de React en monorepo.

**Fix**

- Forcer la résolution Metro vers `apps/mobile/node_modules/react` et `react-native` dans `apps/mobile/metro.config.js`.

### Commande de reset recommandée

```bash
cd apps/mobile
npx expo start -c
```
