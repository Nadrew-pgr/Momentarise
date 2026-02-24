# Plan de correction global — Inbox/Item Detail web+mobile (jusqu’à stabilisation pré-étape 5)

## Résumé
Objectif: corriger les bugs bloquants observés (menu `/` BlockNote, détail item web non plein écran, spam PATCH/GET, UX clavier mobile, boucle Inbox incomplète) avec une implémentation cohérente web+mobile.  
Décisions verrouillées: détail web en **route dédiée plein écran**; fermeture de boucle Inbox avec **items récents**; priorité à une **expérience cohérente web/mobile**.

## Plan d’exécution (ordre strict)

1. Stabiliser les sauvegardes éditeur (P0).
   - Web: remplacer la sauvegarde “à chaque frappe” par un autosave débouncé (500–800 ms) dans [use-item.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/hooks/use-item.ts) et [inbox/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/page.tsx).
   - Mobile: même stratégie dans [use-item.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-item.ts) et [ItemDetailSheet.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/components/ItemDetailSheet.tsx).
   - Supprimer le verrouillage `editable={!isPending}` pendant la frappe; conserver un indicateur visuel “enregistrement…”.
   - Changer la mutation pour ne plus invalider `["item", id]` à chaque PATCH; faire `setQueryData` avec la réponse serveur et invalider seulement sur navigation/refresh explicite.
   - Critère: fin du ping-pong PATCH/GET massif dans les logs.

2. Corriger la structure web du détail item (P0).
   - Transformer [inbox/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/page.tsx) en page “liste Inbox + items récents”.
   - Créer une route dédiée plein écran: [apps/web/src/app/(dashboard)/inbox/items/[id]/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/(dashboard)/inbox/items/[id]/page.tsx).
   - Le détail n’est plus dans une `Card`; éditeur en zone pleine hauteur/largeur du contenu dashboard.
   - Sur process réussi: navigation automatique vers `/inbox/items/{id}`.

3. Corriger le bug menu `/` BlockNote (P0).
   - Stabiliser l’instance éditeur: mount uniquement quand `itemId` change, jamais sur chaque mutation.
   - Déplacer les imports CSS BlockNote vers un point global (pas dans le composant) depuis [block-editor.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/components/block-editor.tsx).
   - Poser un “editor shell” pleine hauteur sans clipping (`overflow`), et z-index explicite pour le menu flottant.
   - Ajouter un scénario de repro automatisable: ouvrir item, taper `/`, sélectionner 3 commandes, vérifier menu + insertion sans glitch.

4. Fermer la boucle “capture -> process -> retrouver item” (P0).
   - Backend: ajouter `GET /api/v1/items` (liste triée `updated_at desc`, filtrée `workspace_id`, soft-delete exclu) dans [items.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/api/v1/items.py).
   - Web BFF: ajouter `/api/items` (GET liste) dans [apps/web/src/app/api/items/route.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/api/items/route.ts).
   - Mobile: hook liste items dans [apps/mobile/hooks/use-item.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/hooks/use-item.ts) (ou fichier dédié `use-items.ts`).
   - UI web+mobile Inbox: afficher section “Items récents” cliquable.
   - Critère: un item processé est rouvrable plus tard, pas seulement juste après process.

5. Corriger UX clavier mobile (P0).
   - Login/signup: refactor [login.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/login.tsx) et [signup.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/signup.tsx) avec `SafeAreaView`, `keyboardVerticalOffset`, structure non centrée cassante.
   - Inbox mobile: ajouter `SafeAreaView` dans [inbox.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/(tabs)/inbox.tsx), dismissal global (`Keyboard.dismiss`), `keyboardDismissMode="on-drag"`, `keyboardShouldPersistTaps="handled"`.
   - Critère: plus de “page qui sort de l’écran”, clavier refermable sans action secondaire.

6. Uniformiser réellement l’expérience éditeur web/mobile (P1 prioritaire juste après P0).
   - Conserver BlockNote web + TenTap mobile, mais figer un contrat de contenu commun dans `@momentarise/shared` via [packages/shared/src/item.ts](/Users/andrewpougary/DevLocal/Momentarise/packages/shared/src/item.ts).
   - Restreindre les blocs autorisés au sous-ensemble commun (paragraphes, headings, listes, quote, code simple) pour éviter divergence de rendu.
   - Renforcer validation backend dans [apps/api/src/schemas/item.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/schemas/item.py) (utiliser réellement le modèle récursif, plus `list[dict[str, Any]]` permissif).
   - Ajouter tests croisés: éditer web puis ouvrir mobile; éditer mobile puis ouvrir web; aucun crash, contenu cohérent.

7. Nettoyage DB/API/doc (P1).
   - Migration ciblée pour `inbox_captures.source` default DB explicite `"manual"` dans [4daa52d54088_add_inbox_captures_and_item_blocks.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/alembic/versions/4daa52d54088_add_inbox_captures_and_item_blocks.py).
   - Mettre à jour la spec Slice 2 avec le nouveau endpoint liste items + route web dédiée item.
   - Corriger le plan Slice 2: références de lignes obsolètes et checklist QA mobile (`tsc --noEmit` au lieu d’un lint inexistant).

## Changements API / interfaces / types (public)
1. `GET /api/v1/items` (nouveau): retourne une liste d’items résumés pour Inbox.
2. `GET /api/items` côté web BFF (nouveau proxy).
3. Schéma partagé item durci dans [item.ts](/Users/andrewpougary/DevLocal/Momentarise/packages/shared/src/item.ts) pour valider réellement la structure des blocs.
4. `UpdateItemRequest` conserve le champ `blocks`, mais avec validation stricte + format commun documenté.

## Tests et scénarios d’acceptation
1. Web détail plein écran: ouvrir `/inbox/items/{id}`, l’éditeur occupe la zone principale complète, sans carte.
2. Slash menu: `/` ouvre menu correct, sélection d’items fonctionne, pas de comportement erratique.
3. Réseau: sur 20 frappes continues, nombre de PATCH borné par debounce; pas de GET systématique après chaque PATCH.
4. Mobile login/signup: clavier n’éjecte plus l’UI.
5. Mobile inbox: tap hors champ ferme le clavier; scroll ferme le clavier.
6. Boucle Inbox: process capture -> item visible dans “items récents” -> réouverture possible web et mobile.
7. Cross-platform: contenu édité web lisible/éditable mobile, et inversement.
8. Régression: `npm run -w apps/web lint`, `cd apps/mobile && npx tsc --noEmit`, compilation Python ciblée API schemas/routes.

## Hypothèses et defaults retenus
1. On ne change pas de stack éditeur (BlockNote web, TenTap mobile).
2. On implémente d’abord P0 (stabilité/UX), puis P1 (contrat strict et docs).
3. On reste dans le scope Slice 2/4.5: pas d’IA, pas d’attachments, pas de fonctionnalités hors spec Phase 1.
