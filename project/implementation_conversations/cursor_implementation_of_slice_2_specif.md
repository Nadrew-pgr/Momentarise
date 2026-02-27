# Implementation of Slice 2 specifications
_Exported on 27/02/2026 at 22:11:55 UTC+1 from Cursor (2.5.26)_

---

**User**

Tu es en mode Spec-Driven Development.

Lis les fichiers suivants dans cet ordre :
1. @.cursor/rules/project.mdc (conventions globales)
2. @.cursor/rules/backend.mdc (conventions backend)
3. @.cursor/rules/web.mdc (conventions web)
4. @.cursor/rules/mobile.mdc (conventions mobile)
5. @project/specs/Spécifications Techniques Phase 1.md (la spec, source de vérité)

Implémente la Slice 2 en suivant EXACTEMENT le guide d'implémentation
de la spec, étape par étape.

Avant de commencer :
- Vérifie que Docker/Postgres tourne
- Vérifie que les migrations sont à jour
- Lis le code existant des fichiers que tu vas modifier

Après chaque étape :
- Coche les items DoD `- [ ]` → `- [x]` dans la spec
- Vérifie les linter errors
- N'implémente RIEN qui est dans "Out of scope"

Utilise `npm install --legacy-peer-deps` si npm échoue dans apps/mobile.
Utilise `npx expo install <package>` pour les packages Expo/React Native.
Ne tue JAMAIS tous les ports, uniquement le port concerné.

---

**Cursor**

En mode plan : nous lisons les fichiers demandés et élaborons un plan d'implémentation pour la Slice 2, sans modifier le code.


Exploration du code existant pour établir un plan précis : modèles backend, pages inbox, BFF et structure mobile.


Vérifiant la structure des routes API existantes et l'usage de `events/[id]` pour le proxy dynamique :


Rédaction du plan d'implémentation pour la Slice 2.


---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

Implémentation de la Slice 2 selon le plan. Vérification des todos et démarrage des prérequis et de l'étape 1.


Vérifiant les prérequis (Docker et migrations), puis implémentation de l'étape 1.


Docker est à jour. Vérifiant les migrations et créant le modèle InboxCapture et l'extension Item.


Création du modèle InboxCapture et ajout de la colonne `blocks` au modèle Item.


Ajout des relations inverses sur `User` et `Workspace` :


Ajout de la colonne `blocks` au modèle Item :


Génération et application de la migration :


Vérifiant la migration générée : elle supprime des index existants. On la corrige pour n'ajouter que le nécessaire.


Modifiant la migration pour ne pas supprimer les index existants et en ajoutant un server_default pour `items.blocks`.


Cochant la DoD dans la spec et passant à l'étape 2.


Implémentation de l'étape 2 : schémas et routes backend.


Ajout des contrats partagés dans `packages/shared` :


Création des routes BFF et des hooks web.


Installation de BlockNote et création du composant et de la page inbox.


Vérifiant les exports de BlockNote pour React et Mantine :


Création du composant BlockEditor et de la page inbox.


Utilisant un type plus permissif pour les blocs (API = list de dicts) et ajoutant une clé pour réinitialiser l'éditeur.


Création de la page inbox complète avec mise en page en deux colonnes.


Écriture de la page inbox complète.


Passant à l'étape 5 — Mobile : consultation du pattern API et des hooks existants.


Ajout du store ItemDetailSheet et création des hooks et composants mobile.


Création d'ItemDetailSheet avec 3 onglets (Détails, Blocs, Coach).


Ajout des clés i18n mobile et mise à jour du layout et de l'onglet inbox.


Vérifiant que l'API démarre et que le build web passe :


Corrigeant le schéma Zod dans le package shared (z.record en Zod 4) :


Résumé de ce qui a été fait pour la **Slice 2 (Inbox & Vue Détail)** :

## Backend (API)
- **Modèle** `InboxCapture` dans `apps/api/src/models/inbox_capture.py` (workspace_id, user_id, raw_content, source).
- **Item** : colonne `blocks` JSONB (MutableList) dans `apps/api/src/models/item.py`.
- **Migration** : `add_inbox_captures_and_item_blocks` (table `inbox_captures` + colonne `items.blocks` avec `server_default='[]'::jsonb`).
- **Schémas** : `schemas/inbox.py` (InboxCaptureOut, CreateCaptureRequest, ProcessCaptureResponse), `schemas/item.py` (ProseMirrorNode, ItemOut, UpdateItemRequest).
- **Routes** : `api/v1/inbox.py` (GET, POST, POST `/{id}/process`), `api/v1/items.py` (GET, PATCH) ; enregistrement dans `main.py`.

## Package shared
- **packages/shared/src/inbox.ts** : schémas Zod + types pour inbox.
- **packages/shared/src/item.ts** : schémas Zod + types pour item (avec `z.record(z.string(), z.unknown())` pour Zod 4).
- Exports ajoutés dans `index.ts`.

## Web (apps/web)
- **BFF** : `api/inbox/route.ts`, `api/inbox/[id]/process/route.ts`, `api/items/[id]/route.ts`.
- **Hooks** : `use-inbox.ts` (useInbox, useCreateCapture, useProcessCapture), `use-item.ts` (useItem, useUpdateItem avec optimistic update).
- **BlockEditor** : `components/block-editor.tsx` (BlockNote avec value/onChange et `editorKey`).
- **Page Inbox** : `(dashboard)/inbox/page.tsx` en 2 colonnes (liste captures + détail item avec BlockNote), i18n ajoutées.

## Mobile (apps/mobile)
- **Store** : `useItemDetailSheet` (itemId, open, close) dans `lib/store.ts`.
- **Hooks** : `hooks/use-inbox.ts`, `hooks/use-item.ts` (appels directs à l’API avec `apiFetch`).
- **BlockEditor** : `components/BlockEditor.tsx` (TenTap avec initialContent doc + onChange via getJSON).
- **ItemDetailSheet** : `components/ItemDetailSheet.tsx` (Bottom Sheet avec 3 onglets : Détails, Blocs, Coach placeholder).
- **Layout** : `ItemDetailSheet` rendu dans `app/_layout.tsx`.
- **Onglet Inbox** : liste des captures, ajout, flow Process (titre → création d’item → ouverture du détail), i18n.

## Spec
- Tous les points DoD de la Slice 2 sont cochés dans `project/specs/Spécifications Techniques Phase 1.md`.

Build web OK. Pour vérifier en local : lancer l’API (`uv run uvicorn ...`), le web (`npm run dev`), et éventuellement Expo pour le mobile.

---

**User**

là l'app est censé pouvoir faire quoi ?

---

**Cursor**

À ce stade (après **Slice 0, 1 et 2**), l’app est censée pouvoir faire ceci :

---

## Slice 0 — Fondations
- **Auth** : inscription, connexion, déconnexion (web avec cookie, mobile avec token dans SecureStore).
- **Web** : layout « cockpit » (sidebar + contenu), routes protégées `/today`, `/inbox`, `/timeline`, `/me`.
- **Mobile** : 5 onglets (Today, Inbox, [+], Timeline, Me), le bouton [+] ouvre un Bottom Sheet global (pour l’instant vide).

---

## Slice 1 — Today & Timeline
- **Today** : digest du jour (priorités, prochain event, prochaine action), même vide.
- **Timeline** : liste des events du jour (date en `YYYY-MM-DD`), boutons Démarrer / Arrêter le suivi de temps.
- **Tracking** : démarrer / arrêter un event met à jour le temps accumulé (`actual_time_acc`).

