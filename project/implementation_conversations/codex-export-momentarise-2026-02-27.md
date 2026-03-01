# Session Codex — 019ca10e...
- **CWD:** /Users/andrewpougary/DevLocal/Momentarise
- **Source:** vscode | **Model:** openai

## 🤖 Assistant

<permissions instructions>
Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `workspace-write`: The sandbox permits reading files, and editing files in `cwd` and `writable_roots`. Editing files in other directories requires approval. Network access is restricted.
# Escalation Requests

Commands are run outside the sandbox if they are approved by the user, or match an existing rule that allows it to run unrestricted. The command string is split into independent command segments at shell control operators, including but not limited to:

- Pipes: |
- Logical operators: &&, ||
- Command separators: ;
- Subshell boundaries: (...), $(...)

Each resulting segment is evaluated independently for sandbox restrictions and approval requirements.

Example:

git pull | tee output.txt

This is treated as two command segments:

["git", "pull"]

["tee", "output.txt"]

## How to request escalation

IMPORTANT: To request approval to execute a command that will require escalated privileges:

- Provide the `sandbox_permissions` parameter with the value `"require_escalated"`
- Include a short question asking the user if they want to allow the action in `justification` parameter. e.g. "Do you want to download and install dependencies for this project?"
- Optionally suggest a `prefix_rule` - this will be shown to the user with an option to persist the rule approval for future sessions.

If you run a command that is important to solving the user's query, but it fails because of sandboxing, rerun the command with "require_escalated". ALWAYS proceed to use the `justification` parameter - do not message the user before requesting approval for the command.

## When to request escalation

While commands are running inside the sandbox, here are some scenarios that will require escalation outside the sandbox:

- You need to run a command that writes to a directory that requires it (e.g. running tests that write to /var)
- You need to run a GUI app (e.g., open/xdg-open/osascript) to open browsers or files.
- If you run a command that is important to solving the user's query, but it fails because of sandboxing, rerun the command with `require_escalated`. ALWAYS proceed to use the `sandbox_permissions` and `justification` parameters. do not message the user before requesting approval for the command.
- You are about to take a potentially destructive action such as an `rm` or `git reset` that the user did not explicitly ask for.
- Be judicious with escalating, but if completing the user's request requires it, you should do so - don't try and circumvent approvals by using other tools.

## prefix_rule guidance

When choosing a `prefix_rule`, request one that will allow you to fulfill similar requests from the user in the future without re-requesting escalation. It should be categorical and reasonably scoped to similar capabilities. You should rarely pass the entire command into `prefix_rule`.

### Banned prefix_rules 
Avoid requesting overly broad prefixes that the user would be ill-advised to approve. For example, do not request ["python3"], ["python", "-"], or other similar prefixes.
NEVER provide a prefix_rule argument for destructive commands like rm.
NEVER provide a prefix_rule if your command uses a heredoc or herestring. 

### Examples
Good examples of prefixes:
- ["npm", "run", "dev"]
- ["gh", "pr", "check"]
- ["pytest"]
- ["cargo", "test"]


## Approved command prefixes
The following prefix rules have already been approved: - ["uv", "run", "alembic"]
- ["npm", "install", "-w", "apps/web"]
- ["uv", "run", "python", "-m", "py_compile"]
- ["uv", "run", "python", "-m", "py_compile", "src/api/v1/events.py", "src/schemas/event.py", "src/api/v1/timeline.py"]
 The writable roots are `/Users/andrewpougary/DevLocal/Momentarise`, `/tmp`, `/var/folders/xp/79c4j665319310ccz81l_7mh0000gn/T`.
</permissions instructions>

---

## 👤 User

# AGENTS.md instructions for /Users/andrewpougary/DevLocal/Momentarise

<INSTRUCTIONS>
## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/andrewpougary/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/andrewpougary/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
</INSTRUCTIONS>

---

## 👤 User

<environment_context>
  <cwd>/Users/andrewpougary/DevLocal/Momentarise</cwd>
  <shell>zsh</shell>
</environment_context>

---

## 🤖 Assistant

<permissions instructions>
Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `workspace-write`: The sandbox permits reading files, and editing files in `cwd` and `writable_roots`. Editing files in other directories requires approval. Network access is restricted.
# Escalation Requests

Commands are run outside the sandbox if they are approved by the user, or match an existing rule that allows it to run unrestricted. The command string is split into independent command segments at shell control operators, including but not limited to:

- Pipes: |
- Logical operators: &&, ||
- Command separators: ;
- Subshell boundaries: (...), $(...)

Each resulting segment is evaluated independently for sandbox restrictions and approval requirements.

Example:

git pull | tee output.txt

This is treated as two command segments:

["git", "pull"]

["tee", "output.txt"]

## How to request escalation

IMPORTANT: To request approval to execute a command that will require escalated privileges:

- Provide the `sandbox_permissions` parameter with the value `"require_escalated"`
- Include a short question asking the user if they want to allow the action in `justification` parameter. e.g. "Do you want to download and install dependencies for this project?"
- Optionally suggest a `prefix_rule` - this will be shown to the user with an option to persist the rule approval for future sessions.

If you run a command that is important to solving the user's query, but it fails because of sandboxing, rerun the command with "require_escalated". ALWAYS proceed to use the `justification` parameter - do not message the user before requesting approval for the command.

## When to request escalation

While commands are running inside the sandbox, here are some scenarios that will require escalation outside the sandbox:

- You need to run a command that writes to a directory that requires it (e.g. running tests that write to /var)
- You need to run a GUI app (e.g., open/xdg-open/osascript) to open browsers or files.
- If you run a command that is important to solving the user's query, but it fails because of sandboxing, rerun the command with `require_escalated`. ALWAYS proceed to use the `sandbox_permissions` and `justification` parameters. do not message the user before requesting approval for the command.
- You are about to take a potentially destructive action such as an `rm` or `git reset` that the user did not explicitly ask for.
- Be judicious with escalating, but if completing the user's request requires it, you should do so - don't try and circumvent approvals by using other tools.

## prefix_rule guidance

When choosing a `prefix_rule`, request one that will allow you to fulfill similar requests from the user in the future without re-requesting escalation. It should be categorical and reasonably scoped to similar capabilities. You should rarely pass the entire command into `prefix_rule`.

### Banned prefix_rules 
Avoid requesting overly broad prefixes that the user would be ill-advised to approve. For example, do not request ["python3"], ["python", "-"], or other similar prefixes.
NEVER provide a prefix_rule argument for destructive commands like rm.
NEVER provide a prefix_rule if your command uses a heredoc or herestring. 

### Examples
Good examples of prefixes:
- ["npm", "run", "dev"]
- ["gh", "pr", "check"]
- ["pytest"]
- ["cargo", "test"]


## Approved command prefixes
The following prefix rules have already been approved: - ["uv", "run", "alembic"]
- ["npm", "install", "-w", "apps/web"]
- ["uv", "run", "python", "-m", "py_compile"]
- ["uv", "run", "python", "-m", "py_compile", "src/api/v1/events.py", "src/schemas/event.py", "src/api/v1/timeline.py"]
 The writable roots are `/Users/andrewpougary/DevLocal/Momentarise`, `/Users/andrewpougary/DevLocal/Momentarise`, `/tmp`, `/var/folders/xp/79c4j665319310ccz81l_7mh0000gn/T`.
</permissions instructions>

---

## 🤖 Assistant

<collaboration_mode># Collaboration Mode: Default

You are now in Default mode. Any previous instructions for other modes (e.g. Plan mode) are no longer active.

Your active mode changes only when new developer instructions with a different `<collaboration_mode>...</collaboration_mode>` change it; user requests or tool descriptions do not change mode by themselves. Known mode names are Default and Plan.

## request_user_input availability

The `request_user_input` tool is unavailable in Default mode. If you call it while in Default mode, it will return an error.

If a decision is necessary and cannot be discovered from local context, ask the user directly. However, in Default mode you should strongly prefer executing the user's request rather than stopping to ask questions.
</collaboration_mode>

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- ColorPaletteSelector.tsx: /Users/andrewpougary/Desktop/Projets Dev/nextjslive-transcription/components/ColorPaletteSelector.tsx
- tailwind.config.js: apps/mobile/tailwind.config.js
- layout.tsx: /Users/andrewpougary/Desktop/Projets Dev/nextjslive-transcription/app/home/layout.tsx
- README.md: /Users/andrewpougary/Desktop/Projets Dev/nextjslive-transcription/Documentation/README.md
- self-improvement.mdc: .cursor/rules/self-improvement.mdc

## My request for Codex:
avis approfondie sur le dossier AI_chat_interface ou truc du genre.

---

## 🤖 Assistant

Je vais faire une revue technique approfondie du dossier `AI_chat_interface` (ou son équivalent si le nom diffère), en commençant par localiser le répertoire puis en auditant code, architecture, risques et tests. Ensuite je te rends un avis structuré avec priorités de correction.

---

## 🤖 Assistant

J’ai trouvé le dossier ciblé ici: `project/inbox_raw/AI_Chat_interface`. Je vais maintenant auditer les fichiers critiques (API `app/api/chat/route.ts`, pages, composants chat, config) puis te donner une revue de type code-review avec risques classés par sévérité et références de lignes.

---

## 🤖 Assistant

Je passe sur les composants fonctionnels (`composer`, `message-list`, rendu markdown, bulle message) pour vérifier les risques runtime, UX cassée et points sécurité/perf.

---

## 🤖 Assistant

Je viens d’identifier plusieurs points suspects (notamment le parsing markdown et la gestion des retries). Je vérifie maintenant la config TypeScript/Next et les composants d’animation pour confirmer l’impact réel.

---

## 🤖 Assistant

Je confirme déjà un souci critique: la config Next ignore les erreurs TypeScript (`ignoreBuildErrors: true`), ce qui peut masquer des bugs en prod. Je lance une vérification rapide de build/typecheck dans ce dossier pour valider les points bloquants concrets.

---

## 🤖 Assistant

Je n’ai pas de README dans ce sous-dossier, donc je continue en audit “code-first” et je vais aussi vérifier l’API pour les points de sécurité/coût (absence de rate-limit, validation d’input, gestion image/base64).

---

## 🤖 Assistant

J’ai fini l’audit statique et j’ai confirmé des problèmes fonctionnels/sécurité concrets. Je prépare maintenant un retour structuré “findings d’abord” avec sévérité, références de lignes et plan d’action priorisé.

---

## 🤖 Assistant

**Findings (priorisés)**

1. `Élevé` API chat exposée sans garde-fous coût/sécurité.  
Pas d’auth, pas de rate-limit, et `model` est piloté par le client. Un appel direct à `/api/chat` peut être abusé pour brûler du crédit.  
Références: [route.ts:9](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/app/api/chat/route.ts:9), [route.ts:11](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/app/api/chat/route.ts:11), [route.ts:20](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/app/api/chat/route.ts:20)

2. `Élevé` Aucune limite de taille/volume sur les payloads (texte + image base64).  
Le serveur accepte des `messages` sans validation stricte; le client peut envoyer des images lourdes en base64 + historique complet, puis les persister en `localStorage`. Risque DoS/perf/coût.  
Références: [route.ts:11](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/app/api/chat/route.ts:11), [route.ts:74](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/app/api/chat/route.ts:74), [composer.tsx:185](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/composer.tsx:185), [chat-shell.tsx:61](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/chat-shell.tsx:61), [chat-shell.tsx:107](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/chat-shell.tsx:107)

3. `Élevé` Bug de retry: duplication potentielle du dernier message user (closure stale).  
`retry()` tronque l’état puis rappelle `sendMessage`, mais `sendMessage` utilise le `messages` capturé avant `setMessages`, ce qui peut renvoyer un contexte incorrect/dupliqué.  
Références: [chat-shell.tsx:163](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/chat-shell.tsx:163), [chat-shell.tsx:168](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/chat-shell.tsx:168), [chat-shell.tsx:170](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/chat-shell.tsx:170), [chat-shell.tsx:94](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/chat-shell.tsx:94), [chat-shell.tsx:108](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/chat-shell.tsx:108)

4. `Moyen` Parsing markdown des liens cassé.  
La regex de lien est invalide (`$$` au lieu de `\(` `\)`), donc les liens ne seront pas rendus correctement.  
Références: [markdown-renderer.tsx:78](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/markdown-renderer.tsx:78), [markdown-renderer.tsx:165](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/markdown-renderer.tsx:165)

5. `Moyen` Risque de fuite micro/audio stream.  
`getUserMedia()` est lancé, mais l’arrêt des tracks est seulement dans un chemin manuel; `handleSend` et cleanup ne ferment pas systématiquement le stream.  
Références: [composer.tsx:133](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/composer.tsx:133), [composer.tsx:122](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/composer.tsx:122), [composer.tsx:156](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/composer.tsx:156), [composer.tsx:87](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/chat/composer.tsx:87)

6. `Moyen` Qualité release fragilisée: erreurs TS ignorées en build.  
`ignoreBuildErrors: true` peut laisser passer des regressions en prod.  
Référence: [next.config.mjs:3](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/next.config.mjs:3)

7. `Faible` Dette technique (duplication/fichiers non utilisés).  
Hooks dupliqués (`use-mobile`, `use-toast`) + `styles/globals.css` non importé.  
Références: [hooks/use-mobile.ts:1](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/hooks/use-mobile.ts:1), [components/ui/use-mobile.tsx:1](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/ui/use-mobile.tsx:1), [hooks/use-toast.ts:1](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/hooks/use-toast.ts:1), [components/ui/use-toast.ts:1](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/components/ui/use-toast.ts:1), [styles/globals.css](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface/styles/globals.css)

**Hypothèses / limites**
- Revue statique uniquement (pas d’exécution end-to-end).
- Je n’ai pas pu lancer `next build` dans ce sous-projet: binaire `next` absent dans cet environnement.

**Avis global**
Base UI bonne pour un prototype (structure `ChatShell`/`Composer`/`MessageList` claire), mais pas prête prod en l’état à cause des points 1-3.

1. Si tu veux, je peux te proposer un patch ciblé en priorité sur `auth + rate limit + validation Zod` côté API.  
2. Ensuite je peux corriger le bug de retry et la fuite micro.  
3. Puis nettoyer la dette (regex markdown, duplications, config build).

---

## 🤖 Assistant

<collaboration_mode># Plan Mode (Conversational)

You work in 3 phases, and you should *chat your way* to a great plan before finalizing it. A great plan is very detailed—intent- and implementation-wise—so that it can be handed to another engineer or agent to be implemented right away. It must be **decision complete**, where the implementer does not need to make any decisions.

## Mode rules (strict)

You are in **Plan Mode** until a developer message explicitly ends it.

Plan Mode is not changed by user intent, tone, or imperative language. If a user asks for execution while still in Plan Mode, treat it as a request to **plan the execution**, not perform it.

## Plan Mode vs update_plan tool

Plan Mode is a collaboration mode that can involve requesting user input and eventually issuing a `<proposed_plan>` block.

Separately, `update_plan` is a checklist/progress/TODOs tool; it does not enter or exit Plan Mode. Do not confuse it with Plan mode or try to use it while in Plan mode. If you try to use `update_plan` in Plan mode, it will return an error.

## Execution vs. mutation in Plan Mode

You may explore and execute **non-mutating** actions that improve the plan. You must not perform **mutating** actions.

### Allowed (non-mutating, plan-improving)

Actions that gather truth, reduce ambiguity, or validate feasibility without changing repo-tracked state. Examples:

* Reading or searching files, configs, schemas, types, manifests, and docs
* Static analysis, inspection, and repo exploration
* Dry-run style commands when they do not edit repo-tracked files
* Tests, builds, or checks that may write to caches or build artifacts (for example, `target/`, `.cache/`, or snapshots) so long as they do not edit repo-tracked files

