# LEARNINGS — Corrections, knowledge gaps, bonnes pratiques

Format : `## [LRN-YYYYMMDD-XXX] category` + Summary, Details, Suggested Action, Metadata.
Voir `project/docs/self-improvement.md` pour le détail des champs et la promotion vers CLAUDE.md / AGENTS.md.

---

## [LRN-20260228-004] best_practice — Scroll page chat / dashboard (Next.js flex chain)

**Logged**: 2026-02-28
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Sur une page type chat (header + zone scrollable + input fixe), si tout le contenu (y compris header et input) défile, c’est que la hauteur n’est pas contrainte dans la chaîne flex du layout.

### Details
- Un wrapper `flex-1 min-h-0 overflow-hidden` sur la page seule ne suffit pas : le parent (contenu du layout) et au-dessus doivent aussi permettre au flex de « rétrécir ». Sinon `flex-1` prend tout l’espace mais le contenu pousse et c’est toute la page qui scroll.
- **Chaîne à respecter** : (1) Racine dashboard = hauteur viewport fixe (`h-svh overflow-hidden` sur le wrapper du SidebarProvider, pas seulement `min-h-svh`). (2) SidebarInset et la div de contenu du layout avec `min-h-0` pour que les enfants `flex-1` puissent avoir une hauteur bornée. (3) Zone de contenu du layout en `overflow-auto` pour que les pages longues (Today, Inbox) scrollent dans cette zone. (4) Page chat (et sync) : wrapper `flex-1 min-h-0 overflow-hidden` ; seul le bloc conversation (ex. StickToBottom / Conversation) a le scroll.

### Suggested Action
Pour toute nouvelle page « plein écran » avec zone scrollable (chat, éditeur, etc.) : vérifier que le layout dashboard a bien `h-svh overflow-hidden` en racine, `min-h-0` sur SidebarInset et sur la div qui wrap `{children}`, et que la page elle-même a un wrapper `flex-1 min-h-0 overflow-hidden` avec le scroll uniquement dans le composant dédié.

### Metadata
- Related Files: `apps/web/src/components/ui/sidebar.tsx`, `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/chat/page.tsx`, `apps/web/src/components/chatbot.tsx`
- See also: sync page (même pattern), Conversation / StickToBottom (ai-elements)

---

## [LRN-20260227-001] correction — Timeline mobile (layout et UX)

**Logged**: 2026-02-27
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Écran Timeline mobile : zone vide inutile sous la grille, overlay redondant « Aucun événement ce jour », pas d’indicateur de jour au swipe horizontal.

### Details
- Grille en hauteur fixe 360 + ScrollView flex-1 avec titre/liste → sans events, grand vide en bas.
- Overlay centré sur la grille redondant ; swipe horizontal sans feedback de date.

### Suggested Action
Appliqué : Timeline en flex-1, header « Timeline — {currentDate} » avec `CalendarProvider.onDateChanged`, ScrollView liste uniquement si `events.length > 0`, suppression overlay, `numberOfDays: 1` et `scrollToNow`.

### Metadata
- Related Files: `apps/mobile/app/(tabs)/timeline.tsx`
- Voir aussi: `project/docs/self-improvement.md` (section Corrections récentes)

---

## [LRN-20260228-001] best_practice — Récupération et export des conversations Codex (extension openai.chatgpt)

**Logged**: 2026-02-28
**Priority**: high
**Status**: pending
**Area**: config / tooling

### Summary
Où sont stockées les convs de l’extension Codex, comment les exporter en markdown, et que la suppression des caches Cursor ne les touche pas.

