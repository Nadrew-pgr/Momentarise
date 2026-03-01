---
name: Mobile FAB centre écran remplace sheet
overview: "Le FAB mobile remplace entièrement le BottomSheetCreate : overlay plein écran avec fond flouté, cercle d’actions centré au milieu de l’écran, même logique métier déplacée dans le FAB ou des modals (lien, voix)."
todos: []
isProject: false
---

# FAB mobile — Remplace le bottom sheet (cercle centré, fond flouté)

## Principe

- **Plus de BottomSheetCreate** pour le flux « créer ». Un seul composant : **CaptureFab** en overlay plein écran.
- **Centre de l’écran** = centre du cercle d’actions. Les 7 boutons (Note, Voice, Photo, File, Link, Event, Sync) sont disposés sur un cercle dont le centre est le milieu de l’écran.
- **Arrière-plan flouté** : fond plein écran avec blur (ex. `expo-blur` BlurView), pas seulement assombri.
- Au tap sur le + (position à définir : ex. bas au centre ou en bas à droite), l’overlay s’affiche : fond flouté + cercle centré avec les actions. Le + peut devenir X au centre pour fermer, ou rester à son emplacement et servir de bouton fermer.

---

## Layout

- **Overlay** : `StyleSheet.absoluteFill` (ou équivalent) en `position: absolute`, couvre tout l’écran, z-index au-dessus du contenu.
- **Fond** : `BlurView` (expo-blur) en plein écran avec `intensity` (ex. 50–80) et éventuellement `tint="dark"` pour assombrir un peu. Au tap sur ce fond → fermeture du FAB.
- **Cercle** : centre = `(width/2, height/2)` via `useWindowDimensions()`. Rayon du cercle ~100–120 (dp). Les 7 actions sont positionnées en `(centerX + cos(angle) * radius, centerY + sin(angle) * radius)`. Angle : même formule que le web, ex. `-90 + (index * 360) / 7` pour partir du haut et tourner dans le sens horaire.
- **Bouton central** : au centre de l’écran, icône Plus quand fermé (mais en fait le + est ailleurs pour ouvrir) ou X pour fermer quand l’overlay est ouvert. Logique possible : le bouton flottant « + » en bas ouvre l’overlay ; une fois ouvert, au centre on affiche un X pour fermer, et les 7 actions autour. Ou : le + est au centre et se transforme en X, les actions apparaissent autour (stagger).

---

## Remplacement complet de la sheet

- **Supprimer** le composant `BottomSheetCreate` du layout et son usage (plus de `useCreateSheet` pour une sheet).
- **Logique métier** : tout ce qui est aujourd’hui dans [BottomSheetCreate.tsx](apps/mobile/components/BottomSheetCreate.tsx) (createItem, uploadCapture, pickDocument, launchCamera, enregistrement voix, lien, event, sync) doit être soit :
  - déplacé dans un **hook** `useCreateActions()` et appelé depuis CaptureFab, soit
  - gardé dans un module partagé et importé par CaptureFab.
- **Link** : au tap sur Link dans le FAB → ouvrir une **modal** (Dialog / Modal) avec champ URL + validation + submit. Pas de sheet.
- **Voice** : au tap sur Voice → soit lancer l’enregistrement et afficher un **pill flottant** « Enregistrement… Stop » au-dessus du FAB (ou en bas d’écran), soit ouvrir une petite **modal** avec bouton Stop. La logique d’enregistrement (expo-audio / expo-av) reste la même, seule l’UI change (pill ou modal au lieu de la sheet).

---

## Dépendance blur

- Ajouter **expo-blur** : `npx expo install expo-blur`.
- Utiliser `BlurView` en plein écran comme fond de l’overlay. Sur Android, suivre la doc Expo (éventuellement `experimentalBlurMethod` / `BlurTargetView` selon la version).

---

## Fichiers impactés


| Fichier                                                                                      | Action                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [apps/mobile/app/_layout.tsx](apps/mobile/app/_layout.tsx)                                   | Remplacer `<BottomSheetCreate />` par `<CaptureFab />`.                                                                                                                                                            |
| [apps/mobile/components/BottomSheetCreate.tsx](apps/mobile/components/BottomSheetCreate.tsx) | Supprimer ou conserver uniquement comme conteneur de logique exportée (hooks / helpers) si tu veux éviter de tout mettre dans CaptureFab. Sinon déplacer la logique vers un hook `useCreateActions`.               |
| [apps/mobile/components/CaptureFab.tsx](apps/mobile/components/CaptureFab.tsx)               | **Nouveau** : overlay plein écran, BlurView en fond, cercle centré (center = centre écran), 7 boutons + bouton central (X). Handlers pour chaque action ; Link → modal URL ; Voice → pill ou modal enregistrement. |
| [apps/mobile/app/(tabs)/_layout.tsx](apps/mobile/app/(tabs)/_layout.tsx)                     | Supprimer l’onglet « create ». Garder 4 onglets.                                                                                                                                                                   |
| [apps/mobile/app/(tabs)/create.tsx](apps/mobile/app/(tabs)/create.tsx)                       | Supprimer ou rediriger vers today.                                                                                                                                                                                 |
| [apps/mobile/components/CreateTabIcon.tsx](apps/mobile/components/CreateTabIcon.tsx)         | Plus utilisé ; supprimer ou laisser inutilisé.                                                                                                                                                                     |
| [apps/mobile/package.json](apps/mobile/package.json)                                         | Ajouter expo-blur.                                                                                                                                                                                                 |


Optionnel : `hooks/useCreateActions.ts` qui contient toute la logique (createItem, uploadCapture, pickDocument, launchCamera, startVoiceCapture, etc.) et qui est utilisée par CaptureFab. Les modals (lien, éventuellement voix) peuvent être des composants locaux dans CaptureFab ou des écrans modaux.

---

## Récap

- **Un seul entry point** : le bouton + (flottant) ouvre l’overlay.
- **Overlay** : fond **flouté** (BlurView), **cercle centré** au milieu de l’écran avec les 7 actions, bouton central (X) pour fermer.
- **Bottom sheet supprimé** ; Link et Voice gérés par modal / pill dans le même flux FAB.