### Not allowed (mutating, plan-executing)

Actions that implement the plan or change repo-tracked state. Examples:

* Editing or writing files
* Running formatters or linters that rewrite files
* Applying patches, migrations, or codegen that updates repo-tracked files
* Side-effectful commands whose purpose is to carry out the plan rather than refine it

When in doubt: if the action would reasonably be described as "doing the work" rather than "planning the work," do not do it.

## PHASE 1 — Ground in the environment (explore first, ask second)

Begin by grounding yourself in the actual environment. Eliminate unknowns in the prompt by discovering facts, not by asking the user. Resolve all questions that can be answered through exploration or inspection. Identify missing or ambiguous details only if they cannot be derived from the environment. Silent exploration between turns is allowed and encouraged.

Before asking the user any question, perform at least one targeted non-mutating exploration pass (for example: search relevant files, inspect likely entrypoints/configs, confirm current implementation shape), unless no local environment/repo is available.

Exception: you may ask clarifying questions about the user's prompt before exploring, ONLY if there are obvious ambiguities or contradictions in the prompt itself. However, if ambiguity might be resolved by exploring, always prefer exploring first.

Do not ask questions that can be answered from the repo or system (for example, "where is this struct?" or "which UI component should we use?" when exploration can make it clear). Only ask once you have exhausted reasonable non-mutating exploration.

## PHASE 2 — Intent chat (what they actually want)

* Keep asking until you can clearly state: goal + success criteria, audience, in/out of scope, constraints, current state, and the key preferences/tradeoffs.
* Bias toward questions over guessing: if any high-impact ambiguity remains, do NOT plan yet—ask.

## PHASE 3 — Implementation chat (what/how we’ll build)

* Once intent is stable, keep asking until the spec is decision complete: approach, interfaces (APIs/schemas/I/O), data flow, edge cases/failure modes, testing + acceptance criteria, rollout/monitoring, and any migrations/compat constraints.

## Asking questions

Critical rules:

* Strongly prefer using the `request_user_input` tool to ask any questions.
* Offer only meaningful multiple‑choice options; don’t include filler choices that are obviously wrong or irrelevant.
* In rare cases where an unavoidable, important question can’t be expressed with reasonable multiple‑choice options (due to extreme ambiguity), you may ask it directly without the tool.

You SHOULD ask many questions, but each question must:

* materially change the spec/plan, OR
* confirm/lock an assumption, OR
* choose between meaningful tradeoffs.
* not be answerable by non-mutating commands.

Use the `request_user_input` tool only for decisions that materially change the plan, for confirming important assumptions, or for information that cannot be discovered via non-mutating exploration.

## Two kinds of unknowns (treat differently)

1. **Discoverable facts** (repo/system truth): explore first.

   * Before asking, run targeted searches and check likely sources of truth (configs/manifests/entrypoints/schemas/types/constants).
   * Ask only if: multiple plausible candidates; nothing found but you need a missing identifier/context; or ambiguity is actually product intent.
   * If asking, present concrete candidates (paths/service names) + recommend one.
   * Never ask questions you can answer from your environment (e.g., “where is this struct”).

2. **Preferences/tradeoffs** (not discoverable): ask early.

   * These are intent or implementation preferences that cannot be derived from exploration.
   * Provide 2–4 mutually exclusive options + a recommended default.
   * If unanswered, proceed with the recommended option and record it as an assumption in the final plan.

## Finalization rule

Only output the final plan when it is decision complete and leaves no decisions to the implementer.

When you present the official plan, wrap it in a `<proposed_plan>` block so the client can render it specially:

1) The opening tag must be on its own line.
2) Start the plan content on the next line (no text on the same line as the tag).
3) The closing tag must be on its own line.
4) Use Markdown inside the block.
5) Keep the tags exactly as `<proposed_plan>` and `</proposed_plan>` (do not translate or rename them), even if the plan content is in another language.

Example:

<proposed_plan>
plan content
</proposed_plan>

plan content should be human and agent digestible. The final plan must be plan-only and include:

* A clear title
* A brief summary section
* Important changes or additions to public APIs/interfaces/types
* Test cases and scenarios
* Explicit assumptions and defaults chosen where needed

Do not ask "should I proceed?" in the final output. The user can easily switch out of Plan mode and request implementation if you have included a `<proposed_plan>` block in your response. Alternatively, they can decide to stay in Plan mode and continue refining the plan.

Only produce at most one `<proposed_plan>` block per turn, and only when you are presenting a complete spec.

If the user stays in Plan mode and asks for revisions after a prior `<proposed_plan>`, any new `<proposed_plan>` must be a complete replacement.
</collaboration_mode>

---

## 👤 User

# Context from my IDE setup:

## Active file: project/inbox_raw/conversation_codex_01.md

## Active selection of the file:
AI_
## Open tabs:
- conversation_codex_01.md: project/inbox_raw/conversation_codex_01.md

## My request for Codex:
1. Mets toi dans le contexte de l'app
2. lis ici [conversation_codex_01.md](project/inbox_raw/conversation_codex_01.md) ce dont on a parlé pour ai chat interface et sync
3. prépare un plan ultra détaillé pour une page /sync sur web et mobile, sachant que sur web j'hésite à construire un truc de 0 (ou en utilisant react native reusable et d'autres composant) et utiliser gifted chat avec un adapter.

---

## 🤖 Assistant

Je vais d’abord me remettre dans le contexte réel du repo (web, mobile, backend), puis lire `project/inbox_raw/conversation_codex_01.md` pour extraire précisément les décisions déjà prises sur `AI_chat_interface` et `sync`. Ensuite je te propose un plan décision-complet pour `/sync` web + mobile avec les deux options web cadrées proprement.

---

## 🤖 Assistant

J’ai confirmé que le repo a déjà une route web `/sync` et une page mobile `app/sync.tsx`, donc je vais lire leur état actuel ainsi que la suite de `conversation_codex_01.md` (au-delà de la ligne 260) pour intégrer exactement vos choix passés avant de te poser les questions de cadrage final.

---

## 🤖 Assistant

J’ai trouvé que `/sync` existe déjà en placeholder sur web et mobile. Je vais lire les fichiers de navigation/API (sidebar, BFF, i18n, route auth) et les passages “sync/chat interface” de la conversation pour sortir un plan compatible avec votre architecture actuelle.

---

## 🤖 Assistant

Je confirme que le fichier de conversation contient déjà un plan Sync très riche (API SSE, preview/apply/undo, LiteLLM, web `/sync`, mobile sans tab en V1). Je vais maintenant recouper avec les règles projet (`.cursor/rules`) et l’état réel du backend/web/mobile pour te livrer un plan ultra détaillé directement exécutable.

---

## 🤖 Assistant

Le contexte est clair maintenant: `/sync` est un stub sur web/mobile, aucun endpoint Sync n’existe encore, et vos échanges précédents verrouillaient déjà `web /sync dédié + mobile sans tab Sync en V1 + preview/apply/undo`.  
Pour finaliser un plan vraiment “decision-complete”, je te pose 3 choix d’architecture qui changent fortement l’implémentation.

---

## 🤖 Assistant

Parfait, je verrouille donc: `AI_Chat_interface` adapté sur web + `/sync` mobile hors tabs + backend ambitieux FastAPI + LiteLLM orienté “future openclaw”.  
Dernier arbitrage pour éviter toute ambiguïté: `Gifted Chat` côté mobile.

---

## 🤖 Assistant

Je verrouille ces choix dans le plan. Je fais une dernière passe sur les modèles backend (base mixins, conventions DB/migrations) pour que le plan inclue des schémas et endpoints exacts sans laisser de décisions techniques au moment de l’implémentation.

---

## 🤖 Assistant

<proposed_plan>
# Plan Ultra Détaillé — `/sync` Web + Mobile (AI_Chat_interface adapté, FastAPI + LiteLLM, architecture future “openclaw-like”)

## Résumé
1. On implémente une vraie surface Sync sur web et mobile, avec persistance serveur des runs, streaming, mode guidé, `preview -> apply -> undo`, et audit `AIChange`.
2. Décision UI web verrouillée: adapter le dossier `AI_Chat_interface` (pas copie brute du projet).
3. Décision UI mobile verrouillée: composants React Native custom + adapter interne (pas `react-native-gifted-chat` en V1).
4. Décision produit mobile verrouillée: page `/sync` dédiée hors tabs (accessible via hub create/deep links).
5. Décision backend verrouillée: FastAPI orchestrateur + LiteLLM dès V1, avec structure outillée extensible connecteurs.

## Contexte réel (état actuel)
1. Web `/sync` est un placeholder: [apps/web/src/app/%28dashboard%29/sync/page.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/app/%28dashboard%29/sync/page.tsx).
2. Mobile `/sync` est un placeholder: [apps/mobile/app/sync.tsx](/Users/andrewpougary/DevLocal/Momentarise/apps/mobile/app/sync.tsx).
3. Le proxy web actuel casse le streaming (JSON-only): [apps/web/src/lib/bff.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/lib/bff.ts).
4. Le backend n’a pas encore de routes Sync: [apps/api/src/main.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/main.py).
5. Le template de référence existe hors app principale: [project/inbox_raw/AI_Chat_interface](/Users/andrewpougary/DevLocal/Momentarise/project/inbox_raw/AI_Chat_interface).

## Décisions verrouillées (ce plan)
1. Web: adaptation sélective de `components/chat/*` du template, pas import global `components/ui/*`.
2. Mobile: UI custom NativeWind/RN avec adapter de messages/events partagé, pas Gifted Chat.
3. Streaming cross-platform: contrat d’événements unique, transport web SSE + transport mobile NDJSON (même payload d’événements).
4. V1 ambitieux: LiteLLM intégré dès le premier lot avec routing/fallback/coûts/quotas.
5. Human-in-the-loop strict: aucune mutation métier destructive sans `preview/apply`; `undo` obligatoire.
6. Scope connecteurs V1: architecture prête + tool registry stable, mais connecteurs externes en mode read-first progressif.

## Changements publics (API / types / interfaces)
### 1) API FastAPI (nouvelle surface `/api/v1/sync`)
| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/v1/sync/models` | Liste des modèles autorisés + capacités + modèle par défaut |
| `POST` | `/api/v1/sync/runs` | Crée un run (`free` ou `guided`) |
| `GET` | `/api/v1/sync/runs/{run_id}` | Récupère état complet du run |
| `POST` | `/api/v1/sync/runs/{run_id}/stream` | Streaming web (`text/event-stream`) |
| `POST` | `/api/v1/sync/runs/{run_id}/stream-ndjson` | Streaming mobile (`application/x-ndjson`) |
| `POST` | `/api/v1/sync/runs/{run_id}/answer` | Réponse à question guidée |
| `POST` | `/api/v1/sync/runs/{run_id}/apply` | Applique le draft courant (transactionnel) |
| `POST` | `/api/v1/sync/runs/{run_id}/undo` | Undo du dernier apply |
| `GET` | `/api/v1/sync/changes` | Feed audit des changements IA |

### 2) API web BFF (nouvelle surface `/api/sync`)
| Méthode | Route | Proxy vers |
|---|---|---|
| `GET` | `/api/sync/models` | `/api/v1/sync/models` |
| `POST` | `/api/sync/runs` | `/api/v1/sync/runs` |
| `GET` | `/api/sync/runs/[id]` | `/api/v1/sync/runs/{id}` |
| `POST` | `/api/sync/runs/[id]/stream` | `/api/v1/sync/runs/{id}/stream` |
| `POST` | `/api/sync/runs/[id]/answer` | `/api/v1/sync/runs/{id}/answer` |
| `POST` | `/api/sync/runs/[id]/apply` | `/api/v1/sync/runs/{id}/apply` |
| `POST` | `/api/sync/runs/[id]/undo` | `/api/v1/sync/runs/{id}/undo` |
| `GET` | `/api/sync/changes` | `/api/v1/sync/changes` |

### 3) Contrats TypeScript partagés (`@momentarise/shared`)
Ajouter `packages/shared/src/sync.ts` avec:
1. `syncModelSchema`, `syncRunSchema`, `syncMessageSchema`, `syncDraftSchema`, `syncPreviewSchema`, `syncApplySchema`, `syncUndoSchema`, `syncChangeSchema`.
2. `syncSseEventSchema` (union discriminée): `token | message | question | draft | preview | applied | usage | warning | error | done`.
3. `syncNdjsonEventSchema` identique au payload SSE.
4. Exporter depuis [packages/shared/src/index.ts](/Users/andrewpougary/DevLocal/Momentarise/packages/shared/src/index.ts).

## Modèle de données (backend)
Créer tables runtime IA:
1. `ai_runs`: `workspace_id`, `created_by_user_id`, `mode`, `status`, `selected_model`, `title`, `context_json`, `last_event_at`.
2. `ai_messages`: `run_id`, `seq`, `role`, `content_json`, `provider`, `model`, `usage_json`, `error_code`.
3. `ai_questions`: `run_id`, `seq`, `question_key`, `question_text`, `choices_json`, `answer_json`, `answered_at`.
4. `ai_drafts`: `run_id`, `version`, `summary`, `plan_json`, `preview_json`, `confidence`.
5. `ai_tool_calls`: `run_id`, `message_id`, `tool_name`, `args_json`, `result_json`, `status`, `latency_ms`, `requires_confirmation`.
6. `ai_usage_events`: `workspace_id`, `run_id`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost_estimate_usd`.
7. Réutiliser `ai_changes` existante pour audit final apply/undo: [apps/api/src/models/ai_change.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/models/ai_change.py).

## Architecture d’exécution (V1 ambitieux)
1. `Web/Mobile -> FastAPI Sync Orchestrator -> LiteLLM -> Providers`.
2. Le LLM ne mute jamais directement les entités métier.
3. Le LLM produit des intentions + propositions outillées.
4. Les tools internes exécutent en `preview` puis `apply` transactionnel sur confirmation.
5. Chaque apply écrit un `AIChange` avec `before_payload`, `after_payload`, `reason`, `undoable`.
6. `undo` restaure via payloads de changement et journalise l’opération.

## Plan d’implémentation détaillé (ordre exécutable)

### Phase 0 — Bootstrap contrats et garde-fous (J1)
1. Ajouter `sync.ts` dans shared + exports.
2. Ajouter validations strictes backend Pydantic correspondantes.
3. Définir limites V1: longueur prompt, taille contexte, max events par stream, max questions guidées.
4. Définir allowlist modèles et mapping capacités dans config.

Livrables:
- `packages/shared/src/sync.ts`.
- `apps/api/src/schemas/sync.py`.
- `apps/api/src/core/config.py` enrichi (clés LiteLLM/quotas).

### Phase 1 — Backend FastAPI Sync + LiteLLM (J2-J5)
1. Créer routeur `apps/api/src/api/v1/sync.py`.
2. Créer couche orchestration `apps/api/src/sync/orchestrator.py`.
3. Créer client LiteLLM `apps/api/src/sync/litellm_client.py`.
4. Créer registry outillage `apps/api/src/sync/tool_registry.py`.
5. Créer tools métier V1:
`item.create`, `item.update`, `event.create`, `event.update`, `event.start_tracking`, `event.stop_tracking`, `inbox.preview`, `inbox.apply`.
6. Implémenter streaming SSE + NDJSON avec même schéma d’événements.
7. Intégrer filtrage workspace sur toutes les lectures/écritures Sync (404 cross-tenant).
8. Écrire migration Alembic des nouvelles tables + index.

Livrables:
- [apps/api/src/main.py](/Users/andrewpougary/DevLocal/Momentarise/apps/api/src/main.py) mis à jour (include router sync).
- Nouvelle migration `apps/api/alembic/versions/*_add_sync_runtime_tables.py`.
- Tests API Sync.