---

## Slice 2 — Inbox & détail item
- **Inbox**  
  - Lister les captures brutes (sas de décompression).  
  - Ajouter une capture (texte brut).  
  - « Transformer » une capture en item : saisir un titre → création d’un **Item** et soft-delete de la capture.

- **Détail item**  
  - **Web** : colonne de droite = item sélectionné (titre + éditeur BlockNote pour le contenu en blocs). Sauvegarde des blocs via PATCH (optimistic UI).  
  - **Mobile** : après « Process », ouverture d’un Bottom Sheet avec 3 onglets : **Détails** (titre, id), **Blocs** (éditeur TenTap), **Coach** (placeholder i18n).

- **Blocs** : contenu riche au format ProseMirror/BlockNote (blocs), stocké en JSONB côté API, éditable web (BlockNote) et mobile (TenTap).

---

En résumé : l’app permet de se connecter, voir Today/Timeline, gérer du temps sur les events, **capturer du brut dans l’Inbox, le transformer en item structuré et éditer le contenu (blocs) de l’item** sur web et mobile. Pas d’IA, pièces jointes ni templates (hors scope Slice 2).

---

**User**

mais en vrai transformer ça fait quoi ? ça supprime c'est tout non ?

---

**Cursor**

Non, ce n’est pas que supprimer. Concrètement, « Transformer » fait **deux choses** :

1. **Créer un Item** avec le titre que tu saisis, et `blocks = []` (contenu vide).
2. **Soft-delete la capture** : on met `deleted_at` sur la capture, donc elle disparaît de la liste Inbox (elle n’est plus affichée, mais pas effacée en base).

Donc : la capture « devient » un item (un nouvel objet en base), et en même temps elle est retirée de l’Inbox.

Ce qu’on ne fait **pas** aujourd’hui (c’est comme ça dans la spec Phase 1) : on **ne copie pas** le `raw_content` de la capture dans les blocs du nouvel Item. Du coup, en pratique, tu crées un item « vide » (juste un titre), et le texte brut de la capture n’est plus visible nulle part dans l’UI (il reste en base sur la capture soft-deletée).

En résumé :
- **Techniquement** : créer un Item + soft-delete la capture (pas une simple suppression).
- **Pour toi** : oui, ça peut donner l’impression que « ça supprime et c’est tout », parce que le contenu de la capture n’est pas reporté dans l’item.

Si tu veux que « transformer » ait l’air vraiment utile tout de suite, la prochaine étape logique serait d’**initialiser les `blocks` du nouvel Item** à partir du `raw_content` (par exemple un seul bloc paragraphe avec ce texte), côté API, au moment du process. Je peux te proposer le diff précis (backend + éventuellement front) pour ça si tu veux.

---

**User**

apres la slice 2 on fait quoi ? l'apps erait capable de faire quoi ?

---

**Cursor**

Après la **Slice 2**, la spec Phase 1 prévoit encore **Slice 3** puis **Slice 4**. Voici ce que l’app peut faire à chaque étape.

---

## Après Slice 2 (état actuel)

- Auth, Today, Timeline + tracking, Inbox + transformation en item, détail item (blocs) web + mobile.

---

## Après Slice 3 — Journaling & capture omnicanale

**Nouveau que l’app saura faire :**

| Côté | Fonctionnalité |
|------|----------------|
| **API** | `POST /capture/external` : créer une capture depuis l’extérieur avec un `source` (deeplink, extension, share). |
| **Mobile** | **Deep link** `lifeos://share?text=...` : ouvrir l’app et créer une capture dans l’Inbox (ex. partage depuis une autre app). |
| **DB** | Table `habit_logs` : un score d’humeur par user par jour (1–5). |
| **API** | `POST /habits/log` : enregistrer l’humeur du jour (date + mood_score 1–5 ou null). |
| **Web** | Widget **mood** sur `/me` (ou Sidebar) : 5 boutons/étoiles, enregistrement via BFF. |
| **Mobile** | Même widget mood sur l’onglet Me. |

En résumé : **capture depuis l’extérieur** (deep link, puis plus tard extension / share) **+ journaling humeur** (mood 1–5 par jour).

---

## Après Slice 4 — Hardening multi-tenant & préparation IA/RAG

**Nouveau que l’app saura faire (surtout fondations) :**

| Côté | Fonctionnalité |
|------|----------------|
| **Backend** | Toutes les ressources métier vérifiées comme filtrées par `workspace_id` ; accès cross-tenant → **404** (pas 403). |
| **DB** | Extension **pgvector** + tables `documents` et `embeddings` (vecteurs 1536) pour de la recherche sémantique plus tard. |
| **API** | `POST /rag/search` : stub qui renvoie `{ "results": [] }` — contrat stable pour Phase 2. |
| **BFF** | Proxy vers `/api/v1/rag/search`. |

Pas de nouvelle UI obligatoire : **isolation tenant renforcée + base prête pour RAG/IA** (Phase 2).

---

## Récap

- **Slice 3** : l’app peut **capturer depuis l’extérieur** (deep link) et **logger l’humeur** (mood 1–5) sur web et mobile.  
- **Slice 4** : l’app est **sécurisée multi-tenant** (404 cross-tenant) et **préparée pour RAG/IA** (pgvector + endpoint RAG stub), sans nouvelle feature utilisateur visible.

---

**User**

dans la phase 2 on aura quoi ?

---

**Cursor**

Dans le repo, **Phase 2 n’est pas décrite par une spec dédiée** comme Phase 1. Les éléments suivants en parlent et donnent une idée de ce qu’il y aura.

---

## Ce que dit la spec Phase 1 sur la Phase 2

- **Mobile** : Custom Dev Client (plus Expo Go) pour une **Share Extension native** (partage vers l’Inbox).
- **Today** : `priority_order` des items **calculé par Sync/IA** (au lieu du manuel en Phase 1).
- **Onboarding** : prévu **après** Phase 2, avec présentation des features (dont **IA**).

Donc Phase 2 = **IA / Sync** + **Share Extension** + **onboarding** qui présente tout ça.

---

## Ce que décrit le plan IA (`plan_codex_pour_IA.md`)

Phase 2 repose surtout sur **Sync IA** et les cas d’usage autour :

| Domaine | Contenu prévu |
|--------|----------------|
| **Capture → structuration** | Texte, lien, image, PDF, audio, etc. → pipeline (OCR/VLM/transcription) → Item/Task/Event/Blocs structurés. |
| **Actions IA “dans le flux”** | **Transformer** (brut → Item structuré), **Planifier** (dans la timeline, avec gestion des conflits), **Générer** (plan, draft, checklist, résumé). |
| **Sync / Plan Builder** | Page web **`/sync`** : mode **guidé** (quelques questions + plan épinglé) et mode **libre** (chat streaming). Pas d’onglet Sync dédié en mobile V1, mais actions IA depuis Today/Timeline/Inbox. |
| **Sécurité / traçabilité** | **Human-in-the-loop** : Preview → Apply → Undo, feed **AI Changes**, pas de modification silencieuse. |
| **Mémoire / RAG** | Réponses **sourcées** (pièces, items, extraits) ; utilisation du RAG préparé en Slice 4. |
| **Infra IA** | **LiteLLM Proxy** (routing, fallback, budgets, multi-modèles), tables runtime IA (runs, messages, drafts, changes, etc.). |
| **Connecteurs** | Entrées/sorties omnicanales (Telegram, WhatsApp, etc.) via gateway. |

