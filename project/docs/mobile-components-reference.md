# Référence composants React Native / Expo (mobile)

Liste de composants recommandés pour l’app mobile Momentarise, avec liens, statut et priorité d’usage.


| #   | Composant          | GitHub                                                                                                | npm / doc                                                                | Statut    | Priorité / usage prévu                                                         |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| 1   | **Bottom sheet**   | [gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet)               | `@gorhom/bottom-sheet`                                                   | ✅ Utilisé | `BottomSheetCreate`, tab [+]                                                   |
| 1   | **Gifted Chat**    | [FaridSafi/react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat)           | `react-native-gifted-chat`                                               | —         | **Éventuellement** — UI chat avec Sync et sous-agents                          |
| 3   | **Charts**         | [FormidableLabs/victory-native](https://github.com/FormidableLabs/victory-native)                     | `victory-native`                                                         | —         | Si besoin (graphiques)                                                         |
| 4   | **Toast**          | [calintamas/react-native-toast-message](https://github.com/calintamas/react-native-toast-message)     | `react-native-toast-message`                                             | —         | **Important** — à intégrer                                                     |
| 5   | **Skeleton**       | [danilowoz/react-content-loader](https://github.com/danilowoz/react-content-loader)                   | `react-content-loader` / `react-native-skeleton-content`                 | —         | **On va l’utiliser** — loading states                                          |
| 6   | **Pager view**     | [callstack/react-native-pager-view](https://github.com/callstack/react-native-pager-view)             | `react-native-pager-view`                                                | —         | Si besoin (swipe pages, onboarding par exemple)                                                        |
| 7   | **Blur view**      | Expo Blur                                                                                             | [Expo Blur](https://docs.expo.dev/versions/latest/sdk/blur-view/)        | —         | **Plus tard** — liquid glass (évolution UI)                                    |
| 8   | **Calendar**       | [wix/react-native-calendars](https://github.com/wix/react-native-calendars)                           | `react-native-calendars`                                                 | ✅ Utilisé | Timeline                                                                       |
| 9  | **FlashList**      | Shopify FlashList                                                                                     | [FlashList](https://shopify.github.io/flash-list/) `@shopify/flash-list` | —         | **Plus tard** — beaucoup d’events (calendrier?), beaucoup d’items, marketplace |


## Déjà en place

- **Bottom sheet** : `@gorhom/bottom-sheet` — voir `components/BottomSheetCreate.tsx`, state via `lib/store.ts` → `useCreateSheet`.
- **Calendar** : `react-native-calendars` — voir `app/(tabs)/timeline.tsx`, adapter dans `lib/adapters/calendarAdapter.ts`.

## À intégrer en priorité

- **Toast** — feedback utilisateur (succès, erreur, info). Package : `react-native-toast-message`.
- **Skeleton** — états de chargement (listes, cartes). Options : `react-content-loader` ou `react-native-skeleton-content` (vérifier compatibilité Expo / RN).

## Plus tard / selon besoin

- **Gifted Chat** — si écran(s) chat avec Sync / sous-agents.
- **Blur view** (`expo-blur`) — quand l’app évolue vers un style type liquid glass.
- **FlashList** — quand les listes grossissent (timeline avec beaucoup d’events, marketplace, etc.) ; à évaluer pour usage dans un calendrier.

## Installation (rappel)

Pour tout package natif / Expo :

```bash
cd apps/mobile
npx expo install <package>
```

Exemples : `npx expo install expo-blur react-native-toast-message @shopify/flash-list`.

Pour les packages purement JS, `npm install` (et `--legacy-peer-deps` si nécessaire).