### Phase 2 — BFF web streaming + JSON (J5-J6)
1. Ajouter helper `proxyWithAuthStream` qui forward `Response.body` sans `res.json()`.
2. Créer routes BFF `/api/sync/*`.
3. Ajouter gestion d’erreur streaming standardisée (`event:error` et fermeture propre).
4. Conserver `proxyWithAuth` actuel pour endpoints JSON.

Livrables:
- [apps/web/src/lib/bff.ts](/Users/andrewpougary/DevLocal/Momentarise/apps/web/src/lib/bff.ts) complété par fonction stream ou nouveau fichier `bff-stream.ts`.
- Nouveaux route handlers sous `apps/web/src/app/api/sync/`.

### Phase 3 — UI web `/sync` (AI_Chat_interface adapté) (J6-J9)
1. Copier uniquement les composants chat utiles vers `apps/web/src/components/sync-chat/`.
2. Adapter imports vers design system existant (`button`, `dropdown-menu`, `utils`) déjà présents.
3. S

... [tronqué, 5662 caractères restants]

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- conversation_codex_01.md: project/inbox_raw/conversation_codex_01.md
- Untitled: project/implementation_conversations/Untitled

## My request for Codex:
l'avis de chatgpt : """OK Andrew, on va le faire carré.

J’ai lu ton **PLAN.md**. Globalement : **très bon plan**, ambitieux, et surtout il met les bons garde-fous (streaming, persistance, audit, preview→apply→undo). Mais il manque 3 briques “OpenClaw-like” essentielles (prompt composer + tool gating + mémoire/retrieval) et il y a 2 choix techniques à risque (mobile NDJSON streaming, et BFF Next si tu maintiens “pas d’API routes Next”). 

---

## 1) Ce qui est excellent dans le plan (à garder)

### A) “Human-in-the-loop” strict : preview → apply → undo

C’est exactement la philosophie pro. Le LLM **ne doit jamais** muter tes entités métier directement ; il propose, tu prévisualises, l’utilisateur confirme, tu appliques transactionnel, tu peux undo, et tu log. Ton plan l’écrit explicitement. 

### B) Contrat d’événements unique (token/message/question/draft/preview/applied/…)

Très bon. Ça rend le chat guidé possible sans hacks UI, et tu peux partager le même “runtime” web+mobile. 

### C) Tables runtime IA (runs/messages/questions/drafts/tool_calls/usage)

Super. Tu rends Sync observable, rejouable, auditable, et prêt pour “openclaw-like” (et pour diagnostiquer les bugs). 

### D) LiteLLM dès V1 + quotas + flags

Ambitieux mais cohérent si tu veux un produit sérieux (coûts, fallback, rate limit). 

---

## 2) Les 2 points techniques qui risquent de te faire perdre du temps

### (1) Mobile : NDJSON streaming

Ton plan veut un transport mobile **NDJSON** pour avoir le même payload que SSE. Sur le papier c’est clean. En pratique, **React Native/Expo est souvent pénible avec le streaming `fetch`** (body stream pas fiable selon plateformes). Tu peux y arriver, mais c’est le genre de truc qui te fait “perdre 3 jours pour un détail”. 

**Recommandation franche :**

* **Web** : SSE (ou fetch streaming) OK
* **Mobile** : **WebSocket** (même schéma d’événements, autre transport)

Tu gardes le contrat `SyncEvent` identique, tu changes juste le tuyau. C’est le compromis “pro et stable”.

### (2) BFF Next (routes `/api/sync/*`)

Le plan introduit un BFF web qui proxy vers FastAPI, et précise que ton proxy actuel casse le streaming. C’est vrai. 
Mais attention : **ça contredit ton principe “Next = front only”** si tu veux rester strict.

**Deux options propres :**

1. **Strict “front-only”** : Next fait un `fetch` direct vers FastAPI + CORS OK (ou rewrites proxy au niveau Next config, sans logique)
2. **BFF minimal toléré** : Next a des route handlers uniquement comme “reverse proxy” (0 logique), et tu assumes que c’est acceptable

Choisis et verrouille. Le pire c’est d’hésiter et de refactor 2 fois.

---

## 3) Ce qui manque pour être vraiment “OpenClaw-like” (le cœur)

Ton plan est très “surface Sync + UI + streaming + apply/undo”. Il manque les 3 moteurs :

### A) Prompt Composer (modulaire + modes full/minimal/none)

Tu en as parlé, mais il n’est pas spécifié comme un module central.
Or c’est **LA** pièce qui rend possible :

* agent principal riche
* sous-agents légers
* skills/modes (content/admin/travel) sans réécrire Sync

**À ajouter dans la spec :**

* `sync/prompt_composer.py`

  * sections (identity, policies, user prefs, today snapshot, tools list, retrieved context, mode guided/free)
  * `prompt_mode: full|minimal|none` (pour sous-agents)
  * token budgeting + trimming (summary-first)

### B) Tool Registry + Policies (hard enforcement)

Ton plan crée `tool_registry.py` et des tools métier, mais il ne détaille pas assez le **gating** :

* qui autorise quel tool
* dans quel mode
* avec quelle confirmation
* avec quels prérequis (ex : apply uniquement si preview existe)

**À verrouiller :**

* un `ToolPolicyEngine` (code) qui tranche *avant* que le modèle voie les tools
* un `ToolExecutor` (code) qui refuse si policy non respectée
* `requires_confirm` systématique sur tout ce qui écrit

### C) Mémoire / retrieval / indexation Inbox (hybrid + metadata gating)

Tu demandes “comment indexer les captures inbox” : ton plan ne le traite pas encore. C’est normal (c’est une phase suivante), mais pour “omniscient”, c’est obligatoire.

**Minimum viable mémoire :**

* Artefacts texte (OCR/transcript/summary) stockés
* `search_text` + Postgres FTS (BM25-like via tsquery)
* plus tard : embeddings + hybrid search
* metadata gating dur : user_id, scope, tags, date, doc_type

Sans ça, “omniscient” = juste un prompt long qui hallucine.

---

## 4) Comment faire “un seul moteur” pour agent principal + sous-agents + skills

Tu as raison : ce n’est pas “plusieurs IA”, c’est **le même moteur** avec un **RunContext différent**.

### Le schéma mental

* **Sync Orchestrator** construit `RunContext`
* `PromptComposer(mode=full|minimal)` produit le system prompt
* Le **LLM** génère soit :

  * du texte (`delta`)
  * des tool calls
  * des events structurés (`question`, `draft`, `preview`)
* Le backend exécute tools + applique policies + log

### Un sous-agent, c’est juste :

* `prompt_mode="minimal"`
* un toolset plus petit
* un contexte ciblé (ex “content only”)
* une mission précise (“extraire fields facture”, “évaluer faisabilité plan”, etc.)

---

## 5) Pour quoi tu as VRAIMENT besoin de sous-agents (et pour quoi non)

### Très bons cas de sous-agents (quand tu veux scaler propre)

1. **Retriever** : “trouve les 8 meilleures sources inbox pour ce sujet” (hybrid search + rerank)
2. **Extractor** : “invoice → champs structurés + confiance + sources”
3. **Planner** : “objectif → plan_draft JSON”
4. **Verifier/Critic** : “check cohérence, contraintes, conflits calendaires, missing info → questions”
5. **Automation Builder** : “génère AutomationSpec draft” (activation = confirmation)

### Ce que je ferais rester au “main agent”

* la conversation avec l’utilisateur
* l’arbitrage final (“voilà le plan, tu valides ?”)
* la prise de décisions UX (quand poser une question vs proposer un draft)

### Pour le calendrier (important)

**Je ne ferais pas tout via LLM.**
La planification (créneaux, conflits, priorités, durées, trajets) est souvent meilleure avec un **algo déterministe** + LLM en couche “raisonnement”.
Ex : LLM propose des items + contraintes, puis un scheduler calcule une proposition de placement.

---

## 6) Comment traiter / indexer les captures Inbox (réponse directe à ta question)

### Pipeline V0 (simple et robuste)

1. `Resource` stocké (fichier/lien/texte)
2. `Artifact.extracted_text` via OCR/transcription si applicable
3. `Artifact.summary` (optionnel)
4. Index :

   * `search_text = extracted_text + title + summary`
   * Postgres FTS sur `search_text`
   * metadata (tags, doc_type, date, source)

### Pipeline V1/V2 (omniscient)

5. embeddings sur chunks (vector)
6. retrieval hybride :

   * filtre metadata
   * top-k FTS + top-k vector
   * rerank léger
7. injection context :

   * snippets courts + provenance (resource_id, page/offset)

---

## 7) Mon avis global sur ton plan (ce qui va / ne va pas)

### Ça va (tu peux avancer)

* API surface `/sync` très complète
* tables runtime IA solides
* streaming + mode guidé + apply/undo + audit
* “tool registry” prévu
* hardening/quotas/flags prévus 

### À corriger / préciser avant de coder trop loin

1. **Transport mobile** : passe en **WebSocket** (ou prépare un fallback)
2. **BFF Next** : décider si “front-only strict” ou “proxy minimal”
3. Ajouter **PromptComposer** (module central) + prompt modes
4. Ajouter **Memory/Retrieval** (au moins FTS + metadata gating)
5. Clarifier la frontière “LLM vs scheduler déterministe” pour le calendrier

---

## Ce que je te conseille comme ordre de build (ultra pragmatique)

1. **Sync Run + streaming** (texte seulement) + persistance runs/messages
2. **PromptComposer** minimal + tools list “read-only”
3. **Guided questions** (`question`) + `PlanDraft` JSON
4. **Preview → Apply → Undo**

... [tronqué, 5969 caractères restants]

---

## 🤖 Assistant

Ton retour ChatGPT est globalement juste, et il améliore réellement le plan sur 5 points critiques: `PromptComposer`, `ToolPolicyEngine`, `Memory/Retrieval`, transport mobile, et frontière stricte du BFF.  
Je te propose de verrouiller 3 arbitrages d’architecture pour que je te renvoie une version finale du plan sans aucune zone grise.

---

## 🤖 Assistant

<proposed_plan>
# Plan v2 — `/sync` Web + Mobile avec BFF Next, FastAPI + LiteLLM, socle agents/automations

## Résumé
1. On garde le cap actuel: Next reste BFF web “comme aujourd’hui”, FastAPI garde toute la logique métier, LiteLLM est intégré dès V1.
2. On corrige les manques “openclaw-like”: `PromptComposer`, `ToolPolicyEngine`, `ToolExecutor`, mémoire/retrieval.
3. On verrouille le transport: Web en SSE via BFF, Mobile en WebSocket direct FastAPI avec le même contrat d’événements.
4. On livre le socle `AgentProfile + AutomationSpec` en DB/API dès V1, avec UI builder complète repoussée à V1.5.
5. On conserve le design web cible via adaptation sélective de `AI_Chat_interface`, sans merge global du template.

## Décisions verrouillées
1. Web `/sync`: adaptation des composants `AI_Chat_interface` dans le design system `apps/web`, pas de copie du projet template entier.
2. Mobile `/sync`: écran dédié hors tabs, UI custom React Native + adapter interne, pas `react-native-gifted-chat`.
3. BFF Next: même philosophie qu’actuellement.
Ligne retenue: BFF gère session/cookie/auth forwarding/stream forwarding/rate-limit léger, aucune logique métier Sync.
4. Streaming: `SSE` pour web, `WebSocket` pour mobile.
5. Sécurité produit: `preview -> apply -> undo` obligatoire pour toute écriture métier IA.
6. Runtime: orchestrateur unique (pas “plusieurs IA”), avec profils d’agent qui modulent prompt/tools/memory scope.

## Architecture cible
1. Flux web: Browser -> Next BFF -> FastAPI Sync -> LiteLLM -> Provider.
2. Flux mobile: Expo app -> FastAPI Sync (HTTP + WebSocket) -> LiteLLM -> Provider.
3. Exécution tool: LLM propose -> Policy engine autorise/refuse -> Tool executor produit preview -> User confirme apply -> Transaction + AIChange -> Undo possible.
4. Planification calendrier: LLM propose contraintes et options, scheduler déterministe calcule le placement final.

## Changements API / interfaces publiques

