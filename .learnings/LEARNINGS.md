# LEARNINGS — Corrections, knowledge gaps, bonnes pratiques

Format : `## [LRN-YYYYMMDD-XXX] category` + Summary, Details, Suggested Action, Metadata.
Voir `project/docs/self-improvement.md` pour le détail des champs et la promotion vers CLAUDE.md / AGENTS.md.

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