En résumé : **IA pour transformer, planifier, générer**, avec une vraie page **Sync** sur le web, des boutons IA partout (Transformer / Planifier / Générer), et une **Share Extension** mobile pour capturer depuis d’autres apps.

---

## Synthèse courte

**Phase 2 =**  
- **IA** : Transformer (inbox → item), Planifier (timeline), Générer (plans, drafts).  
- **Sync** : page `/sync` (guidé + libre), preview/apply/undo, AI Changes.  
- **Mobile** : Custom Dev Client + Share Extension + actions IA depuis Today/Inbox/Timeline.  
- **Onboarding** : après Phase 2, pour présenter Today, Timeline, Inbox et **IA**.  

Une **spec technique Phase 2** détaillée (slices, DoD, contrats) n’existe pas encore dans le repo ; elle reste à écrire quand vous fixerez le périmètre exact de la Phase 2.

---

**User**

c'est écrit pq de base on séparait la page inbox en deux parties sur web ?

---

**Cursor**

Dans la spec ce n’est pas écrit noir sur blanc **pourquoi** l’inbox web est en deux parties. On peut le déduire comme ça :

---

## 1. Layout global « cockpit 3 colonnes »

Toutes les routes authentifiées utilisent le même layout :

- **Colonne 1** : Sidebar (nav)
- **Colonne 2** : liste (contenu secondaire)
- **Colonne 3** : zone principale (détail / contenu)

Donc l’inbox ne fait pas exception : elle **réutilise** ce pattern. Liste à gauche (col 2), détail à droite (col 3).

---

## 2. User story Slice 2

La user story dit :

> « Je capture du brut dans l’Inbox (sas), puis je le **transforme** en Item structuré et je **l’édite dans une vue détail**. »

Donc le flux prévu est : **liste** (captures / items) → **choix d’un élément** → **édition en vue détail**. La spec décrit donc naturellement deux zones : une pour la liste, une pour le détail.

---

## 3. Pattern list-detail (master-detail)

Avoir **liste + détail côte à côte** permet de :

- garder la liste visible pendant qu’on édite un item ;
- changer d’item sans quitter la page ni perdre le contexte ;
- faire « Process » sur une capture et voir tout de suite l’item créé dans la zone de détail.

C’est le même genre d’UX que Notion / Linear / Gmail (liste | détail).

---

**En résumé** : on sépare la page inbox en deux parties sur le web parce que (1) le cockpit est en 3 colonnes partout, (2) la user story prévoit liste puis édition en détail, et (3) le pattern list-detail sert ce flux. La spec impose le **quoi** (col 2 = liste, col 3 = détail), pas le **pourquoi**, qui reste implicite.

---

**User**

imagien toi (user story) en train du'tiliser l'app terminée pendant une semaine

---

**Cursor**

Voici une semaine d’usage de l’app **telle que prévue en fin de Phase 1** (slices 0–4), en mode user story.

---

## Lundi matin

Je me connecte sur **web**. Sidebar : Today, Inbox, Timeline, Me. Je vais sur **Today** : les 3 priorités du jour sont vides, pas d’event, pas de prochaine action. Normal, je n’ai rien mis encore.

J’ouvre **Inbox**. J’ajoute une capture : *« Préparer la présentation client jeudi »*. Une autre : *« Commander le cadeau anniversaire »*. La liste s’affiche à gauche. Je clique sur « Transformer » sur la première, je saisis le titre *« Présentation client jeudi »*, je valide. Un **Item** est créé ; le détail s’ouvre à droite. J’édite les blocs (BlockNote) : je structure en sous-tâches, j’ajoute un lien. La sauvegarde se fait en arrière-plan (optimistic UI). Je reviens à la liste, je transforme la deuxième capture en item *« Cadeau anniversaire »*, je mets une note rapide dans les blocs.

Sur **Timeline** je ne vois rien : pas d’events. Les items existent mais ne sont pas encore planifiés dans la journée (en Phase 1 c’est manuel ou à venir). Je passe sur **Me**, je log mon **mood** (4/5) pour aujourd’hui.

---

## Mardi

Je continue sur **web**. Je crée deux **events** (si l’UI le permet en Phase 1) ou je me contente de Today/Inbox. Je mets à jour mes priorités du jour dans Today (les 3 objectifs). Sur **Inbox**, j’ajoute *« Relancer Marie pour le devis »*, je transforme en item, j’édite le contenu en blocs.

En fin de journée, **Timeline** : je vois les events du jour. Je clique sur **Démarrer** sur « Présentation client » pour lancer le **tracking**. Le chrono tourne. Plus tard j’arrête : le temps réel est enregistré (`actual_time_acc`). Je log mon mood (3/5).

---

## Mercredi – mobile

Je suis sur **mobile**. Onglets : Today, Inbox, [+], Timeline, Me. **Today** : digest du jour (priorités, prochain event, prochaine action). **Inbox** : liste des captures. J’ajoute une capture depuis le champ, puis je reçois un **deep link** d’une autre app (partage) : `lifeos://share?text=...`. L’app s’ouvre, la capture est créée dans l’Inbox (Slice 3). Je tap sur la capture, « Transformer », je saisis le titre, je valide. Le **Bottom Sheet** item s’ouvre : onglets Détails, Blocs (TenTap), Coach (placeholder). J’édite les blocs sur l’onglet Blocs.

**Timeline** : vue jour, events avec Démarrer/Arrêter. Je track un event depuis le téléphone. **Me** : widget mood, je mets 5/5.

---

## Jeudi – présentation

**Web**. Today affiche « Présentation client jeudi » dans les priorités ou la prochaine action. Timeline : l’event de la présentation est là. Je démarre le tracking au début de la réunion, j’arrête à la fin. Le temps est enregistré. Après la réunion, j’ajoute une capture Inbox : *« Envoyer le compte-rendu et les prochaines étapes »*, je transforme en item, j’écris le CR dans les blocs. Mood du soir : 4/5.

---

## Vendredi – fin de semaine

Je consulte **Today** : objectifs du jour, prochain event, prochaine action. **Inbox** : je traite les dernières captures (transformer en items, éditer les blocs). **Timeline** : je revois la semaine en changeant la date (si l’UI le permet) ou jour par jour. Les temps trackés sont visibles. **Me** : mood 4/5.

Mes données (captures, items, events, mood) sont **isolées par workspace** (Slice 4). Pas de fuite entre workspaces ; un accès cross-tenant renverrait 404.

---

## Ce que j’ai fait en une semaine (Phase 1 « terminée »)

- **Capturer** du brut (web + mobile, dont deep link).
- **Transformer** les captures en items et **éditer** le contenu (blocs) en list-detail (web) et Bottom Sheet (mobile).
- **Consulter** le digest Today et la Timeline jour.
- **Tracker** le temps sur les events (start/stop, temps accumulé).
- **Logger** l’humeur (1–5) chaque jour.
- **Naviguer** dans un cockpit fixe (sidebar + list + détail sur web, 5 onglets sur mobile).

**Pas encore là en Phase 1** : IA pour transformer/planifier, sync calendrier externe, vue semaine, drag & drop, Share Extension native, onboarding. C’est le genre d’usage qu’une semaine avec l’app « terminée » en Phase 1 donnerait.

---

**User**