### FastAPI (`/api/v1/sync`)
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/models` | Modèles disponibles + capacités + default |
| POST | `/runs` | Création run (`free` ou `guided`) |
| GET | `/runs/{run_id}` | État complet run |
| POST | `/runs/{run_id}/stream` | SSE web |
| POST | `/runs/{run_id}/answer` | Réponse question guidée |
| POST | `/runs/{run_id}/apply` | Apply transactionnel |
| POST | `/runs/{run_id}/undo` | Undo dernier apply |
| GET | `/changes` | Feed audit IA |
| POST | `/runs/{run_id}/ws-token` | Token court pour WS mobile |
| WS | `/runs/{run_id}/ws?token=...` | Stream mobile |

### BFF web (`/api/sync`)
| Méthode | Route | Proxy |
|---|---|---|
| GET | `/api/sync/models` | `/api/v1/sync/models` |
| POST | `/api/sync/runs` | `/api/v1/sync/runs` |
| GET | `/api/sync/runs/[id]` | `/api/v1/sync/runs/{id}` |
| POST | `/api/sync/runs/[id]/stream` | `/api/v1/sync/runs/{id}/stream` |
| POST | `/api/sync/runs/[id]/answer` | `/api/v1/sync/runs/{id}/answer` |
| POST | `/api/sync/runs/[id]/apply` | `/api/v1/sync/runs/{id}/apply` |
| POST | `/api/sync/runs/[id]/undo` | `/api/v1/sync/runs/{id}/undo` |
| GET | `/api/sync/changes` | `/api/v1/sync/changes` |

### Contrats partagés `@momentarise/shared`
1. Ajouter `sync.ts` avec:
`syncRun`, `syncMessage`, `syncQuestion`, `syncDraft`, `syncPreview`, `syncApply`, `syncUndo`, `syncChange`, `syncModel`.
2. Ajouter `syncEvent` union discriminée:
`token`, `message`, `question`, `draft`, `preview`, `applied`, `usage`, `warning`, `error`, `done`.
3. Web SSE et Mobile WS transportent exactement ce même payload `syncEvent`.

## Modèle de données V1

### Runtime Sync
1. `ai_runs`
2. `ai_messages`
3. `ai_questions`
4. `ai_drafts`
5. `ai_tool_calls`
6. `ai_usage_events`

### Mémoire / retrieval V1
1. `sync_memory_docs` (source canonique textuelle + metadata + workspace_id).
2. `sync_memory_chunks` (chunks + `search_tsv` pour FTS + provenance).

### Socle agents/automations V1
1. `agent_profiles` (`origin=system|user|template`, `prompt_mode`, `tool_policy_json`, `memory_scope_json`, `is_default`).
2. `agent_profile_versions` (versioning/rollback).
3. `automation_specs` (JSON spec, `status=draft|active|paused`, `requires_confirm`).
4. `automation_runs` (exécutions + statut + erreurs).

### Audit
1. Réutiliser `ai_changes` existant pour tous les apply/undo Sync.

## Modules backend à créer (décision complète)
1. `apps/api/src/api/v1/sync.py` pour les endpoints Sync.
2. `apps/api/src/schemas/sync.py` pour contrats Pydantic.
3. `apps/api/src/sync/orchestrator.py` pour l’orchestration run.
4. `apps/api/src/sync/prompt_composer.py` pour la composition de prompt.
5. `apps/api/src/sync/tool_registry.py` pour catalogue des tools.
6. `apps/api/src/sync/tool_policy.py` pour enforcement pré-exécution.
7. `apps/api/src/sync/tool_executor.py` pour preview/apply/undo.
8. `apps/api/src/sync/retrieval.py` pour FTS + sélection snippets.
9. `apps/api/src/sync/litellm_client.py` pour routing/fallback provider.
10. `apps/api/src/sync/ws_auth.py` pour token WS court.

## Spécification `PromptComposer` (module central)
1. Entrées: `agent_profile`, `run_mode`, `workspace context`, `user prefs`, `today/timeline snapshot`, `retrieved snippets`, `toolset`.
2. Modes: `full`, `minimal`, `none`.
3. Politique token budget: priorité à summary + snippets courts + trim déterministe.
4. Sortie: prompt structuré stable versionné pour debug/replay.
5. Contrat explicite: un sous-agent = même moteur, `prompt_mode` et `toolset` réduits.

## Spécification Tool gating (hard enforcement)
1. `ToolPolicyEngine` décide quels tools sont exposés par run:
intersection de policy agent + plan utilisateur + connecteurs disponibles + contexte runtime.
2. `ToolExecutor` refuse toute écriture sans preview préalable.
3. Toute action `write` impose `requires_confirm=true`.
4. `apply` exige un `preview_id` valide et non expiré.
5. `undo` exige `AIChange` undoable.

## Spécification mémoire/retrieval V1
1. Ingestion: capturer texte depuis Inbox/Item/Event et normaliser dans `sync_memory_docs`.
2. Indexation: chunking + FTS Postgres (`tsvector`) dans `sync_memory_chunks`.
3. Recherche: filtre metadata dur (`workspace_id`, scopes, tags, date range) puis ranking FTS.
4. Injection prompt: snippets courts avec provenance (`doc_id`, `source_type`, `offset`).
5. V1.5: ajout embeddings + hybrid retrieval/rerank sans casser l’API.

## Implémentation Web `/sync`
1. Créer `apps/web/src/components/sync-chat/*` depuis les composants chat du template.
2. Corriger au passage les défauts connus du template lors de l’adaptation.
3. Isoler le style chat dans un fichier scoped `sync-chat.css`, sans override global de `globals.css`.
4. Ajouter hooks web:
`useSyncRun`, `useSyncSse`, `useSyncApply`, `useSyncUndo`, `useSyncChanges`.
5. UI finale:
thread, quick replies guidées, draft card, preview panel, actions apply/undo, changelog panel.

## Implémentation Mobile `/sync`
1. Remplacer le placeholder par écran complet conversationnel.
2. Ajouter hooks mobile:
`useSyncRun`, `useSyncWs`, `useSyncApply`, `useSyncUndo`.
3. Transport WS:
`POST /ws-token` puis connexion `wss://.../ws?token=...`.
4. Garder le même `syncEvent` que web.
5. Garder entrée hors tabs via route `/sync` et points d’entrée existants.

## Socle Agent Builder + Automation Builder (V1 sans UI complète)

### API AgentProfile
1. `GET /api/v1/sync/agents`
2. `POST /api/v1/sync/agents`
3. `GET /api/v1/sync/agents/{agent_id}`
4. `PATCH /api/v1/sync/agents/{agent_id}`
5. `POST /api/v1/sync/agents/{agent_id}/versions/publish`

### API AutomationSpec
1. `GET /api/v1/sync/automations`
2. `POST /api/v1/sync/automations` (création draft)
3. `PATCH /api/v1/sync/automations/{id}`
4. `POST /api/v1/sync/automations/{id}/validate`
5. `POST /api/v1/sync/automations/{id}/activate` (confirmation explicite)
6. `POST /api/v1/sync/automations/{id}/pause`

## Roadmap de livraison (gates)

### Gate A
1. Shared `sync.ts` + schémas backend + migrations runtime.
2. Endpoints JSON runs/models/changes opérationnels.

### Gate B
1. LiteLLM intégré avec allo

... [tronqué, 1722 caractères restants]

---

## 🤖 Assistant

<collaboration_mode># Collaboration Mode: Default

You are now in Default mode. Any previous instructions for other modes (e.g. Plan mode) are no longer active.

Your active mode changes only when new developer instructions with a different `<collaboration_mode>...</collaboration_mode>` change it; user requests or tool descriptions do not change mode by themselves. Known mode names are Default and Plan.

## request_user_input availability

The `request_user_input` tool is unavailable in Default mode. If you call it while in Default mode, it will return an error.

If a decision is necessary and cannot be discovered from local context, ask the user directly. However, in Default mode you should strongly prefer executing the user's request rather than stopping to ask questions.
</collaboration_mode>

---

## 👤 User

# Context from my IDE setup:

## Active file: apps/mobile/app/(tabs)/me.tsx

## Open tabs:
- me.tsx: apps/mobile/app/(tabs)/me.tsx
- conversation_codex_01.md: project/inbox_raw/conversation_codex_01.md
- Untitled: project/implementation_conversations/Untitled

## My request for Codex:
PLEASE IMPLEMENT THIS PLAN:
# Plan v2 — `/sync` Web + Mobile avec BFF Next, FastAPI + LiteLLM, socle agents/automations

## Résumé
1. On garde le cap actuel: Next reste BFF web “comme aujourd’hui”, FastAPI garde toute la logique métier, LiteLLM est intégré dès V1.
2. On corrige les manques “openclaw-like”: `PromptComposer`, `ToolPolicyEngine`, `ToolExecutor`, mémoire/retrieval.
3. On verrouille le transport: Web en SSE via BFF, Mobile en WebSocket direct FastAPI avec le même contrat d’événements.
4. On livre le socle `AgentProfile + AutomationSpec` en DB/API dès V1, avec UI builder complète repoussée à V1.5.
5. On conserve le design web cible via adaptation sélective de `AI_Chat_interface`, sans merge global du template.

## Décisions verrouillées
1. Web `/sync`: adaptation des composants `AI_Chat_interface` dans le design system `apps/web`, pas de copie du projet template entier.
2. Mobile `/sync`: écran dédié hors tabs, UI custom React Native + adapter interne, pas `react-native-gifted-chat`.
3. BFF Next: même philosophie qu’actuellement.
Ligne retenue: BFF gère session/cookie/auth forwarding/stream forwarding/rate-limit léger, aucune logique métier Sync.
4. Streaming: `SSE` pour web, `WebSocket` pour mobile.
5. Sécurité produit: `preview -> apply -> undo` obligatoire pour toute écriture métier IA.
6. Runtime: orchestrateur unique (pas “plusieurs IA”), avec profils d’agent qui modulent prompt/tools/memory scope.

## Architecture cible
1. Flux web: Browser -> Next BFF -> FastAPI Sync -> LiteLLM -> Provider.
2. Flux mobile: Expo app -> FastAPI Sync (HTTP + WebSocket) -> LiteLLM -> Provider.
3. Exécution tool: LLM propose -> Policy engine autorise/refuse -> Tool executor produit preview -> User confirme apply -> Transaction + AIChange -> Undo possible.
4. Planification calendrier: LLM propose contraintes et options, scheduler déterministe calcule le placement final.

## Changements API / interfaces publiques

### FastAPI (`/api/v1/sync`)
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/models` | Modèles disponibles + capacités + default |
| POST | `/runs` | Création run (`free` ou `guided`) |
| GET | `/runs/{run_id}` | État complet run |
| POST | `/runs/{run_id}/stream` | SSE web |
| POST | `/runs/{run_id}/answer` | Réponse question guidée |
| POST | `/runs/{run_id}/apply` | Apply transactionnel |
| POST | `/runs/{run_id}/undo` | Undo dernier apply |
| GET | `/changes` | Feed audit IA |
| POST | `/runs/{run_id}/ws-token` | Token court pour WS mobile |
| WS | `/runs/{run_id}/ws?token=...` | Stream mobile |

### BFF web (`/api/sync`)
| Méthode | Route | Proxy |
|---|---|---|
| GET | `/api/sync/models` | `/api/v1/sync/models` |
| POST | `/api/sync/runs` | `/api/v1/sync/runs` |
| GET | `/api/sync/runs/[id]` | `/api/v1/sync/runs/{id}` |
| POST | `/api/sync/runs/[id]/stream` | `/api/v1/sync/runs/{id}/stream` |
| POST | `/api/sync/runs/[id]/answer` | `/api/v1/sync/runs/{id}/answer` |
| POST | `/api/sync/runs/[id]/apply` | `/api/v1/sync/runs/{id}/apply` |
| POST | `/api/sync/runs/[id]/undo` | `/api/v1/sync/runs/{id}/undo` |
| GET | `/api/sync/changes` | `/api/v1/sync/changes` |

### Contrats partagés `@momentarise/shared`
1. Ajouter `sync.ts` avec:
`syncRun`, `syncMessage`, `syncQuestion`, `syncDraft`, `syncPreview`, `syncApply`, `syncUndo`, `syncChange`, `syncModel`.
2. Ajouter `syncEvent` union discriminée:
`token`, `message`, `question`, `draft`, `preview`, `applied`, `usage`, `warning`, `error`, `done`.
3. Web SSE et Mobile WS transportent exactement ce même payload `syncEvent`.

## Modèle de données V1

### Runtime Sync
1. `ai_runs`
2. `ai_messages`
3. `ai_questions`
4. `ai_drafts`
5. `ai_tool_calls`
6. `ai_usage_events`

### Mémoire / retrieval V1
1. `sync_memory_docs` (source canonique textuelle + metadata + workspace_id).
2. `sync_memory_chunks` (chunks + `search_tsv` pour FTS + provenance).

### Socle agents/automations V1
1. `agent_profiles` (`origin=system|user|template`, `prompt_mode`, `tool_policy_json`, `memory_scope_json`, `is_default`).
2. `agent_profile_versions` (versioning/rollback).
3. `automation_specs` (JSON spec, `status=draft|active|paused`, `requires_confirm`).
4. `automation_runs` (exécutions + statut + erreurs).

### Audit
1. Réutiliser `ai_changes` existant pour tous les apply/undo Sync.

## Modules backend à créer (décision complète)
1. `apps/api/src/api/v1/sync.py` pour les endpoints Sync.
2. `apps/api/src/schemas/sync.py` pour contrats Pydantic.
3. `apps/api/src/sync/orchestrator.py` pour l’orchestration run.
4. `apps/api/src/sync/prompt_composer.py` pour la composition de prompt.
5. `apps/api/src/sync/tool_registry.py` pour catalogue des tools.
6. `apps/api/src/sync/tool_policy.py` pour enforcement pré-exécution.
7. `apps/api/src/sync/tool_executor.py` pour preview/apply/undo.
8. `apps/api/src/sync/retrieval.py` pour FTS + sélection snippets.
9. `apps/api/src/sync/litellm_client.py` pour routing/fallback provider.
10. `apps/api/src/sync/ws_auth.py` pour token WS court.

## Spécification `PromptComposer` (module central)
1. Entrées: `agent_profile`, `run_mode`, `workspace context`, `user prefs`, `today/timeline snapshot`, `retrieved snippets`, `toolset`.
2. Modes: `full`, `minimal`, `none`.
3. Politique token budget: priorité à summary + snippets courts + trim déterministe.
4. Sortie: prompt structuré stable versionné pour debug/replay.
5. Contrat explicite: un sous-agent = même moteur, `prompt_mode` et `toolset` réduits.

## Spécification Tool gating (hard enforcement)
1. `ToolPolicyEngine` décide quels tools sont exposés par run:
intersection de policy agent + plan utilisateur + connecteurs disponibles + contexte runtime.
2. `ToolExecutor` refuse toute écriture sans preview préalable.
3. Toute action `write` impose `requires_confirm=true`.
4. `apply` exige un `preview_id` valide et non expiré.
5. `undo` exige `AIChange` undoable.

## Spécification mémoire/retrieval V1
1. Ingestion: capturer texte depuis Inbox/Item/Event et normaliser dans `sync_memory_docs`.
2. Indexation: chunking + FTS Postgres (`tsvector`) dans `sync_memory_chunks`.
3. Recherche: filtre metadata dur (`workspace_id`, scopes, tags, date range) puis ranking FTS.
4. Injection prompt: snippets courts avec provenance (`doc_id`, `source_type`, `offset`).
5. V1.5: ajout embeddings + hybrid retrieval/rerank sans casser l’API.

## Implémentation Web `/sync`
1. Créer `apps/web/src/components/sync-chat/*` depuis les composants chat du template.
2. Corriger au passage les défauts connus du template lors de l’adaptation.
3. Isoler le style chat dans un fichier scoped `sync-chat.css`, sans override global de `globals.css`.
4. Ajouter hooks web:
`useSyncRun`, `useSyncSse`, `useSyncApply`, `useSyncUndo`, `useSyncChanges`.
5. UI finale:
thread, quick replies guidées, draft card, preview panel, actions apply/undo, changelog panel.

## Implémentation Mobile `/sync`
1. Remplacer le placeholder par écran complet conversationnel.
2. Ajouter hooks mobile:
`useSyncRun`, `useSyncWs`, `useSyncApply`, `useSyncUndo`.
3. Transport WS:
`POST /ws-token` puis connexion `wss://.../ws?token=...`.
4. Garder le même `syncEvent` que web.
5. Garder entrée hors tabs via route `/sync` et points d’entrée existants.

## Socle Agent Builder + Automation Builder (V1 sans UI complète)

### API AgentProfile
1. `GET /api/v1/sync/agents`
2. `POST /api/v1/sync/agents`
3. `GET /api/v1/sync/agents/{agent_id}`
4. `PATCH /api/v1/sync/agents/{agent_id}`
5. `POST /api/v1/sync/agents/{agent_id}/versions/publish`

### API AutomationSpec
1. `GET /api/v1/sync/automations`
2. `POST /api/v1/sync/automations` (création draft)
3. `PATCH /api/v1/sync/automations/{id}`
4. `POST /api/v1/sync/automations/{id}/validate`
5. `POST /api/v1/syn

... [tronqué, 2003 caractères restants]

---

## 👤 User

<turn_aborted>
The user interrupted the previous turn on purpose. Any running unified exec processes were terminated. If any tools/commands were aborted, they may have partially executed; verify current state before retrying.
</turn_aborted>

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- me.tsx: apps/mobile/app/(tabs)/me.tsx
- conversation_codex_01.md: project/inbox_raw/conversation_codex_01.md
- Untitled: project/implementation_conversations/Untitled

## My request for Codex:
l'avis de chatgpt : """OK. Ce **plan v2** est franchement solide : il ressemble enfin à un “OpenClaw in-app” **réaliste** (cage produit + runtime + logs + policies), sans te faire partir dans un délire OS. Et oui, j’ai bien compris le point clé : **users peuvent créer leurs agents (AgentProfiles = skills)** et **leurs automations (AutomationSpecs)**, même si l’UI builder complète vient plus tard.

Je te fais une revue “ce qui est très bon / ce qui doit être corrigé / ce qui manque”.

---

## Ce qui est excellent (à garder tel quel)

1. **Transport verrouillé**
   Web = SSE via BFF, Mobile = WS direct FastAPI, même `syncEvent`. C’est le bon compromis stabilité/UX.

2. **Sécurité produit**
   `preview → apply → undo` obligatoire. C’est LE garde-fou qui te permet d’être “ultra puissant” sans perdre la confiance.

3. **Un seul moteur, plusieurs profils**
   “Orchestrateur unique + AgentProfile qui module prompt/tools/memory” = exactement la bonne architecture (skills sans multiplier les IA).

4. **Séparation des responsabilités**
   BFF Next = session/cookie/forwarding ; FastAPI = logique métier ; LiteLLM = gateway providers. Propre.

5. **Scheduler déterministe pour le calendrier**
   Très bon : le LLM propose contraintes/options, et ton algo place. Sinon tu vas souffrir.

---

## Les 5 corrections importantes (sinon tu vas te prendre des murs)

### 1) SSE en `POST /stream` : OK seulement si tu utilises `fetch` streaming

* Si tu veux utiliser `EventSource` côté web, c’est **GET** only (pas de body, headers limités).
* Si tu fais `fetch()` + lecture du stream, **POST** est possible (et pratique pour envoyer un payload).

✅ Décision à figer :

* **Web UI** utilise `fetch` streaming → `POST /stream` OK
  OU
* Web UI utilise `EventSource` → passe `/stream` en `GET` et mets le contexte ailleurs (run déjà créé, cookies auth).

### 2) Il te manque une notion de **séquence d’événements** (reconnexion/replay)

Pour que reload web + réseau mobile soient fiables, chaque `syncEvent` devrait avoir :

* `seq` (int incrémental)
* `run_id`
* `ts`
* `trace_id` (optionnel mais utile)
* et un mécanisme “resume from seq”.

Sinon tu vas avoir des doubles messages / ordre cassé / “draft appliqué deux fois”.

✅ Action : ajoute `seq` dans `syncEvent`, et :

* SSE : support `Last-Event-ID` ou `?from_seq=`
* WS : client envoie `resume_from_seq`

### 3) WS token : bien, mais précise la sécurité

Ton `/ws-token` est bon, mais il faut définir :

* TTL court (ex 30–120s)
* scope strict (`run_id` + `user_id`)
* usage unique (one-time) ou anti-replay

✅ Action : token signé (JWT court) avec claims `sub=user_id`, `run=run_id`, `exp`, `jti`.

### 4) Tool calling : il manque 2 events (sinon debug impossible)

Tu as `ai_tool_calls` en DB, mais côté stream tu vas vouloir afficher :

* `tool_call` (nom + args + status=started)
* `tool_result` (résumé + status=done/failed)

Sans ça, tu es aveugle quand Sync “agit”.

✅ Action : ajoute `tool_call` et `tool_result` dans `syncEvent` (même si UI les cache au début).

### 5) PromptComposer : ajoute “Prompt Snapshot” versionné dans `ai_runs`

Tu dis “prompt structuré stable versionné pour debug/replay”, mais il faut le matérialiser :

✅ Dans `ai_runs`, stocke :

* `prompt_version`
* `prompt_mode`
* `system_prompt_snapshot` (ou hash + storage séparé)
* `toolset_snapshot`
* `retrieval_snapshot` (ids des docs/snippets injectés)

Sinon “replay” est une illusion.

---

## Ce qui manque encore (à ajouter maintenant dans le plan, même si tu codes plus tard)

### A) “Dégradation manuelle” explicite

Tu l’as implicitement, mais il faut l’écrire dans la spec :

* si LLM off → user peut créer/éditer un plan draft manuellement
* si retrieval off → @mention marche en “link attach” simple
* si tool interdit → UI propose alternative manuelle

Ça te sauve quand coûts/quotas tombent.

### B) Multi-tenant / scopes mémoire : clarifie `workspace_id`

Tu mets `workspace_id` dans la mémoire. Très bien si tu vises teams plus tard.
Mais V0 doit être clair :

* solo = `workspace_id = user_id` (ou workspace unique par user)
* teams plus tard = workspace partagé

### C) Automation runtime : idempotence + permissions

Dans `automation_runs`, ajoute :

* `idempotency_key`
* `dry_run` (preview)
* `requires_confirm` au niveau action (pas juste spec)
* un “policy gate” identique aux tools Sync

Sinon une automation peut spammer / dupliquer.

### D) Capabilities modèles (LiteLLM)

Ton `GET /models` doit exposer des capacités, sinon tu vas appeler tool calling sur un modèle qui ne le supporte pas :

* `supports_tools`, `supports_vision`, `supports_json_schema`, `max_context`, `cost_hint`

Et côté orchestrateur : si `supports_tools=false`, tu retires les tools (toolset vide) → dégradation propre.

---

## Sur “users qui construisent leurs agents + automations” : tu as bon

Ton plan v2 le prend bien : `agent_profiles` + `automation_specs` en V1, UI complète plus tard.

La bonne architecture (très simple) :

* **AgentProfile = configuration** (prompt assets + tool policy + memory scope)
* **Sous-agent** = même moteur, mais `prompt_mode=minimal` + toolset réduit + scope mémoire réduit
* **AutomationSpec** = DSL (JSON nodes/edges ou forms) exécutée par le même ToolExecutor + policies

Tu n’as pas besoin de “vrais sous-agents partout”. Tu en utilises quand tu veux :

* retrieval ciblé
* extraction facture/garantie
* critique/validation planning
* génération d’AutomationSpec

Le “main agent” reste l’interface conversationnelle + arbitrage final.

---

## Mon verdict net

✅ **Plan v2 = validable** et bien plus mature que v1.
🔧 À corriger avant de coder trop loin : **SSE method (POST vs GET), event sequencing, prompt snapshot, tool events, WS token hardening.**
🧠 À ajouter au plan : dégradation manuelle + capabilities modèles + idempotence automations.

Si tu veux, je te fais la “v3 patch list” sous forme de checklist PR (exactement quoi modifier dans la spec + dans les types `syncEvent` + dans les tables).

PS (rappel) : avance avec **Gemini + Cursor** sur le bloc **Onboarding** en intégrant **Watchlist/veille → alertes multi-canaux → tâches/sessions** + packs templates, et pour les logos/brands dans Momentarise : **Simple Icons** (pas Heroicons)."""

---

## 🤖 Assistant

Oui, cet avis ChatGPT est pertinent et je valide presque tout.

Les points à intégrer immédiatement dans ton plan:
1. `syncEvent` avec enveloppe obligatoire: `seq`, `run_id`, `ts`, `trace_id` (+ reprise `from_seq` / `resume_from_seq`).
2. Durcissement WS token: TTL court, claims (`sub`, `run`, `exp`, `jti`), anti-replay.
3. Ajouter `tool_call` et `tool_result` dans le stream.
4. Snapshot d’exécution dans `ai_runs`: `prompt_version`, `prompt_mode`, `system_prompt_snapshot` (ou hash), `toolset_snapshot`, `retrieval_snapshot`.
5. Dégradation explicite (mode manuel) + capacités modèles (`supports_tools`, `supports_json_schema`, etc.) + idempotence automations (`idempotency_key`).

Nuance importante:
- `POST /stream` est correct si le web utilise `fetch` streaming.
- Si tu veux `EventSource`, alors il faut du `GET`.

La base du plan v2 reste excellente.  
Si tu veux, j’implémente maintenant la **v2.1** directement en commençant par **Gate A** (shared `sync.ts` + schémas FastAPI + migrations runtime + endpoints JSON + BFF JSON).

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- mcp.json: /Users/andrewpougary/.cursor/mcp.json
- mobile.mdc: .cursor/rules/mobile.mdc
- slice_3.5.md: .cursor/plans/slice_3.5.md
- package-lock.json: .cursor/plans/package-lock.json
- slice_2_zcodex_plan_de_correction_globale_slice_2.md: .cursor/plans/slice_2_zcodex_plan_de_correction_globale_slice_2.md

## My request for Codex:
l'avis de chatgpt : """Codex est **pile dans le vrai**. Rien à jeter, et surtout : il a validé les 5 points critiques à intégrer **tout de suite** (séquence d’événements, WS token, tool events, snapshots, dégradation/capabilities/idempotence). Je te donne la suite la plus utile : **comment transformer ça en “v2.1” concret**, avec les décisions figées et une checklist Gate A hyper actionnable.

---

## 1) Ce que tu dois figer maintenant (décisions v2.1)

### Streaming web

* ✅ **On garde `POST /runs/{id}/stream`** si tu pars sur **fetch streaming** côté Next.
* ❌ Si tu veux EventSource, tu changes en GET. (Mais tu n’en as pas besoin.)

👉 Donc : **fetch streaming** = tu gardes ton plan.

### Envelope `syncEvent`

Tu imposes *obligatoirement* :

* `seq: int`
* `run_id: str`
* `ts: ISO string`
* `trace_id: str | null`
* `type: ...`
* `payload: ...`

Et tu ajoutes la reprise :

* SSE : `?from_seq=...`
* WS : message client `{"type":"resume","from_seq":123}`

### WS token

JWT très court :

* TTL 30–120s
* claims: `sub`, `run`, `exp`, `jti`
* `jti` enregistré pour anti-replay (ou cache TTL)

### Tool events streamés

Ajouter `tool_call` + `tool_result` **dans le stream** même si tu caches l’UI.

### Snapshots run

Dans `ai_runs` :

* `prompt_version`, `prompt_mode`
* `system_prompt_snapshot` (ou hash + stockage)
* `toolset_snapshot`
* `retrieval_snapshot`

---

## 2) Gate A (v2.1) — ce que je ferais exactement en premier

**Objectif Gate A** : tu peux créer un run, récupérer son état, et tu as un contrat partagé stable (web + mobile).

### A1 — `@momentarise/shared/sync.ts` (le contrat stable)

Contient :

* `SyncRun`, `SyncMessage`, `SyncDraft`, `SyncPreview`, `SyncChange`
* `SyncModelCapabilities`
* `SyncEventEnvelope` + union discriminée `SyncEvent`

Checklist :

* [ ] Ajouter `seq/run_id/ts/trace_id` partout
* [ ] Ajouter `tool_call/tool_result`
* [ ] Ajouter `resume` event client (WS)

### A2 — Pydantic `schemas/sync.py` (miroir exact)

Tu ne dois pas diverger :

* [ ] mêmes noms, mêmes champs, mêmes types
* [ ] validators sur `seq` croissant côté server (au moins par stream)

### A3 — Migrations runtime (DB)

Minimum tables pour Gate A :

* `ai_runs` (avec snapshots v2.1)
* `ai_messages`
* `ai_usage_events` (optionnel dès Gate A)

Checklist :

* [ ] `ai_runs.status` + timestamps
* [ ] `ai_runs.agent_id` nullable (prêt pour AgentProfiles)
* [ ] `ai_runs.prompt_*` + snapshots

### A4 — Endpoints JSON (pas streaming encore)

* `GET /models`
* `POST /runs`
* `GET /runs/{run_id}`
* `GET /changes` (même vide au début)

### A5 — BFF Next JSON proxy

Même routes `/api/sync/*` mais **JSON only** à ce stade.

---

## 3) Gate B (après Gate A) — le premier “wow”

* LiteLLM branché (même sans tools au début)
* SSE web via BFF forwarding
* `syncEvent` qui stream `token/message/done` avec `seq`

---

## 4) Deux warnings à ne pas ignorer (sinon tu vas souffrir)

1. **Ne commence pas par “tools + apply/undo”** avant que l’event envelope + seq + snapshots soient en place.
   Sinon debugging = enfer.

2. **Ne commence pas par “AgentProfile builder”** avant que le moteur `RunContext + PromptComposer` existe.
   AgentProfile = juste un autre input du composer.

---

## 5) Ma recommandation d’exécution (sans blabla)

Tu fais **v2.1** comme Codex dit, mais tu le forces à livrer en ordre :

1. **Gate A** (contrats + DB runtime + endpoints JSON + BFF JSON)
2. **Gate B** (LiteLLM + SSE web tokens)
3. **Gate C** (PromptComposer + ToolPolicy + tool_call/tool_result events)
4. **Gate D** (Preview/Apply/Undo)
5. **Gate E** (FTS retrieval + AgentProfiles/Automations DB/API)

---

Si tu veux, je te rédige un **patch “Plan v2 → Plan v2.1”** en mode diff : les sections à modifier, et le schéma exact de `syncEvent` (avec exemples d’événements).

PS (rappel) : avance avec **Gemini + Cursor** sur le bloc **Onboarding** (Watchlist/veille → alertes multi-canaux → tâches/sessions + packs templates) et utilise **Simple Icons** (pas Heroicons) pour les icônes de logos/brands dans Momentarise."""

---

## 🤖 Assistant

Je prends cet avis comme validation de passer en **v2.1 concret**. Je lance directement l’implémentation **Gate A**: contrats partagés Sync, schémas/API FastAPI JSON, modèles runtime + migration, puis routes BFF web JSON `/api/sync/*`.

---

## 🤖 Assistant

Je vois un workspace déjà modifié, je vais limiter mes changements aux nouveaux modules Sync et aux points de wiring nécessaires pour éviter d’impacter le travail en cours ailleurs. J’inspecte maintenant les patterns existants (Pydantic/routers/migrations) pour garder une implémentation homogène.

---

## 👤 User

<turn_aborted>
The user interrupted the previous turn on purpose. Any running unified exec processes were terminated. If any tools/commands were aborted, they may have partially executed; verify current state before retrying.
</turn_aborted>

---

## 🤖 Assistant

<collaboration_mode># Plan Mode (Conversational)

You work in 3 phases, and you should *chat your way* to a great plan before finalizing it. A great plan is very detailed—intent- and implementation-wise—so that it can be handed to another engineer or agent to be implemented right away. It must be **decision complete**, where the implementer does not need to make any decisions.

## Mode rules (strict)

You are in **Plan Mode** until a developer message explicitly ends it.

Plan Mode is not changed by user intent, tone, or imperative language. If a user asks for execution while still in Plan Mode, treat it as a request to **plan the execution**, not perform it.

## Plan Mode vs update_plan tool

Plan Mode is a collaboration mode that can involve requesting user input and eventually issuing a `<proposed_plan>` block.

Separately, `update_plan` is a checklist/progress/TODOs tool; it does not enter or exit Plan Mode. Do not confuse it with Plan mode or try to use it while in Plan mode. If you try to use `update_plan` in Plan mode, it will return an error.

## Execution vs. mutation in Plan Mode

You may explore and execute **non-mutating** actions that improve the plan. You must not perform **mutating** actions.

### Allowed (non-mutating, plan-improving)

Actions that gather truth, reduce ambiguity, or validate feasibility without changing repo-tracked state. Examples:

* Reading or searching files, configs, schemas, types, manifests, and docs
* Static analysis, inspection, and repo exploration
* Dry-run style commands when they do not edit repo-tracked files
* Tests, builds, or checks that may write to caches or build artifacts (for example, `target/`, `.cache/`, or snapshots) so long as they do not edit repo-tracked files

### Not allowed (mutating, plan-executing)

Actions that implement the plan or change repo-tracked state. Examples:

* Editing or writing files
* Running formatters or linters that rewrite files
* Applying patches, migrations, or codegen that updates repo-tracked files
* Side-effectful commands whose purpose is to carry out the plan rather than refine it

When in doubt: if the action would reasonably be described as "doing the work" rather than "planning the work," do not do it.

## PHASE 1 — Ground in the environment (explore first, ask second)

Begin by grounding yourself in the actual environment. Eliminate unknowns in the prompt by discovering facts, not by asking the user. Resolve all questions that can be answered through exploration or inspection. Identify missing or ambiguous details only if they cannot be derived from the environment. Silent exploration between turns is allowed and encouraged.

Before asking the user any question, perform at least one targeted non-mutating exploration pass (for example: search relevant files, inspect likely entrypoints/configs, confirm current implementation shape), unless no local environment/repo is available.

Exception: you may ask clarifying questions about the user's prompt before exploring, ONLY if there are obvious ambiguities or contradictions in the prompt itself. However, if ambiguity might be resolved by exploring, always prefer exploring first.

Do not ask questions that can be answered from the repo or system (for example, "where is this struct?" or "which UI component should we use?" when exploration can make it clear). Only ask once you have exhausted reasonable non-mutating exploration.

## PHASE 2 — Intent chat (what they actually want)

* Keep asking until you can clearly state: goal + success criteria, audience, in/out of scope, constraints, current state, and the key preferences/tradeoffs.
* Bias toward questions over guessing: if any high-impact ambiguity remains, do NOT plan yet—ask.

## PHASE 3 — Implementation chat (what/how we’ll build)

* Once intent is stable, keep asking until the spec is decision complete: approach, interfaces (APIs/schemas/I/O), data flow, edge cases/failure modes, testing + acceptance criteria, rollout/monitoring, and any migrations/compat constraints.

## Asking questions

Critical rules:

* Strongly prefer using the `request_user_input` tool to ask any questions.
* Offer only meaningful multiple‑choice options; don’t include filler choices that are obviously wrong or irrelevant.
* In rare cases where an unavoidable, important question can’t be expressed with reasonable multiple‑choice options (due to extreme ambiguity), you may ask it directly without the tool.

You SHOULD ask many questions, but each question must:

* materially change the spec/plan, OR
* confirm/lock an assumption, OR
* choose between meaningful tradeoffs.
* not be answerable by non-mutating commands.

Use the `request_user_input` tool only for decisions that materially change the plan, for confirming important assumptions, or for information that cannot be discovered via non-mutating exploration.

## Two kinds of unknowns (treat differently)

1. **Discoverable facts** (repo/system truth): explore first.

   * Before asking, run targeted searches and check likely sources of truth (configs/manifests/entrypoints/schemas/types/constants).
   * Ask only if: multiple plausible candidates; nothing found but you need a missing identifier/context; or ambiguity is actually product intent.
   * If asking, present concrete candidates (paths/service names) + recommend one.
   * Never ask questions you can answer from your environment (e.g., “where is this struct”).

2. **Preferences/tradeoffs** (not discoverable): ask early.

   * These are intent or implementation preferences that cannot be derived from exploration.
   * Provide 2–4 mutually exclusive options + a recommended default.
   * If unanswered, proceed with the recommended option and record it as an assumption in the final plan.

## Finalization rule

Only output the final plan when it is decision complete and leaves no decisions to the implementer.

When you present the official plan, wrap it in a `<proposed_plan>` block so the client can render it specially:

1) The opening tag must be on its own line.
2) Start the plan content on the next line (no text on the same line as the tag).
3) The closing tag must be on its own line.
4) Use Markdown inside the block.
5) Keep the tags exactly as `<proposed_plan>` and `</proposed_plan>` (do not translate or rename them), even if the plan content is in another language.

Example:

<proposed_plan>
plan content
</proposed_plan>

plan content should be human and agent digestible. The final plan must be plan-only and include:

* A clear title
* A brief summary section
* Important changes or additions to public APIs/interfaces/types
* Test cases and scenarios
* Explicit assumptions and defaults chosen where needed

Do not ask "should I proceed?" in the final output. The user can easily switch out of Plan mode and request implementation if you have included a `<proposed_plan>` block in your response. Alternatively, they can decide to stay in Plan mode and continue refining the plan.

Only produce at most one `<proposed_plan>` block per turn, and only when you are presenting a complete spec.

If the user stays in Plan mode and asks for revisions after a prior `<proposed_plan>`, any new `<proposed_plan>` must be a complete replacement.
</collaboration_mode>

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- mcp.json: /Users/andrewpougary/.cursor/mcp.json
- mobile.mdc: .cursor/rules/mobile.mdc
- slice_3.5.md: .cursor/plans/slice_3.5.md
- package-lock.json: .cursor/plans/package-lock.json
- slice_2_zcodex_plan_de_correction_globale_slice_2.md: .cursor/plans/slice_2_zcodex_plan_de_correction_globale_slice_2.md

## My request for Codex:
fait le plan final avec toutes les itérations.

---

## 🤖 Assistant

<proposed_plan>
# Plan Final v2.1 — Sync Web/Mobile (BFF Next + FastAPI + LiteLLM + socle Agents/Automations)

## Résumé
1. Ce plan consolide toutes les itérations v1/v2/v2.1 en un chemin exécutable, sans décision restante pour l’implémenteur.
2. Architecture verrouillée: Web via BFF Next minimal, Mobile direct FastAPI, orchestrateur unique côté FastAPI, LiteLLM comme gateway providers.
3. Streaming verrouillé: Web en `POST fetch streaming` (SSE-compatible stream), Mobile en WebSocket.
4. Sécurité verrouillée: aucune écriture métier IA sans `preview -> apply`, `undo` systématique quand `undoable=true`, audit dans `ai_changes`.
5. Socle extensible verrouillé: `PromptComposer`, `ToolPolicyEngine`, `ToolExecutor`, mémoire FTS V1, `AgentProfile` et `AutomationSpec` dès V1 (UI builder complète en V1.5).

## Objectif et critères de succès
1. Livrer une page `/sync` web réellement fonctionnelle (chat libre + guidé + draft + preview/apply/undo + changelog).
2. Livrer une page `/sync` mobile hors tabs avec parité événementielle (même `syncEvent` que web).
3. Obtenir une API Sync stable et versionnée (`/api/v1/sync/*`) utilisée par web/mobile.
4. Garantir isolation multi-tenant (`workspace_id`) et 404 cross-tenant sur toutes ressources Sync.
5. Permettre replay/résilience réseau via séquencement d’événements (`seq`) et reprise (`from_seq` / `resume_from_seq`).

## Architecture verrouillée
1. Flux web: Browser -> Next BFF (`/api/sync/*`) -> FastAPI (`/api/v1/sync/*`) -> LiteLLM -> Provider.
2. Flux mobile: App Expo -> FastAPI (`/api/v1/sync/*` HTTP + WS) -> LiteLLM -> Provider.
3. BFF Next reste “comme aujourd’hui”: cookie/session/auth forwarding, proxy streaming, rate-limit léger, zéro logique métier Sync.
4. Planification calendrier: LLM propose contraintes/options, scheduler déterministe valide et place.
5. Sous-agents: même moteur, `AgentProfile` différent (`prompt_mode`, toolset, memory scope), pas de “moteurs IA séparés”.

## API publique finale

### FastAPI `/api/v1/sync`
1. `GET /models`
2. `POST /runs`
3. `GET /runs/{run_id}`
4. `POST /runs/{run_id}/stream`
5. `POST /runs/{run_id}/answer`
6. `POST /runs/{run_id}/apply`
7. `POST /runs/{run_id}/undo`
8. `GET /changes`
9. `POST /runs/{run_id}/ws-token`
10. `WS /runs/{run_id}/ws?token=...`
11. `GET /agents`
12. `POST /agents`
13. `GET /agents/{agent_id}`
14. `PATCH /agents/{agent_id}`
15. `POST /agents/{agent_id}/versions/publish`
16. `GET /automations`
17. `POST /automations`
18. `PATCH /automations/{automation_id}`
19. `POST /automations/{automation_id}/validate`
20. `POST /automations/{automation_id}/activate`
21. `POST /automations/{automation_id}/pause`

### BFF web `/api/sync`
1. Proxy JSON des routes FastAPI correspondantes.
2. Proxy streaming pour `POST /api/sync/runs/[id]/stream` en forward de `Response.body` (pas de `res.json()`).
3. Aucun endpoint métier additionnel côté BFF.

## Contrats partagés (`@momentarise/shared`)

### Nouveau fichier
1. `packages/shared/src/sync.ts`
2. Export obligatoire depuis `packages/shared/src/index.ts`

### Types/schemas obligatoires
1. `syncRunSchema`, `syncMessageSchema`, `syncQuestionSchema`, `syncDraftSchema`, `syncPreviewSchema`, `syncApplySchema`, `syncUndoSchema`, `syncChangeSchema`, `syncModelSchema`.
2. `syncModelCapabilitiesSchema` avec `supports_tools`, `supports_vision`, `supports_json_schema`, `max_context`, `cost_hint`.
3. `syncEventEnvelopeSchema` + union discriminée `syncEventSchema`.

### Enveloppe `syncEvent` verrouillée
1. `seq: number` (strictement croissant par run/stream).
2. `run_id: string` (UUID).
3. `ts: string` (ISO datetime UTC).
4. `trace_id: string | null`.
5. `type: "token" | "message" | "question" | "draft" | "preview" | "applied" | "usage" | "warning" | "error" | "done" | "tool_call" | "tool_result"`.
6. `payload: object` (schéma dépendant du `type`).
7. Reprise web: `from_seq` query param.
8. Reprise mobile WS: message client `{"type":"resume","from_seq":N}`.

## Modèle de données final

### Gate A (minimum runtime)
1. `ai_runs` avec `workspace_id`, `created_by_user_id`, `agent_id nullable`, `mode`, `status`, `selected_model`, `title`, `context_json`.
2. `ai_runs` snapshots obligatoires: `prompt_version`, `prompt_mode`, `system_prompt_snapshot`, `toolset_snapshot`, `retrieval_snapshot`.
3. `ai_messages` avec `run_id`, `seq`, `role`, `content_json`, `provider`, `model`, `usage_json`, `error_code`.
4. `ai_usage_events` avec coûts/tokens par run/provider/model.

### Gate D/E (complet)
1. `ai_questions`
2. `ai_drafts`
3. `ai_tool_calls`
4. `sync_memory_docs`
5. `sync_memory_chunks` avec `search_tsv` (FTS)
6. `agent_profiles`
7. `agent_profile_versions`
8. `automation_specs`
9. `automation_runs` avec `idempotency_key`, `dry_run`, `status`, `error`.

### Audit
1. Réutiliser `ai_changes` existante pour chaque apply/undo Sync.

## Modules backend à créer
1. `apps/api/src/api/v1/sync.py`
2. `apps/api/src/schemas/sync.py`
3. `apps/api/src/sync/orchestrator.py`
4. `apps/api/src/sync/prompt_composer.py`
5. `apps/api/src/sync/tool_registry.py`
6. `apps/api/src/sync/tool_policy.py`
7. `apps/api/src/sync/tool_executor.py`
8. `apps/api/src/sync/retrieval.py`
9. `apps/api/src/sync/litellm_client.py`
10. `apps/api/src/sync/ws_auth.py`

## Spécifications d’exécution verrouillées

### PromptComposer
1. Entrées: `agent_profile`, `run_mode`, snapshot user/workspace, snippets retrieval, toolset.
2. Modes: `full`, `minimal`, `none`.
3. Token budgeting: priorité aux résumés/snippets, trimming déterministe.
4. Snapshot obligatoire écrit dans `ai_runs` avant stream.
5. Sous-agent = même orchestrateur avec `prompt_mode` et `toolset` restreints.

### ToolPolicyEngine
1. Toolset exposé = intersection `agent_policy` x `plan capabilities` x `connecteurs dispo` x `runtime context`.
2. Toute action `write` marquée `requires_confirm=true`.
3. Aucune exécution `write` autorisée sans preview valide.
4. Enforcement côté backend, jamais côté UI uniquement.

### ToolExecutor
1. `preview` produit diff métier non mutante.
2. `apply` valide `preview_id` + TTL + idempotency key.
3. `undo` autorisé uniquement si `ai_change.undoable=true`.
4. Émission stream obligatoire: `tool_call` puis `tool_result`.

### Retrieval V1
1. Ingestion de texte depuis Inbox/Item/Event vers `sync_memory_docs`.
2. Chunking + index FTS sur `sync_memory_chunks.search_tsv`.
3. Filtrage metadata dur (`workspace_id`, scope agent, tags, date range).
4. Injection prompt avec provenance (`doc_id`, `source_type`, offsets).

## Sécurité streaming WS/SSE

### Web stream
1. `POST /stream` consommé via `fetch` streaming (pas EventSource).
2. Support `from_seq` pour reprise.
3. Réponse streamée forwardée telle quelle via BFF.

### WS mobile
1. `POST /ws-token` retourne token court + URL WS.
2. Claims JWT: `sub`, `run`, `exp`, `jti`.
3. TTL token: 30 à 120 secondes.
4. Anti-replay: `jti` one-time stocké (cache TTL ou table dédiée).
5. Reprise via `resume` message client avec `from_seq`.

## Implémentation UI web `/sync`
1. Copier sélectivement `project/inbox_raw/AI_Chat_interface/components/chat/*` vers `apps/web/src/components/sync-chat/*`.
2. Adapter imports vers design system existant (`apps/web/src/components/ui/*`).
3. Corriger défauts connus importés (regex markdown, retry/stale state, etc.).
4. Créer style local `apps/web/src/app/sync-chat.css` avec classes préfixées `sync-*`.
5. Hooks web: `useSyncRun`, `useSyncSse`, `useSyncApply`, `useSyncUndo`, `useSyncChanges`.
6. Page finale: thread, quick replies guidées, carte draft, panneau preview, panneau changes, actions apply/undo.

## Implémentation UI mobile `/sync`
1. Remplacer placeholder `apps/mobile/app/sync.tsx` par écran conversationnel complet.
2. Composants custom `apps/mobile/components/sync/*`.
3. Hooks mobile: `useSyncRun`, `useSyncWs`, `useSyncApply`, `useSyncUndo`.
4. Parité stricte du contrat `syncEvent` avec web.
5. Route hors tabs maintenue, accessible via points d’entrée existants.

## Plan de livraison (gates exécutable)

### Gate A
1. Sh

... [tronqué, 2764 caractères restants]

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- mcp.json: /Users/andrewpougary/.cursor/mcp.json
- mobile.mdc: .cursor/rules/mobile.mdc
- slice_3.5.md: .cursor/plans/slice_3.5.md
- package-lock.json: .cursor/plans/package-lock.json
- slice_2_zcodex_plan_de_correction_globale_slice_2.md: .cursor/plans/slice_2_zcodex_plan_de_correction_globale_slice_2.md

## My request for Codex:
on devrait mettre des sous-agents par défaut non ?

---

## 🤖 Assistant

Oui, je recommande d’avoir des sous-agents par défaut, mais en **set minimal** au départ pour éviter la complexité et garder le contrôle produit.  
Je te fais verrouiller le niveau exact à intégrer dans le plan final.

---

## 🤖 Assistant

Oui, clairement.  
Et le meilleur compromis V1 est celui que tu viens de verrouiller: **pack minimal 3 sous-agents par défaut**.

Je fixe donc dans le plan:
1. `Retriever` (context finder)
2. `Planner` (draft plan builder)
3. `Verifier` (consistency/risks checker)

Garde-fous:
1. Tous en mode assisté.
2. Aucun `write` sans `preview -> apply`.
3. Toolset réduit par défaut, extensible plus tard par `AgentProfile`.

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- mcp.json: /Users/andrewpougary/.cursor/mcp.json
- mobile.mdc: .cursor/rules/mobile.mdc
- slice_3.5.md: .cursor/plans/slice_3.5.md
- package-lock.json: .cursor/plans/package-lock.json
- slice_2_zcodex_plan_de_correction_globale_slice_2.md: .cursor/plans/slice_2_zcodex_plan_de_correction_globale_slice_2.md

## My request for Codex:
ah non, en interne si un suffit ce n'est pg, mais en vrai je parlais dispo pour les users, ça va changer trop de choses ? dans l'ui notamment ?

---

## 🤖 Assistant

Ça peut changer pas mal l’UI si tu l’exposes trop tôt, mais tu peux le faire sans “exploser” l’expérience avec un niveau d’exposition progressif.  
Je te fais choisir le niveau exact d’exposition user pour le figer dans le plan.

---

## 👤 User

<turn_aborted>
The user interrupted the previous turn on purpose. Any running unified exec processes were terminated. If any tools/commands were aborted, they may have partially executed; verify current state before retrying.
</turn_aborted>

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- mcp.json: /Users/andrewpougary/.cursor/mcp.json
- mobile.mdc: .cursor/rules/mobile.mdc
- slice_3.5.md: .cursor/plans/slice_3.5.md
- package-lock.json: .cursor/plans/package-lock.json
- slice_2_zcodex_plan_de_correction_globale_slice_2.md: .cursor/plans/slice_2_zcodex_plan_de_correction_globale_slice_2.md

## My request for Codex:
non je crois qu'on ne parle pas de la même chose. S'il y a besoin de sous agent pour aider sync dans l'app par défaut azy. sinon pas besoin. mlais je veux permettre aux users de créer leurs propres agents, par exemple un creation de contenu, un coach sportif, un assistant de prospection, etc + leur permettre de creer des automatisations

---

## 🤖 Assistant

Parfait, là c’est clair et on parle bien de la même chose.

Je verrouille l’interprétation correcte:
1. Sous-agents internes par défaut: **uniquement si Sync en a besoin**, invisibles pour l’utilisateur.
2. Produit user-facing: **oui** à la création d’agents personnalisés (content coach sportif prospection etc.).
3. Produit user-facing: **oui** à la création d’automatisations.

Il me manque juste un arbitrage pour finaliser le plan sans ambiguïté: le niveau d’UI à livrer en V1 pour ces créations user.

---

## 🤖 Assistant

Oui, c’est parfaitement faisable et ça ne casse pas l’UI si on le fait proprement.

Je verrouille donc:
1. Sous-agents internes: seulement si nécessaire pour aider Sync, invisibles côté user.
2. Users: création d’agents personnalisés autorisée en V1 (builder simple).
3. Users: création d’automatisations autorisée en V1 (builder simple).

Impact UI V1 (raisonnable):
1. Sur `/sync`: un sélecteur d’agent actif + bouton “Créer un agent”.
2. Une page `Agents` simple: templates, champs clés, test, publish.
3. Une page `Automations` simple: trigger + conditions + actions + activate/pause.
4. Le mode avancé (policies/tools/scopes détaillés + workflow visuel) reste en V1.5.

C’est exactement le bon compromis: puissance utilisateur réelle, sans alourdir l’expérience principale de Sync.

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- page.tsx: apps/web/src/app/(dashboard)/inbox/page.tsx
- mcp.json: /Users/andrewpougary/.cursor/mcp.json
- mobile.mdc: .cursor/rules/mobile.mdc
- slice_3.5.md: .cursor/plans/slice_3.5.md
- package-lock.json: .cursor/plans/package-lock.json

## My request for Codex:
parfait, le plan maintenant, complet ((en plus de ça : # Plan Final v2.1 — Sync Web/Mobile (BFF Next + FastAPI + LiteLLM + socle Agents/Automations)

## Résumé
1. Ce plan consolide toutes les itérations v1/v2/v2.1 en un chemin exécutable, sans décision restante pour l’implémenteur.
2. Architecture verrouillée: Web via BFF Next minimal, Mobile direct FastAPI, orchestrateur unique côté FastAPI, LiteLLM comme gateway providers.
3. Streaming verrouillé: Web en `POST fetch streaming` (SSE-compatible stream), Mobile en WebSocket.
4. Sécurité verrouillée: aucune écriture métier IA sans `preview -> apply`, `undo` systématique quand `undoable=true`, audit dans `ai_changes`.
5. Socle extensible verrouillé: `PromptComposer`, `ToolPolicyEngine`, `ToolExecutor`, mémoire FTS V1, `AgentProfile` et `AutomationSpec` dès V1 (UI builder complète en V1.5).

## Objectif et critères de succès
1. Livrer une page `/sync` web réellement fonctionnelle (chat libre + guidé + draft + preview/apply/undo + changelog).
2. Livrer une page `/sync` mobile hors tabs avec parité événementielle (même `syncEvent` que web).
3. Obtenir une API Sync stable et versionnée (`/api/v1/sync/*`) utilisée par web/mobile.
4. Garantir isolation multi-tenant (`workspace_id`) et 404 cross-tenant sur toutes ressources Sync.
5. Permettre replay/résilience réseau via séquencement d’événements (`seq`) et reprise (`from_seq` / `resume_from_seq`).

## Architecture verrouillée
1. Flux web: Browser -> Next BFF (`/api/sync/*`) -> FastAPI (`/api/v1/sync/*`) -> LiteLLM -> Provider.
2. Flux mobile: App Expo -> FastAPI (`/api/v1/sync/*` HTTP + WS) -> LiteLLM -> Provider.
3. BFF Next reste “comme aujourd’hui”: cookie/session/auth forwarding, proxy streaming, rate-limit léger, zéro logique métier Sync.
4. Planification calendrier: LLM propose contraintes/options, scheduler déterministe valide et place.
5. Sous-agents: même moteur, `AgentProfile` différent (`prompt_mode`, toolset, memory scope), pas de “moteurs IA séparés”.

## API publique finale

### FastAPI `/api/v1/sync`
1. `GET /models`
2. `POST /runs`
3. `GET /runs/{run_id}`
4. `POST /runs/{run_id}/stream`
5. `POST /runs/{run_id}/answer`
6. `POST /runs/{run_id}/apply`
7. `POST /runs/{run_id}/undo`
8. `GET /changes`
9. `POST /runs/{run_id}/ws-token`
10. `WS /runs/{run_id}/ws?token=...`
11. `GET /agents`
12. `POST /agents`
13. `GET /agents/{agent_id}`
14. `PATCH /agents/{agent_id}`
15. `POST /agents/{agent_id}/versions/publish`
16. `GET /automations`
17. `POST /automations`
18. `PATCH /automations/{automation_id}`
19. `POST /automations/{automation_id}/validate`
20. `POST /automations/{automation_id}/activate`
21. `POST /automations/{automation_id}/pause`

### BFF web `/api/sync`
1. Proxy JSON des routes FastAPI correspondantes.
2. Proxy streaming pour `POST /api/sync/runs/[id]/stream` en forward de `Response.body` (pas de `res.json()`).
3. Aucun endpoint métier additionnel côté BFF.

## Contrats partagés (`@momentarise/shared`)

### Nouveau fichier
1. `packages/shared/src/sync.ts`
2. Export obligatoire depuis `packages/shared/src/index.ts`

### Types/schemas obligatoires
1. `syncRunSchema`, `syncMessageSchema`, `syncQuestionSchema`, `syncDraftSchema`, `syncPreviewSchema`, `syncApplySchema`, `syncUndoSchema`, `syncChangeSchema`, `syncModelSchema`.
2. `syncModelCapabilitiesSchema` avec `supports_tools`, `supports_vision`, `supports_json_schema`, `max_context`, `cost_hint`.
3. `syncEventEnvelopeSchema` + union discriminée `syncEventSchema`.

### Enveloppe `syncEvent` verrouillée
1. `seq: number` (strictement croissant par run/stream).
2. `run_id: string` (UUID).
3. `ts: string` (ISO datetime UTC).
4. `trace_id: string | null`.
5. `type: "token" | "message" | "question" | "draft" | "preview" | "applied" | "usage" | "warning" | "error" | "done" | "tool_call" | "tool_result"`.
6. `payload: object` (schéma dépendant du `type`).
7. Reprise web: `from_seq` query param.
8. Reprise mobile WS: message client `{"type":"resume","from_seq":N}`.

## Modèle de données final

### Gate A (minimum runtime)
1. `ai_runs` avec `workspace_id`, `created_by_user_id`, `agent_id nullable`, `mode`, `status`, `selected_model`, `title`, `context_json`.
2. `ai_runs` snapshots obligatoires: `prompt_version`, `prompt_mode`, `system_prompt_snapshot`, `toolset_snapshot`, `retrieval_snapshot`.
3. `ai_messages` avec `run_id`, `seq`, `role`, `content_json`, `provider`, `model`, `usage_json`, `error_code`.
4. `ai_usage_events` avec coûts/tokens par run/provider/model.

### Gate D/E (complet)
1. `ai_questions`
2. `ai_drafts`
3. `ai_tool_calls`
4. `sync_memory_docs`
5. `sync_memory_chunks` avec `search_tsv` (FTS)
6. `agent_profiles`
7. `agent_profile_versions`
8. `automation_specs`
9. `automation_runs` avec `idempotency_key`, `dry_run`, `status`, `error`.

### Audit
1. Réutiliser `ai_changes` existante pour chaque apply/undo Sync.

## Modules backend à créer
1. `apps/api/src/api/v1/sync.py`
2. `apps/api/src/schemas/sync.py`
3. `apps/api/src/sync/orchestrator.py`
4. `apps/api/src/sync/prompt_composer.py`
5. `apps/api/src/sync/tool_registry.py`
6. `apps/api/src/sync/tool_policy.py`
7. `apps/api/src/sync/tool_executor.py`
8. `apps/api/src/sync/retrieval.py`
9. `apps/api/src/sync/litellm_client.py`
10. `apps/api/src/sync/ws_auth.py`

## Spécifications d’exécution verrouillées

### PromptComposer
1. Entrées: `agent_profile`, `run_mode`, snapshot user/workspace, snippets retrieval, toolset.
2. Modes: `full`, `minimal`, `none`.
3. Token budgeting: priorité aux résumés/snippets, trimming déterministe.
4. Snapshot obligatoire écrit dans `ai_runs` avant stream.
5. Sous-agent = même orchestrateur avec `prompt_mode` et `toolset` restreints.

### ToolPolicyEngine
1. Toolset exposé = intersection `agent_policy` x `plan capabilities` x `connecteurs dispo` x `runtime context`.
2. Toute action `write` marquée `requires_confirm=true`.
3. Aucune exécution `write` autorisée sans preview valide.
4. Enforcement côté backend, jamais côté UI uniquement.

### ToolExecutor
1. `preview` produit diff métier non mutante.
2. `apply` valide `preview_id` + TTL + idempotency key.
3. `undo` autorisé uniquement si `ai_change.undoable=true`.
4. Émission stream obligatoire: `tool_call` puis `tool_result`.

### Retrieval V1
1. Ingestion de texte depuis Inbox/Item/Event vers `sync_memory_docs`.
2. Chunking + index FTS sur `sync_memory_chunks.search_tsv`.
3. Filtrage metadata dur (`workspace_id`, scope agent, tags, date range).
4. Injection prompt avec provenance (`doc_id`, `source_type`, offsets).

## Sécurité streaming WS/SSE

### Web stream
1. `POST /stream` consommé via `fetch` streaming (pas EventSource).
2. Support `from_seq` pour reprise.
3. Réponse streamée forwardée telle quelle via BFF.

### WS mobile
1. `POST /ws-token` retourne token court + URL WS.
2. Claims JWT: `sub`, `run`, `exp`, `jti`.
3. TTL token: 30 à 120 secondes.
4. Anti-replay: `jti` one-time stocké (cache TTL ou table dédiée).
5. Reprise via `resume` message client avec `from_seq`.

## Implémentation UI web `/sync`
1. Copier sélectivement `project/inbox_raw/AI_Chat_interface/components/chat/*` vers `apps/web/src/components/sync-chat/*`.
2. Adapter imports vers design system existant (`apps/web/src/components/ui/*`).
3. Corriger défauts connus importés (regex markdown, retry/stale state, etc.).
4. Créer style local `apps/web/src/app/sync-chat.css` avec classes préfixées `sync-*`.
5. Hooks web: `useSyncRun`, `useSyncSse`, `useSyncApply`, `useSyncUndo`, `useSyncChanges`.
6. Page finale: thread, quick replies guidées, carte draft, panneau preview, panneau changes, actions apply/undo.

## Implémentation UI mobile `/sync`
1. Remplacer placeholder `apps/mobile/app/sync.

... [tronqué, 3100 caractères restants]

---

## 🤖 Assistant

<proposed_plan>
# Plan Final v2.2 — Sync Web/Mobile + Agents/Automations User (BFF Next, FastAPI, LiteLLM)

## Résumé
1. Ce plan fusionne toutes les itérations v1/v2/v2.1 et intègre la dernière décision produit: sous-agents internes uniquement si nécessaires pour aider Sync, et création d’agents/automations disponible pour les users en V1 via un builder simple.
2. Architecture verrouillée: Web via BFF Next minimal, Mobile direct FastAPI, logique métier 100% FastAPI, LiteLLM comme gateway multi-modèles.
3. Streaming verrouillé: Web en `POST fetch streaming`, Mobile en WebSocket; même contrat `syncEvent` sur les deux.
4. Sécurité verrouillée: aucune mutation IA sans `preview -> apply`; `undo` obligatoire quand `undoable=true`; audit dans `ai_changes`.
5. V1 livre le socle runtime, l’UI `/sync` web+mobile, et un builder simple user pour agents/automations. V1.5 livre l’éditeur avancé.

## Objectifs et critères de succès
1. Page `/sync` web fonctionnelle: chat libre/guidé, draft, preview/apply/undo, changelog.
2. Page `/sync` mobile hors tabs avec même logique événementielle que web.
3. API Sync versionnée et stable (`/api/v1/sync/*`) consommée par web et mobile.
4. Création user d’agents et d’automations en V1 (mode simple).
5. Isolation multi-tenant stricte: toutes les ressources Sync filtrées `workspace_id`, cross-tenant en 404.
6. Résilience réseau: reprise de stream via `seq` (`from_seq` web, `resume_from_seq` mobile).

## Décisions verrouillées
1. Sous-agents internes: pas de pack “visible” forcé. L’orchestrateur peut invoquer des helpers internes (`retrieval/planning/verification`) seulement quand utile.
2. Users: création d’agents personnalisés autorisée en V1 via UI simple.
3. Users: création d’automations autorisée en V1 via UI simple.
4. UI avancée agents/automations (éditeur complet policies/workflows): V1.5.
5. BFF Next reste minimal “comme aujourd’hui”: auth/cookies/proxy/rate-limit léger/stream forwarding, pas de logique métier.
6. Web stream en POST avec fetch streaming, pas EventSource.
7. Mobile stream en WS avec token court.
8. Scheduler calendrier reste déterministe; LLM fournit contraintes/options et justification.

## Architecture cible
1. Flux web: Browser -> Next BFF `/api/sync/*` -> FastAPI `/api/v1/sync/*` -> LiteLLM -> providers.
2. Flux mobile: Expo app -> FastAPI `/api/v1/sync/*` (HTTP + WS) -> LiteLLM -> providers.
3. Exécution outillée: LLM propose -> Policy autorise/refuse -> Executor produit preview -> user confirme apply -> transaction -> log AIChange -> undo possible.
4. Agents user: profil de configuration sur le moteur unique Sync.
5. Automations user: spécifications exécutées par le même runtime outillé/policy.

## API publique finale

### FastAPI `/api/v1/sync`
1. `GET /models`
2. `POST /runs`
3. `GET /runs/{run_id}`
4. `POST /runs/{run_id}/stream`
5. `POST /runs/{run_id}/answer`
6. `POST /runs/{run_id}/apply`
7. `POST /runs/{run_id}/undo`
8. `GET /changes`
9. `POST /runs/{run_id}/ws-token`
10. `WS /runs/{run_id}/ws?token=...`
11. `GET /agents`
12. `POST /agents`
13. `GET /agents/{agent_id}`
14. `PATCH /agents/{agent_id}`
15. `POST /agents/{agent_id}/versions/publish`
16. `GET /automations`
17. `POST /automations`
18. `PATCH /automations/{automation_id}`
19. `POST /automations/{automation_id}/validate`
20. `POST /automations/{automation_id}/activate`
21. `POST /automations/{automation_id}/pause`

### BFF web `/api/sync`
1. Proxy JSON des endpoints FastAPI correspondants.
2. Proxy streaming pour `POST /api/sync/runs/[id]/stream` en forwarding brut de `Response.body`.
3. Aucun endpoint métier ajouté côté Next.

## Contrats partagés (`@momentarise/shared`)

### Nouveau module
1. `packages/shared/src/sync.ts`.
2. Export obligatoire depuis `packages/shared/src/index.ts`.

### Schémas obligatoires
1. `syncRunSchema`, `syncMessageSchema`, `syncQuestionSchema`, `syncDraftSchema`, `syncPreviewSchema`, `syncApplySchema`, `syncUndoSchema`, `syncChangeSchema`, `syncModelSchema`.
2. `syncModelCapabilitiesSchema` avec `supports_tools`, `supports_vision`, `supports_json_schema`, `max_context`, `cost_hint`.
3. `syncEventEnvelopeSchema` + `syncEventSchema` union discriminée.

### Enveloppe `syncEvent` verrouillée
1. `seq` entier strictement croissant par run.
2. `run_id` UUID.
3. `ts` datetime ISO UTC.
4. `trace_id` nullable.
5. `type` dans: `token`, `message`, `question`, `draft`, `preview`, `applied`, `usage`, `warning`, `error`, `done`, `tool_call`, `tool_result`.
6. `payload` validé par schéma dépendant du type.
7. Reprise web: query `from_seq`.
8. Reprise WS: message client `{"type":"resume","from_seq":N}`.

## Modèle de données final

### Runtime V1
1. `ai_runs` avec `workspace_id`, `created_by_user_id`, `agent_id nullable`, `mode`, `status`, `selected_model`, `title`, `context_json`.
2. `ai_runs` snapshots obligatoires: `prompt_version`, `prompt_mode`, `system_prompt_snapshot`, `toolset_snapshot`, `retrieval_snapshot`.
3. `ai_messages` avec `run_id`, `seq`, `role`, `content_json`, `provider`, `model`, `usage_json`, `error_code`.
4. `ai_usage_events` avec tokens/coût/run/provider/model.
5. `ai_questions`.
6. `ai_drafts`.
7. `ai_tool_calls`.

### Mémoire V1
1. `sync_memory_docs` avec source canonique texte + metadata + workspace.
2. `sync_memory_chunks` avec chunk text + provenance + `search_tsv` FTS.

### Agents/Automations V1
1. `agent_profiles` avec `origin=system|user|template`, `prompt_mode`, `tool_policy_json`, `memory_scope_json`, `is_default`.
2. `agent_profile_versions`.
3. `automation_specs` avec JSON spec, `status=draft|active|paused`, `requires_confirm`.
4. `automation_runs` avec `idempotency_key`, `dry_run`, `status`, `error`.

### Audit
1. Réutiliser `ai_changes` pour toute exécution apply/undo Sync.

## Modules backend à créer
1. `apps/api/src/api/v1/sync.py`.
2. `apps/api/src/schemas/sync.py`.
3. `apps/api/src/sync/orchestrator.py`.
4. `apps/api/src/sync/prompt_composer.py`.
5. `apps/api/src/sync/tool_registry.py`.
6. `apps/api/src/sync/tool_policy.py`.
7. `apps/api/src/sync/tool_executor.py`.
8. `apps/api/src/sync/retrieval.py`.
9. `apps/api/src/sync/litellm_client.py`.
10. `apps/api/src/sync/ws_auth.py`.

## Spécifications d’exécution

### PromptComposer
1. Entrées: `agent_profile`, `run_mode`, état user/workspace, snippets retrieval, toolset.
2. Modes: `full`, `minimal`, `none`.
3. Budget token: priorité résumé/snippets, trimming déterministe.
4. Snapshot prompt/toolset/retrieval persisté dans `ai_runs` avant stream.
5. Les helpers internes éventuels utilisent `prompt_mode=minimal` et toolset restreint.

### ToolPolicyEngine
1. Toolset final = intersection policy agent x capacités plan x connecteurs dispo x contexte runtime.
2. Toute action write est `requires_confirm=true`.
3. Write interdit sans preview valide.
4. Enforcement exclusivement backend.

### ToolExecutor
1. `preview` calcule un diff non-mutant.
2. `apply` valide `preview_id`, TTL, idempotency key.
3. `undo` autorisé seulement si `ai_change.undoable=true`.
4. Stream des événements `tool_call` puis `tool_result`.

### Retrieval V1
1. Ingestion texte depuis Inbox/Item/Event vers `sync_memory_docs`.
2. Chunking + index FTS sur `sync_memory_chunks.search_tsv`.
3. Filtrage metadata strict (`workspace_id`, scope agent, tags, date).
4. Injection prompt avec provenance (`doc_id`, `source_type`, offsets).

## Sécurité streaming

### Web
1. `POST /runs/{id}/stream` via fetch streaming.
2. Support `from_seq`.
3. Proxy brut côté BFF.

### Mobile WS
1. `POST /runs/{id}/ws-token` renvoie URL WS + token.
2. Token signé avec claims `sub`, `run`, `exp`, `jti`.
3. TTL 30 à 120 secondes.
4. Anti-replay via stockage `jti` one-shot (cache TTL/table).
5. Resume via `from_seq`.

## UI V1

### Web `/sync`
1. Copier sélectivement `project/inbox_raw/AI_Chat_interface/components/chat/*` vers `apps/web/src/components/sync-chat/*`.
2. Adapter au design system existant, pas de merge global template.
3. Corriger défauts connus importés.
4. Créer CSS scoped `apps/web/src/app/

... [tronqué, 3804 caractères restants]

---

## 🤖 Assistant

<collaboration_mode># Collaboration Mode: Default

You are now in Default mode. Any previous instructions for other modes (e.g. Plan mode) are no longer active.

Your active mode changes only when new developer instructions with a different `<collaboration_mode>...</collaboration_mode>` change it; user requests or tool descriptions do not change mode by themselves. Known mode names are Default and Plan.

## request_user_input availability

The `request_user_input` tool is unavailable in Default mode. If you call it while in Default mode, it will return an error.

If a decision is necessary and cannot be discovered from local context, ask the user directly. However, in Default mode you should strongly prefer executing the user's request rather than stopping to ask questions.
</collaboration_mode>

---

## 👤 User

# Context from my IDE setup:

## Open tabs:
- page.tsx: apps/web/src/app/(dashboard)/inbox/page.tsx
- mcp.json: /Users/andrewpougary/.cursor/mcp.json
- mobile.mdc: .cursor/rules/mobile.mdc
- slice_3.5.md: .cursor/plans/slice_3.5.md
- package-lock.json: .cursor/plans/package-lock.json

## My request for Codex:
PLEASE IMPLEMENT THIS PLAN:
# Plan Final v2.2 — Sync Web/Mobile + Agents/Automations User (BFF Next, FastAPI, LiteLLM)

## Résumé
1. Ce plan fusionne toutes les itérations v1/v2/v2.1 et intègre la dernière décision produit: sous-agents internes uniquement si nécessaires pour aider Sync, et création d’agents/automations disponible pour les users en V1 via un builder simple.
2. Architecture verrouillée: Web via BFF Next minimal, Mobile direct FastAPI, logique métier 100% FastAPI, LiteLLM comme gateway multi-modèles.
3. Streaming verrouillé: Web en `POST fetch streaming`, Mobile en WebSocket; même contrat `syncEvent` sur les deux.
4. Sécurité verrouillée: aucune mutation IA sans `preview -> apply`; `undo` obligatoire quand `undoable=true`; audit dans `ai_changes`.
5. V1 livre le socle runtime, l’UI `/sync` web+mobile, et un builder simple user pour agents/automations. V1.5 livre l’éditeur avancé.

## Objectifs et critères de succès
1. Page `/sync` web fonctionnelle: chat libre/guidé, draft, preview/apply/undo, changelog.
2. Page `/sync` mobile hors tabs avec même logique événementielle que web.
3. API Sync versionnée et stable (`/api/v1/sync/*`) consommée par web et mobile.
4. Création user d’agents et d’automations en V1 (mode simple).
5. Isolation multi-tenant stricte: toutes les ressources Sync filtrées `workspace_id`, cross-tenant en 404.
6. Résilience réseau: reprise de stream via `seq` (`from_seq` web, `resume_from_seq` mobile).

## Décisions verrouillées
1. Sous-agents internes: pas de pack “visible” forcé. L’orchestrateur peut invoquer des helpers internes (`retrieval/planning/verification`) seulement quand utile.
2. Users: création d’agents personnalisés autorisée en V1 via UI simple.
3. Users: création d’automations autorisée en V1 via UI simple.
4. UI avancée agents/automations (éditeur complet policies/workflows): V1.5.
5. BFF Next reste minimal “comme aujourd’hui”: auth/cookies/proxy/rate-limit léger/stream forwarding, pas de logique métier.
6. Web stream en POST avec fetch streaming, pas EventSource.
7. Mobile stream en WS avec token court.
8. Scheduler calendrier reste déterministe; LLM fournit contraintes/options et justification.

## Architecture cible
1. Flux web: Browser -> Next BFF `/api/sync/*` -> FastAPI `/api/v1/sync/*` -> LiteLLM -> providers.
2. Flux mobile: Expo app -> FastAPI `/api/v1/sync/*` (HTTP + WS) -> LiteLLM -> providers.
3. Exécution outillée: LLM propose -> Policy autorise/refuse -> Executor produit preview -> user confirme apply -> transaction -> log AIChange -> undo possible.
4. Agents user: profil de configuration sur le moteur unique Sync.
5. Automations user: spécifications exécutées par le même runtime outillé/policy.

## API publique finale

### FastAPI `/api/v1/sync`
1. `GET /models`
2. `POST /runs`
3. `GET /runs/{run_id}`
4. `POST /runs/{run_id}/stream`
5. `POST /runs/{run_id}/answer`
6. `POST /runs/{run_id}/apply`
7. `POST /runs/{run_id}/undo`
8. `GET /changes`
9. `POST /runs/{run_id}/ws-token`
10. `WS /runs/{run_id}/ws?token=...`
11. `GET /agents`
12. `POST /agents`
13. `GET /agents/{agent_id}`
14. `PATCH /agents/{agent_id}`
15. `POST /agents/{agent_id}/versions/publish`
16. `GET /automations`
17. `POST /automations`
18. `PATCH /automations/{automation_id}`
19. `POST /automations/{automation_id}/validate`
20. `POST /automations/{automation_id}/activate`
21. `POST /automations/{automation_id}/pause`

### BFF web `/api/sync`
1. Proxy JSON des endpoints FastAPI correspondants.
2. Proxy streaming pour `POST /api/sync/runs/[id]/stream` en forwarding brut de `Response.body`.
3. Aucun endpoint métier ajouté côté Next.

## Contrats partagés (`@momentarise/shared`)

### Nouveau module
1. `packages/shared/src/sync.ts`.
2. Export obligatoire depuis `packages/shared/src/index.ts`.

### Schémas obligatoires
1. `syncRunSchema`, `syncMessageSchema`, `syncQuestionSchema`, `syncDraftSchema`, `syncPreviewSchema`, `syncApplySchema`, `syncUndoSchema`, `syncChangeSchema`, `syncModelSchema`.
2. `syncModelCapabilitiesSchema` avec `supports_tools`, `supports_vision`, `supports_json_schema`, `max_context`, `cost_hint`.
3. `syncEventEnvelopeSchema` + `syncEventSchema` union discriminée.

### Enveloppe `syncEvent` verrouillée
1. `seq` entier strictement croissant par run.
2. `run_id` UUID.
3. `ts` datetime ISO UTC.
4. `trace_id` nullable.
5. `type` dans: `token`, `message`, `question`, `draft`, `preview`, `applied`, `usage`, `warning`, `error`, `done`, `tool_call`, `tool_result`.
6. `payload` validé par schéma dépendant du type.
7. Reprise web: query `from_seq`.
8. Reprise WS: message client `{"type":"resume","from_seq":N}`.

## Modèle de données final

### Runtime V1
1. `ai_runs` avec `workspace_id`, `created_by_user_id`, `agent_id nullable`, `mode`, `status`, `selected_model`, `title`, `context_json`.
2. `ai_runs` snapshots obligatoires: `prompt_version`, `prompt_mode`, `system_prompt_snapshot`, `toolset_snapshot`, `retrieval_snapshot`.
3. `ai_messages` avec `run_id`, `seq`, `role`, `content_json`, `provider`, `model`, `usage_json`, `error_code`.
4. `ai_usage_events` avec tokens/coût/run/provider/model.
5. `ai_questions`.
6. `ai_drafts`.
7. `ai_tool_calls`.

### Mémoire V1
1. `sync_memory_docs` avec source canonique texte + metadata + workspace.
2. `sync_memory_chunks` avec chunk text + provenance + `search_tsv` FTS.

### Agents/Automations V1
1. `agent_profiles` avec `origin=system|user|template`, `prompt_mode`, `tool_policy_json`, `memory_scope_json`, `is_default`.
2. `agent_profile_versions`.
3. `automation_specs` avec JSON spec, `status=draft|active|paused`, `requires_confirm`.
4. `automation_runs` avec `idempotency_key`, `dry_run`, `status`, `error`.

### Audit
1. Réutiliser `ai_changes` pour toute exécution apply/undo Sync.

## Modules backend à créer
1. `apps/api/src/api/v1/sync.py`.
2. `apps/api/src/schemas/sync.py`.
3. `apps/api/src/sync/orchestrator.py`.
4. `apps/api/src/sync/prompt_composer.py`.
5. `apps/api/src/sync/tool_registry.py`.
6. `apps/api/src/sync/tool_policy.py`.
7. `apps/api/src/sync/tool_executor.py`.
8. `apps/api/src/sync/retrieval.py`.
9. `apps/api/src/sync/litellm_client.py`.
10. `apps/api/src/sync/ws_auth.py`.

## Spécifications d’exécution

### PromptComposer
1. Entrées: `agent_profile`, `run_mode`, état user/workspace, snippets retrieval, toolset.
2. Modes: `full`, `minimal`, `none`.
3. Budget token: priorité résumé/snippets, trimming déterministe.
4. Snapshot prompt/toolset/retrieval persisté dans `ai_runs` avant stream.
5. Les helpers internes éventuels utilisent `prompt_mode=minimal` et toolset restreint.

### ToolPolicyEngine
1. Toolset final = intersection policy agent x capacités plan x connecteurs dispo x contexte runtime.
2. Toute action write est `requires_confirm=true`.
3. Write interdit sans preview valide.
4. Enforcement exclusivement backend.

### ToolExecutor
1. `preview` calcule un diff non-mutant.
2. `apply` valide `preview_id`, TTL, idempotency key.
3. `undo` autorisé seulement si `ai_change.undoable=true`.
4. Stream des événements `tool_call` puis `tool_result`.

### Retrieval V1
1. Ingestion texte depuis Inbox/Item/Event vers `sync_memory_docs`.
2. Chunking + index FTS sur `sync_memory_chunks.search_tsv`.
3. Filtrage metadata strict (`workspace_id`, scope agent, tags, date).
4. Injection prompt avec provenance (`doc_id`, `source_type`, offsets).

## Sécurité streaming

### Web
1. `POST /runs/{id}/stream` via fetch streaming.
2. Support `from_seq`.
3. Proxy brut côté BFF.

### Mobile WS
1. `POST /runs/{id}/ws-token` renvoie URL WS + token.
2. Token signé avec claims `sub`, `run`, `exp`, `jti`.
3. TTL 30 à 120 secondes.
4. Anti-replay via stockage `jti` one-shot (cache TTL/table

... [tronqué, 4110 caractères restants]

---

## 🤖 Assistant

Je vais implémenter ça en priorité **Gate A complet + base exécutable Gate B/C** dans ce tour: contrats partagés Sync, modèles/schémas/routes FastAPI, migration DB, proxy BFF `/api/sync/*`, et les premières bases UI/hook web+mobile pour `/sync`. Je commence par inventorier précisément les fichiers existants Sync pour patcher sans casser le travail en cours.

---

## 🤖 Assistant

Je vais procéder en blocs pour sécuriser l’implémentation:  
1) contrats partagés + backend Sync (modèles/schémas/routes/modules),  
2) migration Alembic,  
3) BFF web `/api/sync/*` + proxy stream,  
4) UI/hook `/sync` web et mobile avec builder simple agents/automations.  
Je lance d’abord le bloc 1 et je compile au fur et à mesure.

---

## 🤖 Assistant

Je commence par le contrat partagé `packages/shared/src/sync.ts` (enveloppe `syncEvent`, modèles, run/messages/questions/draft/preview/apply/undo, resume WS) puis j’exporte depuis `index.ts`.

---