### Details
- **Extension** : Codex = `openai.chatgpt` (displayName « Codex – OpenAI's coding agent »). Données **hors** Cursor : tout est dans `~/.codex/`.
- **Stockage** : `~/.codex/state_5.sqlite` (threads, jobs, logs), `~/.codex/archived_sessions/*.jsonl` (sessions archivées), `~/.codex/sessions/YYYY/MM/DD/*.jsonl` (sessions en cours). Une session « en cours » peut être modifiée jusqu’à la dernière utilisation (ex. session du 23 fév mise à jour le 28 fév).
- **Réparer le panneau** : supprimer uniquement `~/Library/Application Support/Cursor/Service Worker`, `Cache`, `Code Cache` — **aucun impact** sur `~/.codex/`. Corriger si besoin `~/.codex/config.toml` (TOML valide, pas de typo type `[mcp_servers.stiitch]` → `stitch`).
- **Export jsonl → markdown** : chaque ligne = JSON avec `type` (session_meta, response_item) et `payload`. Pour `response_item`, `payload.content` = liste de blocs `{ type: "input_text", text: "..." }`. Script d’extraction utilisé : parcourir les lignes, émettre `# Session`, `## User` / `## Assistant` et le texte extrait ; option de troncature au-delà de N caractères par bloc.

### Suggested Action
- Sauvegardes exportées dans `.cursor/codex-export-*.md` (ex. `codex-export-momentarise-2026-02-23-ongoing.md`).
- En cas de panneau Codex bloqué après reload : redémarrer Cursor → si besoin vider Service Worker / Cache / Code Cache (Cursor fermé), puis rouvrir.

### Metadata
- Related: `~/.codex/`, `.cursor/codex-export-*.md`
- Voir aussi: GitHub openai/codex #2923 (config.toml TOML vs JSON, caches webview)

---

## [LRN-20260228-002] product — Onboarding à définir

**Logged**: 2026-02-28
**Priority**: medium
**Status**: pending
**Area**: product / UX

### Summary
L’app nécessite une stratégie d’onboarding claire (étapes, contenu, moment d’apparition, conversion) pour éviter une première session confuse.

### Details
- Le login est en place mais aucun parcours guidé n’existe après l’auth.
- Risque: utilisateur sans contexte produit (Timeline/Inbox/Sync).

### Suggested Action
Définir un onboarding minimal (1–3 écrans) + checklist première action (ex: créer une capture, ouvrir Timeline) avant d’enrichir.

### Metadata
- Related Files: `apps/mobile/app/login.tsx`, `apps/mobile/app/(tabs)/today.tsx`
- See also: `project/docs/self-improvement.md`

---

## [LRN-20260228-003] correction — DateTimePicker manquant casse le bundling Expo

**Logged**: 2026-02-28
**Priority**: high
**Status**: pending
**Area**: mobile / build

### Summary
Le bundler Expo échoue si `@react-native-community/datetimepicker` n’est pas installé alors qu’il est importé (EventSheet).

### Details
- Erreur: `Unable to resolve "@react-native-community/datetimepicker"`.
- En environnement offline, `npx expo install` échoue si le registry npm est inaccessible.

### Suggested Action
Installer en online: `cd apps/mobile && npx expo install @react-native-community/datetimepicker`.
Prévoir un fallback si offline (picker simple sans dépendance native).

### Metadata
- Related Files: `apps/mobile/components/EventSheet.tsx`, `apps/mobile/package.json`
- See also: logs Expo (bundling failed)

---

## [LRN-20260228-004] best_practice — Guardrails de lane en multi-agents

**Logged**: 2026-02-28
**Priority**: high
**Status**: applied
**Area**: process / repo

### Summary
Quand plusieurs agents modifient Sync/Capture/InBox en parallèle, il faut un garde-fou automatique qui bloque les commits hors lane.

### Details
- Mise en place d’un check red-zone (`scripts/check-lane-boundary.mjs`) basé sur `git diff --name-only --cached`.
- Les fichiers hot-path Sync/Capture/InBox sont explicitement listés et bloquent le commit.
- Hook git local versionné: `.githooks/pre-commit` + activation via `git config core.hooksPath .githooks`.

### Suggested Action
Conserver la red-zone à jour selon les ownerships de sprint, et exiger `npm run lane:check` avant merge sur branche d’intégration.

### Metadata
- Related Files: `scripts/check-lane-boundary.mjs`, `.githooks/pre-commit`, `README.md`
