# Addendum au plan — Détail item mobile en page entière (pas Bottom Sheet)

## Résumé
On remplace le détail item mobile en Bottom Sheet par une route plein écran, alignée avec le choix web “route dédiée”.  
On garde les 3 sections `Détails / Blocs / Coach`, mais dans une page complète.

## Changements de structure mobile
1. Route dédiée mobile.
- Créer [apps/mobile/app/items/[id].tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/items/[id].tsx).
- Cette page devient l’unique écran de détail item (full screen).

2. Navigation depuis Inbox.
- Modifier [apps/mobile/app/(tabs)/inbox.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/(tabs)/inbox.tsx).
- Après `process`, faire `router.push("/items/{id}")`.
- Depuis “items récents”, ouvrir aussi `router.push("/items/{id}")`.

3. Retrait du Bottom Sheet item.
- Retirer `<ItemDetailSheet />` de [apps/mobile/app/_layout.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/_layout.tsx).
- Supprimer `useItemDetailSheet` de [apps/mobile/lib/store.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/lib/store.ts).
- Supprimer [apps/mobile/components/ItemDetailSheet.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/components/ItemDetailSheet.tsx) après migration complète.

4. UI de la page item mobile.
- Header avec bouton retour, titre item, état `saving/saved/error`.
- Corps plein écran avec tabs internes `Détails / Blocs / Coach`.
- Onglet `Blocs` avec `BlockEditor` en hauteur flexible.
- `SafeAreaView` + gestion clavier (dismiss au tap extérieur + `keyboardDismissMode`).

5. Autosave cohérent.
- Même stratégie debounce que web dans [apps/mobile/hooks/use-item.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-item.ts).
- Pas de lock éditeur pendant mutation.
- Pas d’invalidation agressive `["item", id]` après chaque frappe.

## Impact spec et plan
1. Mettre à jour la DoD Slice 2 dans [Spécifications Techniques Phase 1.md](/Users/andrewpougary/DevLocal/Momentarise/project/specs/Spécifications%20Techniques%20Phase%201.md).
- Remplacer “Bottom Sheet (3 onglets)” par “Page détail item plein écran (3 onglets)”.

2. Mettre à jour le plan Slice 2.
- Ajuster [slice_2_inbox_vue_détail_a69cb3fe.plan.md](/Users/andrewpougary/DevLocal/Momentarise/.cursor/plans/slice_2_inbox_vue_détail_a69cb3fe.plan.md) pour refléter la nouvelle structure.

## Tests d’acceptation spécifiques
1. Process capture -> ouverture automatique de `/items/{id}` en full screen.
2. Revenir arrière -> retour Inbox sans état cassé.
3. Édition blocs mobile fluide, sans spam réseau.
4. Aucun affichage du vieux Bottom Sheet item.
5. Cross-plateforme: item modifié mobile relisible sur web et inversement.

## Hypothèses verrouillées
1. Route mobile retenue: `/items/[id]`.
2. Le tab bar n’est pas l’UI principale pendant l’édition item (focus full screen).
3. On garde BlockEditor mobile actuel, on change uniquement la structure/navigation et la stratégie de sauvegarde.