comment tu aurais corrigé ça ? @/Users/andrewpougary/.cursor/projects/Users-andrewpougary-DevLocal-Momentarise-Momentarise-code-workspace/terminals/11.txt 

---

**Cursor**

Repérant deux problèmes dans le terminal. Vérifiant la config pour proposer des corrections précises.


Il y a **deux points** à corriger d’après le terminal.

---

## 1. Deprecation Babel : `expo-router/babel`

**Message :**  
`expo-router/babel is deprecated in favor of babel-preset-expo in SDK 50. To fix the issue, remove "expo-router/babel" from "plugins" in your babel.config.js file.`

**Correction :**  
Dans `apps/mobile/babel.config.js`, enlever le plugin `"expo-router/babel"` et garder uniquement `react-native-reanimated/plugin` (qui doit rester en dernier) :

```js
// Avant
plugins: ["expo-router/babel", "react-native-reanimated/plugin"],

// Après
plugins: ["react-native-reanimated/plugin"],
```

`babel-preset-expo` (déjà dans tes `presets`) prend en charge ce que faisait `expo-router/babel` en SDK 50.

---

## 2. Erreur de bundle : `EXPO_ROUTER_APP_ROOT`

**Message :**  
`Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT` — *First argument of `require.context` should be a string denoting the directory to require.*

**Cause :**  
Expo Router s’appuie sur `process.env.EXPO_ROUTER_APP_ROOT` pour `require.context(...)`. En monorepo ou si l’env n’est pas définie au moment du build Metro, cette variable peut être `undefined`, ce qui provoque l’erreur.

**Corrections possibles :**

**A. Définir la variable dans `.env` (recommandé)**  
À la racine de `apps/mobile/`, dans `.env` (ou `.env.local`) :

```bash
EXPO_ROUTER_APP_ROOT=app
```

Puis redémarrer Metro avec un cache propre :

```bash
npx expo start --clear
```

**B. Si ça ne suffit pas (monorepo)**  
Forcer la valeur au démarrage de Metro en l’injectant avant que le config soit chargé. Par exemple dans `apps/mobile/package.json`, script `"start"` :

```json
"scripts": {
  "start": "EXPO_ROUTER_APP_ROOT=app npx expo start --clear"
}
```

(Sur Windows il faudra un équivalent type `cross-env` ou définir la variable autrement.)

**C. Vérifier le plugin Expo Router**  
Dans `app.json`, le plugin `"expo-router"` est déjà là ; avec les versions récentes d’Expo Router, il est censé définir `EXPO_ROUTER_APP_ROOT`. Si le problème reste après A (et B), vérifier la doc de ta version d’`expo-router` pour d’éventuelles options du plugin (ex. racine du projet ou chemin vers `app` en monorepo).

---

**Résumé :**  
1. Retirer `"expo-router/babel"` des `plugins` dans `babel.config.js`.  
2. Définir `EXPO_ROUTER_APP_ROOT=app` (`.env` ou script `start`), puis `npx expo start --clear`.  

Tu es en **Ask mode** : je ne peux pas modifier les fichiers. Si tu veux que j’applique ces changements dans le projet, passe en **Agent mode** et on pourra les faire directement.

---

**User**

j'avais déjà rencontré cette erreur dans cette conv non : @project/implementation_conversations/cursor_implementation_of_slice_1_specif.md ? comment on l'a corrigé le cas échéant ? 

---

**Cursor**

Non : dans `project/implementation_conversations/cursor_implementation_of_slice_1_specif.md`, **cette erreur n’apparaît pas et n’a pas été corrigée**.

Ce qui est documenté côté mobile / Expo dans cette conv :

- **“Failed to fetch”** pour Today/Timeline → cause : **401** (token invalide/expiré) ; correction : en cas de 401, suppression du token + redirection vers login, et plus d’affichage “failed to fetch”.
- **Config Metro** en monorepo : `watchFolders`, résolution de `@momentarise/shared`, pas de `EXPO_ROUTER_APP_ROOT`.
- **`EXPO_PUBLIC_API_URL`** : rappel d’utiliser l’IP du Mac (ex. `172.20.10.11:8000`) et non `localhost` sur appareil physique.
- **SafeAreaProvider** dans `_layout.tsx` pour les safe areas.

Il n’y a **aucune** mention de :

- `EXPO_ROUTER_APP_ROOT`
- `expo-router/babel` deprecated
- `require.context` / “First argument of require.context should be a string”
- “Invalid call at line 2”
- “iOS Bundling failed” pour `_ctx.ios.js`

Donc l’erreur actuelle (deprecation babel + `EXPO_ROUTER_APP_ROOT` / `require.context`) n’a pas été rencontrée ni corrigée dans cette conversation Slice 1. La correction à appliquer reste celle décrite plus tôt (retirer `expo-router/babel` et définir `EXPO_ROUTER_APP_ROOT=app`).

---

**User**

c'est quoi la slice 4 ?

---

**Cursor**

La **Slice 4** dans la spec Phase 1, c’est :

---

## Slice 4 — Hardening multi-tenant & préparation IA/RAG

**User story :**  
« En tant qu’utilisateur, mes données sont strictement isolées par workspace. En tant que dev, je prépare les fondations (pgvector, proxy LLM, règles de sécurité) sans coupler l’app à un fournisseur. »

---

### Ce qui est dans le scope

| Domaine | Contenu |
|--------|--------|
| **Backend** | Vérifier que **toutes** les routes métier (today, timeline, events, inbox, items, capture, habits) filtrent bien par `workspace_id` → pas de fuite entre tenants. |
| **Sécurité** | Accès à une ressource d’un **autre** workspace → répondre **404** (et pas 403), pour ne pas révéler qu’une ressource existe. |
| **DB** | Activer l’extension **pgvector** (migration Alembic) ; créer les tables **`documents`** (workspace_id, metadata JSONB) et **`embeddings`** (document_id, vecteur 1536). |
| **API** | Endpoint **`POST /api/v1/rag/search`** (body `query` + `filters`) qui renvoie `{ "results": [] }` (stub). |
| **BFF** | Route `POST /api/rag/search` qui proxy vers FastAPI. |

---

### Hors scope (Slice 4)

- UI complète « Memory / RAG ».
- Agents IA autonomes (Sync, Plan Builder) : uniquement préparation d’architecture.

---

### En résumé

La Slice 4 = **renforcer l’isolation multi-tenant** (audit + 404 cross-tenant) + **préparer la base pour l’IA/RAG** (pgvector, tables documents/embeddings, endpoint RAG en stub), **sans** nouvelle feature utilisateur visible ni vraie recherche RAG. C’est la dernière slice de la Phase 1.

---

**User**

@project/inbox_raw/openclaw_archi.md il manque quoi pour pouvoir preview ça ?

---

**Cursor**

Le fichier contient du **Mermaid** (graph TB…) en texte brut. Pour qu’il soit prévisualisable dans un rendu Markdown (Cursor, VS Code, GitHub, etc.), il faut que le diagramme soit dans un **bloc de code Mermaid**.


C’est fait. Il manquait uniquement l’**entourage du diagramme par un bloc Mermaid** pour que le Markdown le rende comme schéma.

