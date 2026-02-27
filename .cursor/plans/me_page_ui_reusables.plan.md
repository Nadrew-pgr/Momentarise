# Page Me — Reusables, transparence « à venir »

Thème utilisateur (light/dark/system + palettes) : voir règle **Theme ready** dans `.cursor/rules/project.mdc` et idée dans `.learnings/IDEAS.md`. Ne pas forcer de fond noir ; utiliser les tokens pour rester theme ready.

---

## 1. React Native Reusables

- Ajouter via CLI : **Card**, **Avatar**, **Button** (et si pertinent Text, Separator). Vérifier compatibilité avec Tailwind v3 / NativeWind (voir [apps/mobile/tailwind.config.js](apps/mobile/tailwind.config.js)).
- Importer depuis `@/components/ui/...` dans [apps/mobile/app/(tabs)/me.tsx](apps/mobile/app/(tabs)/me.tsx).

## 2. Structure de la page Me

- **Layout** : SafeAreaView (edges top) + ScrollView, `p-4`, **bg-background** (tokens uniquement).
- **Titre** : « Me », `text-foreground`.
- **Carte profil** : Card + Avatar (initiale ou fallback) + nom dérivé de l’email + email en `text-muted-foreground`. Données via **useMe** (GET `/api/v1/auth/me`).
- **Section WORKSPACE** : label uppercase `text-muted-foreground`, lignes Card avec icône (Lucide) + libellé + ChevronRight. Lignes à venir : **opacity-60**.
- **Section SYSTEM** : Paramètres, Aide (**opacity-60**), Déconnexion (**Button** variant destructive, opacité normale).
- **Carte « Activité »** en bas : **opacity-60**, onPress placeholder.

Règle : cliquable et fonctionnel = opacité 100 % ; à venir = **opacity-60**.

## 3. Données et navigation

- **Hook useMe** : [apps/mobile/hooks/use-me.ts](apps/mobile/hooks/use-me.ts) — TanStack Query, `apiFetch("/api/v1/auth/me")`, type `MeResponse` depuis `@momentarise/shared`.
- Navigation : Inbox/Timeline/Sync → `router.replace("/(tabs)/...")` ; Paramètres/Aide → `router.push` vers écrans placeholders. i18n : clés sous `pages.me` (fr + en).

## 4. Ordre d’implémentation

1. Ajouter Reusables (Card, Avatar, Button) via CLI.
2. Créer useMe et brancher la carte profil.
3. Refondre me.tsx (SafeAreaView, ScrollView, sections, opacity-60 sur à venir).
4. i18n. Optionnel : écrans placeholders settings/help.
