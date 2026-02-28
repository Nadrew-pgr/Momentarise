# Slice 3.7C — Inbox Capture Reliability + Detail-First CTA + Rich Source Preview (Web & Mobile)

## Résumé
Objectif: corriger les régressions actuelles et finaliser une UX Inbox cohérente.
Décisions verrouillées avec toi:
1. CTA depuis la liste Inbox: ouvre d’abord le détail capture, action présélectionnée.
2. Captures `applied`: restent visibles dans la vue active (badge visuel), pas archivées par défaut.
3. Prévisualisation source: riche in-app (audio, image, document, carte lien) web + mobile.
4. Filtres Inbox: par type uniquement, menu `...` pour tri et affichage archivés.
5. Bouton `+` mobile: même fonction qu’actuel, avec animation style web.

## Constats techniques (audit)
1. Web FAB existe mais UX fragile:
   - `window.prompt` pour lien (flash/annulation perçue comme “ne marche pas”),
   - interactions peu robustes (petites zones cliquables, feedback insuffisant).
2. Inbox web/mobile applique directement certains CTA depuis la liste:
   - contredit le comportement voulu “open detail first”.
3. Détail capture affiche seulement metadata source:
   - pas de lecture audio/photo/doc/link preview.
4. Pipeline transcription peut tomber en fallback heuristique:
   - résumé “vide” ou peu utile,
   - pas de skeleton/polling clair côté détail.
5. Archivage actuel:
   - `apply/process` met `deleted_at`, donc capture masquée ensuite.

## Changements API / types publics
1. Ajouter `GET /api/v1/inbox/{capture_id}/assets/{asset_id}/content`.
   - Retour binaire (`inline`) avec `Content-Type`, `Content-Length`, `ETag`.
   - Auth workspace obligatoire.
2. Étendre `CaptureAssetOut` (shared + API) avec:
   - `preview_kind: audio|image|pdf|text|binary`,
   - `file_name`,
   - `download_path` (web BFF path) ou `content_path` standardisé.
3. Ajuster sémantique archive:
   - `applied` ne force plus `deleted_at`.
   - `archived_reason` devient `deleted` seulement (ou `applied` conservé mais non archivant).
4. `GET /api/v1/inbox`:
   - `include_archived` reste, utilisé pour `deleted` uniquement.
5. BFF web:
   - proxy binaire pass-through pour endpoint `assets/.../content` (ne pas convertir en `text()`).

## Implémentation détaillée

## Phase 1 — Hotfix capture web non fonctionnelle
1. Remplacer `window.prompt` lien par mini-sheet/modal contrôlée (URL input + validation).
2. Rendre les actions FAB robustes:
   - zone cliquable entière (icône + label),
   - feedback loading/error par action,
   - instrumentation click/upload start/fail.
3. Vérifier et corriger les triggers file/photo/voice:
   - déclenchement `input.click()` fiable,
   - reset input après succès/erreur.
4. Ajouter logs frontend dev pour flux capture (`action_clicked`, `picker_opened`, `upload_started`, `upload_failed`).

## Phase 2 — Nouveau modèle de filtres Inbox
1. Retirer filtres `Action/Read/Waiting`.
2. Ajouter filtres type uniquement:
   - `All`, `Voice`, `Photo`, `File`, `Link`.
3. Ajouter menu `...`:
   - tri `Newest`, `Oldest`, `A→Z`, `Z→A`,
   - toggle `Show deleted`.
4. Corriger style badges/chips:
   - alignement vertical texte,
   - hauteur/line-height/tokens cohérents web+mobile.

## Phase 3 — CTA “Detail First”
1. Depuis la liste Inbox, cliquer CTA:
   - navigation vers `/inbox/captures/{id}` avec `action_key` en query (web+mobile).
2. Le détail sélectionne automatiquement l’action correspondante.
3. `Apply` n’exécute la mutation que depuis le détail.
4. Cas `Review` idem: passe par détail (title/description), pas d’apply silencieux depuis liste.

## Phase 4 — Détail capture utile + skeleton
1. Résumé IA:
   - skeleton tant que capture `queued|processing` ou summary absent,
   - polling auto du détail (interval court) jusqu’à `ready|failed`.
2. Voice:
   - lecteur audio intégré sur asset source,
   - transcription affichée dès artifact `transcript`.
3. Photo:
   - image preview pleine largeur + zoom simple.
4. File:
   - preview PDF inline si possible, fallback viewer texte pour `md/txt`,
   - sinon carte fichier + bouton ouvrir/télécharger.
5. Link:
   - carte preview (domain, title, description, favicon/screenshot fallback),
   - bouton “Ouvrir le site”.
6. Garder section `Suggested actions` alignée à l’Inbox card.

## Phase 5 — Archive policy alignée à ton besoin
1. `apply/process`:
   - garder `status=applied` mais ne plus renseigner `deleted_at`.
2. `list_inbox active`:
   - inclure `applied` (badge visuel `Applied`).
3. `Archived`:
   - réservé aux captures supprimées (`deleted_at != null`).
4. `restore`:
   - inchangé pour `deleted`.

## Phase 6 — Mobile bouton `+` animé comme web
1. Garder le même comportement (ouvre `BottomSheetCreate`).
2. Ajouter animation:
   - rotation `+` ↔ `x`,
   - scale/pulse selon `isOpen`,
   - micro-glow/fill dynamique.
3. Synchroniser état animation avec `useCreateSheet().isOpen`.

## Phase 7 — Transcription fiabilisée et observable
1. Afficher état provider dans détail (`transcribing`, `fallback used`, `failed`).
2. Si fallback heuristique utilisé:
   - badge explicite “Transcription limitée”,
   - CTA `Reprocess`.
3. Ajouter logs corrélés:
   - provider/model/error_code/request_id/capture_id/job_id.
4. Préparer point d’extension futur “limits by plan” sans implémenter quota maintenant.

## Tests et scénarios d’acceptation
1. Web: chaque action FAB déclenche le flux attendu (`note`, `voice`, `photo`, `file`, `link`).
2. Mobile: bouton `+` animé, fonctions inchangées.
3. Inbox filters:
   - type filters fonctionnels,
   - menu `...` tri + toggle deleted fonctionnels.
4. CTA liste:
   - ne fait plus d’apply direct,
   - ouvre toujours détail capture avec action présélectionnée.
5. Détail voice:
   - `Summarize` mène au détail,
   - skeleton puis résumé/transcript visible.
6. Preview source:
   - audio lisible, image visible, document preview/fallback, link card visible.
7. Archive policy:
   - capture `applied` visible en actif avec badge,
   - `deleted` uniquement via mode archived/show deleted.
8. API binary asset:
   - auth/workspace isolation validées,
   - headers content-type/content-length corrects.
9. Régression:
   - `Note` ne crée toujours pas `InboxCapture`.
10. Reprocess:
   - capture `failed` repasse `processing` puis `ready|failed` avec trace.

## Assumptions / defaults
1. On conserve soft-delete pour suppression utilisateur, pas pour `applied`.
2. On garde `include_archived` pour compat API, mais son usage UX cible = deleted only.
3. On implémente preview document “best effort”:
   - PDF inline prioritaire,
   - autres formats fallback carte + ouverture externe.
4. Pas de quota transcription dans cette slice (prévu plus tard comme demandé).
5. On ne change pas le scope Sync chat ici, seulement l’intégration capture->détail->apply.