**Modifications :**
- Ajout de **\`\`\`mermaid** au début du diagramme
- Ajout de **\`\`\`** à la fin

Tu peux maintenant :
- **Cursor / VS Code** : ouvrir l’aperçu Markdown (Ctrl/Cmd + Shift + V ou icône preview) ; si Mermaid est géré, le diagramme s’affiche.
- **GitHub** : en poussant le fichier, GitHub rendra le Mermaid dans l’aperçu du `.md`.
- **Sans support Mermaid** : installer une extension (ex. “Markdown Preview Mermaid Support” sur VS Code) ou coller le contenu dans [mermaid.live](https://mermaid.live) pour le prévisualiser.

---

**User**

@/Users/andrewpougary/.cursor/projects/Users-andrewpougary-DevLocal-Momentarise-Momentarise-code-workspace/terminals/2.txt 1 severe vulnerability ?

---

**Cursor**

Le message vient de **npm** après `npm install` dans `apps/web` : il signale **1 vulnérabilité de sévérité haute** dans les dépendances.

Pour savoir **de quoi il s’agit** :

```bash
cd apps/web && npm audit
```

Tu verras le package concerné, la vulnérabilité (CVE, type) et les versions qui la corrigent.

Pour **tenter une correction automatique** :

```bash
cd apps/web && npm audit fix
```

- Si npm peut mettre à jour sans casser les semver compatibles, la vulnérabilité disparaît après un nouvel `npm install` / `npm audit`.
- Si la correction impose des **breaking changes**, npm propose `npm audit fix --force` (à utiliser avec prudence, ça peut casser le projet).

En **Ask mode** je ne peux pas exécuter ces commandes. Si tu colles la sortie de `npm audit` (les quelques lignes sur la vulnérabilité), je peux t’indiquer quoi faire (mise à jour manuelle, alternative, ou si c’est un faux positif connu).

---

**User**

pr démarrer app/api avec uv ?

---

**Cursor**

Pour lancer l’API avec **uv** :

```bash
cd apps/api
uv run uvicorn src.main:app --reload --port 8000
```

- **`uv run`** : exécute dans l’environnement géré par uv (dépendances du projet).
- **`uvicorn src.main:app`** : sert l’app FastAPI (`app` dans `src/main.py`).
- **`--reload`** : rechargement auto quand tu modifies le code.
- **`--port 8000`** : écoute sur le port 8000 (comme dans les conventions du projet).

Avant le premier lancement, si ce n’est pas déjà fait :

```bash
cd apps/api
uv sync
uv run alembic upgrade head
```

Puis l’API sera dispo sur **http://localhost:8000** (et `/api/v1/health` pour un check rapide).

---

**User**

@/Users/andrewpougary/.cursor/projects/Users-andrewpougary-DevLocal-Momentarise-Momentarise-code-workspace/terminals/3.txt 

---

**Cursor**

Le terminal montre **deux choses** :

---

**1. Premier essai (exit code 1)**  
`Failed to spawn: uvicorn` — souvent dû à une commande collée en une seule ligne (`cd apps/apiuv run...` sans espace ou retour entre `api` et `uv`), donc le shell était peut‑être dans le mauvais répertoire ou n’a pas trouvé `uvicorn`.

**2. Deuxième essai**  
`ERROR: [Errno 48] Address already in use` — le **port 8000 est déjà utilisé** (une autre instance de l’API ou un autre processus l’utilise).

---

**À faire :**

- **Libérer le port 8000** (conformément à ta règle : ne tuer que ce port) :
  ```bash
  lsof -ti:8000 | xargs kill
  ```
  Puis relancer :
  ```bash
  cd apps/api && uv run uvicorn src.main:app --reload --port 8000
  ```

- **Ou** lancer l’API sur un autre port, par ex. 8001 :
  ```bash
  cd apps/api && uv run uvicorn src.main:app --reload --port 8001
  ```
  Dans ce cas, le web (et le mobile) devront utiliser ce port dans leur config (ex. `API_URL`, `EXPO_PUBLIC_API_URL`).

En résumé : une instance tourne déjà sur 8000 ; soit tu la stoppe avec `lsof -ti:8000 | xargs kill`, soit tu utilises un autre port.

---

**User**

@/Users/andrewpougary/.cursor/projects/Users-andrewpougary-DevLocal-Momentarise-Momentarise-code-workspace/terminals/3.txt 

---

**Cursor**

Le souci vient du **répertoire courant** :

Tu étais déjà dans **`apps`** (après `cd ..`). La commande `cd apps/api` a donc cherché **`apps/apps/api`**, qui n’existe pas → `no such file or directory: apps/api`. Ensuite `uv run uvicorn` s’est exécuté dans `apps` (sans être dans le projet API) → `Failed to spawn: uvicorn`.

**À faire :**

Depuis **`apps`** (où tu es maintenant) :
```bash
cd api
uv run uvicorn src.main:app --reload --port 8000
```

Ou en une seule commande depuis **la racine du repo** (Momentarise) :
```bash
cd /Users/andrewpougary/DevLocal/Momentarise/apps/api && uv run uvicorn src.main:app --reload --port 8000
```

En résumé : une fois dans `apps`, il faut aller dans `api` avec `cd api`, pas `cd apps/api`.

---

**User**

@/Users/andrewpougary/.cursor/projects/Users-andrewpougary-DevLocal-Momentarise-Momentarise-code-workspace/terminals/3.txt:5 

---

**Cursor**

Constatant une désynchronisation entre les modèles SQLAlchemy et la base PostgreSQL. Vérifiant les modèles actuels :


Le message **sqlalche.me/e/20/f405** est une **ProgrammingError** : PostgreSQL renvoie « colonne inexistante ». Ici, **les modèles Python déclarent des colonnes qui n’existent pas en base**.

---

## Ce qui se passe

**1. Table `items`**  
Le modèle dans `apps/api/src/models/item.py` définit notamment :
- `kind`, `status`, `metadata` (mappé en `meta`), `source_capture_id`  
alors que la base (migrations Slice 2 actuelles) n’a que : `workspace_id`, `title`, `priority_order`, `blocks` (+ colonnes du base mixin).  
→ Erreur : **column items.kind does not exist** (idem pour les autres colonnes ajoutées au modèle mais pas en DB).

**2. Table `inbox_captures`**  
Le modèle dans `apps/api/src/models/inbox_capture.py` définit :
- `capture_type`, `status`, `metadata` (mappé en `meta`)  
alors que la migration Slice 2 n’a créé que : `workspace_id`, `user_id`, `raw_content`, `source` (+ base mixin).  
→ Erreur : **column inbox_captures.capture_type does not exist**.

Donc le code a été enrichi (kind, status, capture_type, metadata, source_capture_id, etc.) **sans** migration correspondante. La base est restée sur le schéma Slice 2.

---

## Deux façons de corriger

**Option A – Revenir au schéma de la spec Phase 1 (Slice 2)**  
- Dans **Item** : ne garder que `workspace_id`, `title`, `priority_order`, `blocks` (et relations). Supprimer `kind`, `status`, `meta`, `source_capture_id`, et la relation `source_capture` / `derived_items` si tu veux coller à la spec.  
- Dans **InboxCapture** : ne garder que `workspace_id`, `user_id`, `raw_content`, `source`. Supprimer `capture_type`, `status`, `meta`, et la relation `derived_items` si elle n’est plus utilisée.  
- Aucune migration à ajouter si la DB est déjà à jour avec les migrations Slice 2.

**Option B – Faire suivre la base (garder les colonnes dans les modèles)**  
- Créer une migration Alembic qui ajoute en base :  
  - sur **items** : `kind`, `status`, `metadata` (JSONB), `source_capture_id` (FK nullable), avec les mêmes types/defaults que dans le modèle ;  
  - sur **inbox_captures** : `capture_type`, `status`, `metadata` (JSONB), avec les mêmes types/defaults.  
- Puis exécuter `uv run alembic upgrade head`.

---

En résumé : **f405** = la requête SQL générée par SQLAlchemy utilise des colonnes que PostgreSQL ne connaît pas. Soit tu alignes les modèles sur la DB actuelle (option A), soit tu alignes la DB sur les modèles avec une migration (option B). Si tu veux que j’applique l’une des deux (modifs de modèles + éventuelle migration), passe en **Agent mode** et indique A ou B.

---

**User**

tu peux faire quoide ça : ---
name: self-improvement
description: "Captures learnings, errors, and corrections to enable continuous improvement. Use when: (1) A command or operation fails unexpectedly, (2) User corrects Claude ('No, that's wrong...', 'Actually...'), (3) User requests a capability that doesn't exist, (4) An external API or tool fails, (5) Claude realizes its knowledge is outdated or incorrect, (6) A better approach is discovered for a recurring task. Also review learnings before major tasks. For CI-only/headless learning capture, use self-improvement-ci."
---

# Self-Improvement Skill

## Install

```bash
npx skills add pskoett/pskoett-ai-skills/self-improvement
```

For CI-only execution, use:

```bash
npx skills add pskoett/pskoett-ai-skills/self-improvement-ci
```

Log learnings and errors to markdown files for continuous improvement. Coding agents can later process these into fixes, and important learnings get promoted to project memory.

## Quick Reference

| Situation | Action |
|-----------|--------|
| Command/operation fails | Log to `.learnings/ERRORS.md` |
| User corrects you | Log to `.learnings/LEARNINGS.md` with category `correction` |
| User wants missing feature | Log to `.learnings/FEATURE_REQUESTS.md` |
| API/external tool fails | Log to `.learnings/ERRORS.md` with integration details |
| Knowledge was outdated | Log to `.learnings/LEARNINGS.md` with category `knowledge_gap` |
| Found better approach | Log to `.learnings/LEARNINGS.md` with category `best_practice` |
| Simplify/Harden recurring patterns | Log/update `.learnings/LEARNINGS.md` with `Source: simplify-and-harden` and a stable `Pattern-Key` |
| Similar to existing entry | Link with `**See Also**`, consider priority bump |
| Broadly applicable learning | Promote to `CLAUDE.md`, `AGENTS.md`, and/or `.github/copilot-instructions.md` |
| Workflow improvements | Promote to `AGENTS.md` (openclaw workspace) |
| Tool gotchas | Promote to `TOOLS.md` (openclaw workspace) |
| Behavioral patterns | Promote to `SOUL.md` (openclaw workspace) |

## Setup

Create `.learnings/` directory in project root if it doesn't exist:

```bash
mkdir -p .learnings
```

Copy templates from `assets/` or create files with headers.

## Logging Format

### Learning Entry

Append to `.learnings/LEARNINGS.md`:

```markdown
## [LRN-YYYYMMDD-XXX] category

**Logged**: ISO-8601 timestamp
**Priority**: low | medium | high | critical
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
One-line description of what was learned

### Details
Full context: what happened, what was wrong, what's correct

### Suggested Action
Specific fix or improvement to make

### Metadata
- Source: conversation | error | user_feedback
- Related Files: path/to/file.ext
- Tags: tag1, tag2
- See Also: LRN-20250110-001 (if related to existing entry)
- Pattern-Key: simplify.dead_code | harden.input_validation (optional, for recurring-pattern tracking)
- Recurrence-Count: 1 (optional)
- First-Seen: 2025-01-15 (optional)
- Last-Seen: 2025-01-15 (optional)

---
```

### Error Entry

Append to `.learnings/ERRORS.md`:

```markdown
## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
```
Actual error message or output
```

### Context
- Command/operation attempted
- Input or parameters used
- Environment details if relevant

### Suggested Fix
If identifiable, what might resolve this

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001 (if recurring)

---
```

### Feature Request Entry

Append to `.learnings/FEATURE_REQUESTS.md`:

```markdown
## [FEAT-YYYYMMDD-XXX] capability_name

**Logged**: ISO-8601 timestamp
**Priority**: medium
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Requested Capability
What the user wanted to do

### User Context
Why they needed it, what problem they're solving

### Complexity Estimate
simple | medium | complex

### Suggested Implementation
How this could be built, what it might extend

### Metadata
- Frequency: first_time | recurring
- Related Features: existing_feature_name

---
```

## ID Generation

Format: `TYPE-YYYYMMDD-XXX`
- TYPE: `LRN` (learning), `ERR` (error), `FEAT` (feature)
- YYYYMMDD: Current date
- XXX: Sequential number or random 3 chars (e.g., `001`, `A7B`)

Examples: `LRN-20250115-001`, `ERR-20250115-A3F`, `FEAT-20250115-002`

## Resolving Entries

When an issue is fixed, update the entry:

1. Change `**Status**: pending` → `**Status**: resolved`
2. Add resolution block after Metadata:

```markdown
### Resolution
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done
```

Other status values:
- `in_progress` - Actively being worked on
- `wont_fix` - Decided not to address (add reason in Resolution notes)
- `promoted` - Elevated to CLAUDE.md, AGENTS.md, or .github/copilot-instructions.md

## Promoting to Project Memory

When a learning is broadly applicable (not a one-off fix), promote it to permanent project memory.

### When to Promote

- Learning applies across multiple files/features
- Knowledge any contributor (human or AI) should know
- Prevents recurring mistakes
- Documents project-specific conventions

### Promotion Targets

| Target | What Belongs There |
|--------|-------------------|
| `CLAUDE.md` | Project facts, conventions, gotchas for all Claude interactions |
| `AGENTS.md` | Agent-specific workflows, tool usage patterns, automation rules |
| `.github/copilot-instructions.md` | Project context and conventions for GitHub Copilot |
| `SOUL.md` | Behavioral guidelines, communication style, principles (openclaw) |
| `TOOLS.md` | Tool capabilities, usage patterns, integration gotchas (openclaw) |

### How to Promote

1. **Distill** the learning into a concise rule or fact
2. **Add** to appropriate section in target file (create file if needed)
3. **Update** original entry:
   - Change `**Status**: pending` → `**Status**: promoted`
   - Add `**Promoted**: CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md`

### Promotion Examples

**Learning** (verbose):
> Project uses pnpm workspaces. Attempted `npm install` but failed. 
> Lock file is `pnpm-lock.yaml`. Must use `pnpm install`.

**In CLAUDE.md** (concise):
```markdown
## Build & Dependencies
- Package manager: pnpm (not npm) - use `pnpm install`
```

**Learning** (verbose):
> When modifying API endpoints, must regenerate TypeScript client.
> Forgetting this causes type mismatches at runtime.

**In AGENTS.md** (actionable):
```markdown
## After API Changes
1. Regenerate client: `pnpm run generate:api`
2. Check for type errors: `pnpm tsc --noEmit`
```

## Recurring Pattern Detection

If logging something similar to an existing entry:

1. **Search first**: `grep -r "keyword" .learnings/`
2. **Link entries**: Add `**See Also**: ERR-20250110-001` in Metadata
3. **Bump priority** if issue keeps recurring
4. **Consider systemic fix**: Recurring issues often indicate:
   - Missing documentation (→ promote to CLAUDE.md or .github/copilot-instructions.md)
   - Missing automation (→ add to AGENTS.md)
   - Architectural problem (→ create tech debt ticket)

## Simplify & Harden Feed

Use this workflow to ingest recurring patterns from the `simplify-and-harden`
skill and turn them into durable prompt guidance.

### Ingestion Workflow

1. Read `simplify_and_harden.learning_loop.candidates` from the task summary.
2. For each candidate, use `pattern_key` as the stable dedupe key.
3. Search `.learnings/LEARNINGS.md` for an existing entry with that key:
   - `grep -n "Pattern-Key: <pattern_key>" .learnings/LEARNINGS.md`
4. If found:
   - Increment `Recurrence-Count`
   - Update `Last-Seen`
   - Add `See Also` links to related entries/tasks
5. If not found:
   - Create a new `LRN-...` entry
   - Set `Source: simplify-and-harden`
   - Set `Pattern-Key`, `Recurrence-Count: 1`, and `First-Seen`/`Last-Seen`

### Promotion Rule (System Prompt Feedback)

Promote recurring patterns into agent context/system prompt files when all are true:

- `Recurrence-Count >= 3`
- Seen across at least 2 distinct tasks
- Occurred within a 30-day window

Promotion targets:
- `CLAUDE.md`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `SOUL.md` / `TOOLS.md` for openclaw workspace-level guidance when applicable

Write promoted rules as short prevention rules (what to do before/while coding),
not long incident write-ups.

## Periodic Review

Review `.learnings/` at natural breakpoints:

### When to Review
- Before starting a new major task
- After completing a feature
- When working in an area with past learnings
- Weekly during active development

### Quick Status Check
```bash
# Count pending items
grep -h "Status\*\*: pending" .learnings/*.md | wc -l

# List pending high-priority items
grep -B5 "Priority\*\*: high" .learnings/*.md | grep "^## \["

# Find learnings for a specific area
grep -l "Area\*\*: backend" .learnings/*.md
```

### Review Actions
- Resolve fixed items
- Promote applicable learnings
- Link related entries
- Escalate recurring issues

## Detection Triggers

Automatically log when you notice:

**Corrections** (→ learning with `correction` category):
- "No, that's not right..."
- "Actually, it should be..."
- "You're wrong about..."
- "That's outdated..."

**Feature Requests** (→ feature request):
- "Can you also..."
- "I wish you could..."
- "Is there a way to..."
- "Why can't you..."

**Knowledge Gaps** (→ learning with `knowledge_gap` category):
- User provides information you didn't know
- Documentation you referenced is outdated
- API behavior differs from your understanding

**Errors** (→ error entry):
- Command returns non-zero exit code
- Exception or stack trace
- Unexpected output or behavior
- Timeout or connection failure

## Priority Guidelines

| Priority | When to Use |
|----------|-------------|
| `critical` | Blocks core functionality, data loss risk, security issue |
| `high` | Significant impact, affects common workflows, recurring issue |
| `medium` | Moderate impact, workaround exists |
| `low` | Minor inconvenience, edge case, nice-to-have |

## Area Tags

Use to filter learnings by codebase region:

| Area | Scope |
|------|-------|
| `frontend` | UI, components, client-side code |
| `backend` | API, services, server-side code |
| `infra` | CI/CD, deployment, Docker, cloud |
| `tests` | Test files, testing utilities, coverage |
| `docs` | Documentation, comments, READMEs |
| `config` | Configuration files, environment, settings |

## Best Practices

1. **Log immediately** - context is freshest right after the issue
2. **Be specific** - future agents need to understand quickly
3. **Include reproduction steps** - especially for errors
4. **Link related files** - makes fixes easier
5. **Suggest concrete fixes** - not just "investigate"
6. **Use consistent categories** - enables filtering
7. **Promote aggressively** - if in doubt, add to CLAUDE.md or .github/copilot-instructions.md
8. **Review regularly** - stale learnings lose value

## Gitignore Options

**Keep learnings local** (per-developer):
```gitignore
.learnings/
```

**Track learnings in repo** (team-wide):
Don't add to .gitignore - learnings become shared knowledge.

**Hybrid** (track templates, ignore entries):
```gitignore
.learnings/*.md
!.learnings/.gitkeep
```

## Hook Integration

Enable automatic reminders through agent hooks. This is **opt-in** - you must explicitly configure hooks.

### Quick Setup (Claude Code / Codex)

Create `.claude/settings.json` in your project:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "./skills/self-improvement/scripts/activator.sh"
      }]
    }]
  }
}
```

This injects a learning evaluation reminder after each prompt (~50-100 tokens overhead).

### Full Setup (With Error Detection)

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "./skills/self-improvement/scripts/activator.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "./skills/self-improvement/scripts/error-detector.sh"
      }]
    }]
  }
}
```

### Available Hook Scripts

| Script | Hook Type | Purpose |
|--------|-----------|---------|
| `scripts/activator.sh` | UserPromptSubmit | Reminds to evaluate learnings after tasks |
| `scripts/error-detector.sh` | PostToolUse (Bash) | Triggers on command errors |

See `references/hooks-setup.md` for detailed configuration and troubleshooting.

## Automatic Skill Extraction

When a learning is valuable enough to become a reusable skill, extract it using the provided helper.

### Skill Extraction Criteria

A learning qualifies for skill extraction when ANY of these apply:

| Criterion | Description |
|-----------|-------------|
| **Recurring** | Has `See Also` links to 2+ similar issues |
| **Verified** | Status is `resolved` with working fix |
| **Non-obvious** | Required actual debugging/investigation to discover |
| **Broadly applicable** | Not project-specific; useful across codebases |
| **User-flagged** | User says "save this as a skill" or similar |

### Extraction Workflow

1. **Identify candidate**: Learning meets extraction criteria
2. **Run helper** (or create manually):
   ```bash
   ./skills/self-improvement/scripts/extract-skill.sh skill-name --dry-run
   ./skills/self-improvement/scripts/extract-skill.sh skill-name
   ```
3. **Customize SKILL.md**: Fill in template with learning content
4. **Update learning**: Set status to `promoted_to_skill`, add `Skill-Path`
5. **Verify**: Read skill in fresh session to ensure it's self-contained

### Manual Extraction

If you prefer manual creation:

1. Create `skills/<skill-name>/SKILL.md`
2. Use template from `assets/SKILL-TEMPLATE.md`
3. Follow [Agent Skills spec](https://agentskills.io/specification):
   - YAML frontmatter with `name` and `description`
   - Name must match folder name
   - No README.md inside skill folder

### Extraction Detection Triggers

Watch for these signals that a learning should become a skill:

**In conversation:**
- "Save this as a skill"
- "I keep running into this"
- "This would be useful for other projects"
- "Remember this pattern"

**In learning entries:**
- Multiple `See Also` links (recurring issue)
- High priority + resolved status
- Category: `best_practice` with broad applicability
- User feedback praising the solution

### Skill Quality Gates

Before extraction, verify:

- [ ] Solution is tested and working
- [ ] Description is clear without original context
- [ ] Code examples are self-contained
- [ ] No project-specific hardcoded values
- [ ] Follows skill naming conventions (lowercase, hyphens)

## Multi-Agent Support

This skill works across different AI coding agents with agent-specific activation.

### Claude Code

**Activation**: Hooks (UserPromptSubmit, PostToolUse)
**Setup**: `.claude/settings.json` with hook configuration
**Detection**: Automatic via hook scripts

### Codex CLI

**Activation**: Hooks (same pattern as Claude Code)
**Setup**: `.codex/settings.json` with hook configuration
**Detection**: Automatic via hook scripts

### GitHub Copilot

**Activation**: Manual (no hook support)
**Setup**: Add to `.github/copilot-instructions.md`:

```markdown
## Self-Improvement

After solving non-obvious issues, consider logging to `.learnings/`:
1. Use format from self-improvement skill
2. Link related entries with See Also
3. Promote high-value learnings to skills

Ask in chat: "Should I log this as a learning?"
```

**Detection**: Manual review at session end

### OpenClaw (Optional)

OpenClaw-specific setup, promotion targets, and hybrid usage details are kept in
`references/openclaw-integration.md` so this main skill stays focused on the core
self-improvement workflow for coding agents.

### Agent-Agnostic Guidance

Regardless of agent, apply self-improvement when you:

1. **Discover something non-obvious** - solution wasn't immediate
2. **Correct yourself** - initial approach was wrong
3. **Learn project conventions** - discovered undocumented patterns
4. **Hit unexpected errors** - especially if diagnosis was difficult
5. **Find better approaches** - improved on your original solution

### Copilot Chat Integration

For Copilot users, add this to your prompts when relevant:

> After completing this task, evaluate if any learnings should be logged to `.learnings/` using the self-improvement skill format.

Or use quick prompts:
- "Log this to learnings"
- "Create a skill from this solution"
- "Check .learnings/ for related issues" ?

---

**Cursor**

Tu peux t’en servir comme d’un **workflow de “journal de debug”** pour éviter de refaire les mêmes erreurs, et (si tu veux) comme une **skill installable** via un outil `npx skills`.

### Ce que ça t’apporte concrètement
- **Centraliser les incidents** (erreurs, commandes qui échouent, causes, fix).
- **Centraliser les apprentissages** (corrections, best practices, gaps de connaissance).
- **Tracer les demandes** (features que tu voudrais plus tard).
- Et ensuite **promouvoir** ce qui revient souvent vers une doc “mémoire” (ex. `AGENTS.md`, `CLAUDE.md`, etc.).

### Deux manières de l’utiliser

#### Option A — Simple (sans installer de skill)
Tu appliques juste la convention :
1. Créer un dossier `.learnings/` à la racine.
2. Ajouter 3 fichiers :
   - `.learnings/ERRORS.md`
   - `.learnings/LEARNINGS.md`
   - `.learnings/FEATURE_REQUESTS.md`
3. À chaque incident (ex. l’erreur `UndefinedColumnError` qu’on vient de voir), tu ajoutes une entrée au bon endroit avec le format donné.

C’est le plus robuste, zéro dépendance.

#### Option B — Installer la skill (si tu as l’outil “skills”)
Le texte dit :

```bash
npx skills add pskoett/pskoett-ai-skills/self-improvement
```

Ça suppose que tu as un package/CLI `skills` disponible via npm (c’est **pas** un standard npm). Si ça marche, ça te fournit souvent des templates/scripts/hooks pour automatiser la capture.

### Ce que tu peux logguer immédiatement dans ton cas
Vu les problèmes récents, tu aurais au moins :
- **ERRORS.md** : `EXPO_ROUTER_APP_ROOT` / `require.context` (bundle Expo Router).
- **ERRORS.md** : `UndefinedColumnError` (modèles SQLAlchemy ≠ schéma DB).
- **LEARNINGS.md** : “en monorepo, toujours vérifier que les migrations couvrent les colonnes ajoutées aux modèles”.

### Point d’attention (Momentarise)
Avant de “promouvoir” vers `AGENTS.md`/`CLAUDE.md`, il faut décider si tu veux **committer** `.learnings/` ou le garder local (le texte propose plusieurs stratégies `.gitignore`).

Si tu me dis si tu veux un usage **local** ou **partagé dans le repo**, je te propose la structure minimale et une première entrée type (sans modifier de fichiers en Ask mode).

---

**User**

et si je veux utiliser ça pour cursor pour mes projets de dev ?

---

**Cursor**

Tu peux l’utiliser dans Cursor de 2 façons, selon si tu veux juste **une méthode** (portable) ou une **automation**.

## Option 1 — La méthode “portable” (recommandée)
Ça marche sur tous tes projets, sans dépendre d’un outil externe.

- **Dans chaque repo** : crée un dossier `.learnings/` (ou `project/learnings/` si tu préfères rester cohérent avec ta structure `project/`).
- Mets 3 fichiers :
  - `ERRORS.md`
  - `LEARNINGS.md`
  - `FEATURE_REQUESTS.md`
- Quand tu as un bug (ex. Metro/Expo, migrations Alembic, etc.) tu ajoutes une entrée au bon fichier, au format du template.

**Avantage** : ça reste du Markdown, lisible, versionnable, et tu peux demander à Cursor “cherche dans `.learnings` si on a déjà vu ce bug”.

**Décision à prendre** :
- **Team/shared** : tu commits `.learnings/` dans le repo.
- **Local** : tu ajoutes `.learnings/` au `.gitignore` (mais tu perds le partage).

## Option 2 — En faire une “rule” Cursor (rappel automatique)
Si tu veux que Cursor se le rappelle tout seul, tu peux créer une règle dans `.cursor/rules/` du projet (ou une règle globale si tu as une config perso) qui dit en gros :

- “Quand une commande échoue, consigne l’erreur dans `.learnings/ERRORS.md`”
- “Quand on corrige une hypothèse, consigne dans `.learnings/LEARNINGS.md`”
- “Avant un gros chantier, relis `.learnings`”

Je peux te proposer le contenu exact de la règle à coller (Ask mode = je te donne le texte, tu l’ajoutes).

## Option 3 — Installer le truc `npx skills …` (si tu as ce workflow)
Ça dépend d’un CLI `skills` (pas standard). Si tu veux l’utiliser dans Cursor :
- tu l’installes dans un projet,
- tu utilises ses scripts/templates/hook si dispo,
- et tu gardes `.learnings/` comme sortie.

Mais honnêtement, **Option 1 + Option 2** couvre 95% du besoin, sans dépendance.

---

### Question rapide (pour te guider correctement)
Tu veux que tes learnings soient :
- **par projet** (dans chaque repo), ou
- **centralisés** (un seul endroit pour tous tes projets) ?

Les deux sont possibles, mais ça change l’organisation et la valeur “mémoire” que Cursor peut exploiter.

---

**User**

fais un rule

---

**Cursor**

Je vais créer une règle Cursor dédiée “self‑improvement” qui impose le logging dans `.learnings/` (erreurs, learnings, demandes) avec un format stable, et un réflexe de relecture avant gros chantiers.

Je crée une règle “self‑improvement” **globale** (alwaysApply) dans `.cursor/rules/` pour standardiser le logging dans `.learnings/` après erreurs/corrections/demandes, et rappeler une relecture avant gros chantiers.

Règle ajoutée dans `/.cursor/rules/self-improvement.mdc`.

Elle s’applique **à chaque session** et te donne :
- **quand** logguer (ERRORS / LEARNINGS / FEATURE_REQUESTS),
- **les règles** (pas de secrets, dédup, contenu minimal utile),
- **des mini‑templates** prêts à copier/coller.

Si tu veux, je peux aussi te créer le dossier `.learnings/` + les 3 fichiers avec en-têtes (dis‑moi si tu veux que ce soit **committé** ou **ignoré** via `.gitignore`).

