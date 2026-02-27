# Correction timeline & docs learning
_Exported on 27/02/2026 at 22:00:09 UTC+1 from Cursor (2.5.26)_

---

**User**

il n'y a pas un pbm dans la page timeline sur mobile ?

---

**Cursor**

Je vais d’abord inspecter le code de la page `timeline` côté web (et son layout/CSS) pour voir ce qui peut casser en viewport mobile, puis je te poserai 1–2 questions ciblées si plusieurs causes sont possibles.

Je viens de voir que `timeline/page.tsx` rend en fait un “calendar shell” + `CossCalendarAdapter` (donc c’est probablement un problème de layout/overflow/hauteur sur mobile, pas juste un composant “timeline” simple). Je lis maintenant `CalendarPageShell` + `CossCalendarAdapter` pour identifier ce qui casse sur petit écran.

Je soupçonne un souci de responsive: le calendrier “week view” est un `grid-cols-8` (heures + 7 jours). Sur mobile, ça peut devenir illisible ou provoquer un overflow horizontal/zoom. Je vais retrouver le composant `EventCalendar` et voir quel “view” est utilisé sur mobile (week/day/month?) et s’il y a une stratégie responsive déjà prévue.

Je vais analyser la capture d’écran (et relier ça au code de `apps/mobile/app/(tabs)/timeline.tsx`) pour identifier précisément d’où vient le bloc noir à gauche et pourquoi la Timeline déborde/occupe mal l’espace sur mobile.

---

**User**

i think that you have misunderstood. Because in fact... We can scroll and We have the view on the page. The timeline is empty, that's normal since there is no event. it goes from 0 to 23:59 And it's correctly with the red lines on it Except that there is a kind of zone at the bottom of the screen which goes from the navbar Uh... Um... The timeline which contains the text "Timeline 2026-02-27". So, It takes a lot of space on the screen initially I think. I think that's the problem. Also, the placeholder fixes no event today n'est pas très pleasant. Even if you don't need to show it because En fait, We see... We clearly see that there is no event on the timeline when we scroll. Then, I think that some elements are missing For example, when I scroll from left to right, it changes of days, it is visible, but there is no indicator that allows you to see it. I just think that In fact, the timeline is too high and that it's because of of the timeline and the date of today. It was clear enough in the Screen capture that I sent you. c'est censé être facile. il y a bcp de docs. fait ça bien une bonne fois pour otute stp. ne change rien d'autre dans le code.

---

**Cursor**

Je vais ajuster le plan: l’objectif n’est pas de “scroller vers maintenant”, mais de **récupérer l’espace vertical** en évitant la zone vide (titre + grand vide) et de rendre l’état “0 événement” moins intrusif, tout en ajoutant un **indicateur de jour** quand tu swipes horizontalement. Je lis la source de `TimelineList` pour voir les bons hooks/props (changement de date, pagination, etc.).

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**


Implémentation des trois changements en une seule modification.



Résumé des changements dans `apps/mobile/app/(tabs)/timeline.tsx` :

1. **Timeline en flex-1**  
   - Suppression du `View` avec `height: 360`.  
   - Le conteneur de `TimelineList` est maintenant en `className="flex-1"`, la grille occupe tout l’espace sous le header.

2. **Header + indicateur de jour**  
   - Header fixe en haut : `Timeline — {currentDate}`.  
   - `currentDate` est géré en state et mis à jour via `CalendarProvider` avec `onDateChanged={setCurrentDate}`.  
   - Les données sont chargées pour le jour affiché via `useTimeline(currentDate)`.

3. **Zone vide et overlay**  
   - Suppression de l’overlay centré « Aucun évènement ce jour. »  
   - Le `ScrollView` (liste d’événements) n’est rendu que si `events.length > 0`.  
   - Sans événements, plus de grande zone vide en bas.  
   - Loading et erreur sont affichés en barre sous la timeline (pas dans le `ScrollView`).

4. **Détails**  
   - `numberOfDays: 1` et `scrollToNow` sont passés dans `timelineProps`.  
   - Liste d’événements limitée à 40 % de la hauteur (`max-h-[40%]`) pour garder la timeline lisible.

Tu peux vérifier en ouvrant l’onglet Timeline : grille en plein écran, header qui change au swipe, plus d’overlay ni de bloc vide en bas quand il n’y a pas d’événements.

---

**User**

note tes corrections dans docs/ stp, créer un fichier qui remplit ces principes : """
ClawHub
Skills
Upload
Import
Search
System
Light
Dark

Sign in
with GitHub
self-improving-agent
Captures learnings, errors, and corrections to enable continuous improvement. Use when: (1) A command or operation fails unexpectedly, (2) User corrects Clau...

⭐ 758 ·66.5k · 625 current installs · 651 all-time installs
by

@pskoett
Security Scan
VirusTotal
Benign
View report →
OpenClaw
Benign
high confidence

The skill's code, hooks, and instructions are coherent with its stated purpose (capturing learnings and reminders) and do not request unrelated credentials or external installs, but review/opt-in activation is advised because some hooks read tool output and writing/promoting learnings can persist sensitive data.
Like a lobster shell, security has layers — review code before you run it.

Current version
v1.0.11
Download zip
latest
v1.0.11
Files
Compare
Versions
SKILL.md
Self-Improvement Skill
Log learnings and errors to markdown files for continuous improvement. Coding agents can later process these into fixes, and important learnings get promoted to project memory.

Quick Reference
Situation	Action
Command/operation fails	Log to .learnings/ERRORS.md
User corrects you	Log to .learnings/LEARNINGS.md with category correction
User wants missing feature	Log to .learnings/FEATURE_REQUESTS.md
API/external tool fails	Log to .learnings/ERRORS.md with integration details
Knowledge was outdated	Log to .learnings/LEARNINGS.md with category knowledge_gap
Found better approach	Log to .learnings/LEARNINGS.md with category best_practice
Simplify/Harden recurring patterns	Log/update .learnings/LEARNINGS.md with Source: simplify-and-harden and a stable Pattern-Key
Similar to existing entry	Link with **See Also**, consider priority bump
Broadly applicable learning	Promote to CLAUDE.md, AGENTS.md, and/or .github/copilot-instructions.md
Workflow improvements	Promote to AGENTS.md (OpenClaw workspace)
Tool gotchas	Promote to TOOLS.md (OpenClaw workspace)
Behavioral patterns	Promote to SOUL.md (OpenClaw workspace)
OpenClaw Setup (Recommended)
OpenClaw is the primary platform for this skill. It uses workspace-based prompt injection with automatic skill loading.

Installation
Via ClawdHub (recommended):

clawdhub install self-improving-agent
Manual:

git clone https://github.com/peterskoett/self-improving-agent.git ~/.openclaw/skills/self-improving-agent
Remade for openclaw from original repo : https://github.com/pskoett/pskoett-ai-skills - https://github.com/pskoett/pskoett-ai-skills/tree/main/skills/self-improvement

Workspace Structure
OpenClaw injects these files into every session:

~/.openclaw/workspace/
├── AGENTS.md          # Multi-agent workflows, delegation patterns
├── SOUL.md            # Behavioral guidelines, personality, principles
├── TOOLS.md           # Tool capabilities, integration gotchas
├── MEMORY.md          # Long-term memory (main session only)
├── memory/            # Daily memory files
│   └── YYYY-MM-DD.md
└── .learnings/        # This skill's log files
    ├── LEARNINGS.md
    ├── ERRORS.md
    └── FEATURE_REQUESTS.md
Create Learning Files
mkdir -p ~/.openclaw/workspace/.learnings
Then create the log files (or copy from assets/):

LEARNINGS.md — corrections, knowledge gaps, best practices
ERRORS.md — command failures, exceptions
FEATURE_REQUESTS.md — user-requested capabilities
Promotion Targets
When learnings prove broadly applicable, promote them to workspace files:

Learning Type	Promote To	Example
Behavioral patterns	SOUL.md	"Be concise, avoid disclaimers"
Workflow improvements	AGENTS.md	"Spawn sub-agents for long tasks"
Tool gotchas	TOOLS.md	"Git push needs auth configured first"
Inter-Session Communication
OpenClaw provides tools to share learnings across sessions:

sessions_list — View active/recent sessions
sessions_history — Read another session's transcript
sessions_send — Send a learning to another session
sessions_spawn — Spawn a sub-agent for background work
Optional: Enable Hook
For automatic reminders at session start:

# Copy hook to OpenClaw hooks directory
cp -r hooks/openclaw ~/.openclaw/hooks/self-improvement

# Enable it
openclaw hooks enable self-improvement
See references/openclaw-integration.md for complete details.

Generic Setup (Other Agents)
For Claude Code, Codex, Copilot, or other agents, create .learnings/ in your project:

mkdir -p .learnings
Copy templates from assets/ or create files with headers.

Add reference to agent files AGENTS.md, CLAUDE.md, or .github/copilot-instructions.md to remind yourself to log learnings. (this is an alternative to hook-based reminders)
Self-Improvement Workflow
When errors or corrections occur:

Log to .learnings/ERRORS.md, LEARNINGS.md, or FEATURE_REQUESTS.md
Review and promote broadly applicable learnings to:
CLAUDE.md - project facts and conventions
AGENTS.md - workflows and automation
.github/copilot-instructions.md - Copilot context
Logging Format
Learning Entry
Append to .learnings/LEARNINGS.md:

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
Error Entry
Append to .learnings/ERRORS.md:

## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
Actual error message or output


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
Feature Request Entry
Append to .learnings/FEATURE_REQUESTS.md:

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
ID Generation
Format: TYPE-YYYYMMDD-XXX

TYPE: LRN (learning), ERR (error), FEAT (feature)
YYYYMMDD: Current date
XXX: Sequential number or random 3 chars (e.g., 001, A7B)
Examples: LRN-20250115-001, ERR-20250115-A3F, FEAT-20250115-002

Resolving Entries
When an issue is fixed, update the entry:

Change **Status**: pending → **Status**: resolved
Add resolution block after Metadata:
### Resolution
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done
Other status values:

in_progress - Actively being worked on
wont_fix - Decided not to address (add reason in Resolution notes)
promoted - Elevated to CLAUDE.md, AGENTS.md, or .github/copilot-instructions.md
Promoting to Project Memory
When a learning is broadly applicable (not a one-off fix), promote it to permanent project memory.

When to Promote
Learning applies across multiple files/features
Knowledge any contributor (human or AI) should know
Prevents recurring mistakes
Documents project-specific conventions
Promotion Targets
Target	What Belongs There
CLAUDE.md	Project facts, conventions, gotchas for all Claude interactions
AGENTS.md	Agent-specific workflows, tool usage patterns, automation rules
.github/copilot-instructions.md	Project context and conventions for GitHub Copilot
SOUL.md	Behavioral guidelines, communication style, principles (OpenClaw workspace)
TOOLS.md	Tool capabilities, usage patterns, integration gotchas (OpenClaw workspace)
How to Promote
Distill the learning into a concise rule or fact
Add to appropriate section in target file (create file if needed)
Update original entry:
Change **Status**: pending → **Status**: promoted
Add **Promoted**: CLAUDE.md, AGENTS.md, or .github/copilot-instructions.md
Promotion Examples
Learning (verbose):

Project uses pnpm workspaces. Attempted npm install but failed. Lock file is pnpm-lock.yaml. Must use pnpm install.

In CLAUDE.md (concise):

## Build & Dependencies
- Package manager: pnpm (not npm) - use `pnpm install`
Learning (verbose):

When modifying API endpoints, must regenerate TypeScript client. Forgetting this causes type mismatches at runtime.

In AGENTS.md (actionable):

## After API Changes
1. Regenerate client: `pnpm run generate:api`
2. Check for type errors: `pnpm tsc --noEmit`
Recurring Pattern Detection
If logging something similar to an existing entry:

Search first: grep -r "keyword" .learnings/
Link entries: Add **See Also**: ERR-20250110-001 in Metadata
Bump priority if issue keeps recurring
Consider systemic fix: Recurring issues often indicate:
Missing documentation (→ promote to CLAUDE.md or .github/copilot-instructions.md)
Missing automation (→ add to AGENTS.md)
Architectural problem (→ create tech debt ticket)
Simplify & Harden Feed
Use this workflow to ingest recurring patterns from the simplify-and-harden skill and turn them into durable prompt guidance.

Ingestion Workflow
Read simplify_and_harden.learning_loop.candidates from the task summary.
For each candidate, use pattern_key as the stable dedupe key.
Search .learnings/LEARNINGS.md for an existing entry with that key:
grep -n "Pattern-Key: <pattern_key>" .learnings/LEARNINGS.md
If found:
Increment Recurrence-Count
Update Last-Seen
Add See Also links to related entries/tasks
If not found:
Create a new LRN-... entry
Set Source: simplify-and-harden
Set Pattern-Key, Recurrence-Count: 1, and First-Seen/Last-Seen
Promotion Rule (System Prompt Feedback)
Promote recurring patterns into agent context/system prompt files when all are true:

Recurrence-Count >= 3
Seen across at least 2 distinct tasks
Occurred within a 30-day window
Promotion targets:

CLAUDE.md
AGENTS.md
.github/copilot-instructions.md
SOUL.md / TOOLS.md for OpenClaw workspace-level guidance when applicable
Write promoted rules as short prevention rules (what to do before/while coding), not long incident write-ups.

Periodic Review
Review .learnings/ at natural breakpoints:

When to Review
Before starting a new major task
After completing a feature
When working in an area with past learnings
Weekly during active development
Quick Status Check
# Count pending items
grep -h "Status\*\*: pending" .learnings/*.md | wc -l

# List pending high-priority items
grep -B5 "Priority\*\*: high" .learnings/*.md | grep "^## \["

# Find learnings for a specific area
grep -l "Area\*\*: backend" .learnings/*.md
Review Actions
Resolve fixed items
Promote applicable learnings
Link related entries
Escalate recurring issues
Detection Triggers
Automatically log when you notice:

Corrections (→ learning with correction category):

"No, that's not right..."
"Actually, it should be..."
"You're wrong about..."
"That's outdated..."
Feature Requests (→ feature request):

"Can you also..."
"I wish you could..."
"Is there a way to..."
"Why can't you..."
Knowledge Gaps (→ learning with knowledge_gap category):

User provides information you didn't know
Documentation you referenced is outdated
API behavior differs from your understanding
Errors (→ error entry):

Command returns non-zero exit code
Exception or stack trace
Unexpected output or behavior
Timeout or connection failure
Priority Guidelines
Priority	When to Use
critical	Blocks core functionality, data loss risk, security issue
high	Significant impact, affects common workflows, recurring issue
medium	Moderate impact, workaround exists
low	Minor inconvenience, edge case, nice-to-have
Area Tags
Use to filter learnings by codebase region:

Area	Scope
frontend	UI, components, client-side code
backend	API, services, server-side code
infra	CI/CD, deployment, Docker, cloud
tests	Test files, testing utilities, coverage
docs	Documentation, comments, READMEs
config	Configuration files, environment, settings
Best Practices
Log immediately - context is freshest right after the issue
Be specific - future agents need to understand quickly
Include reproduction steps - especially for errors
Link related files - makes fixes easier
Suggest concrete fixes - not just "investigate"
Use consistent categories - enables filtering
Promote aggressively - if in doubt, add to CLAUDE.md or .github/copilot-instructions.md
Review regularly - stale learnings lose value
Gitignore Options
Keep learnings local (per-developer):

.learnings/
Track learnings in repo (team-wide): Don't add to .gitignore - learnings become shared knowledge.

Hybrid (track templates, ignore entries):

.learnings/*.md
!.learnings/.gitkeep
Hook Integration
Enable automatic reminders through agent hooks. This is opt-in - you must explicitly configure hooks.

Quick Setup (Claude Code / Codex)
Create .claude/settings.json in your project:

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
This injects a learning evaluation reminder after each prompt (~50-100 tokens overhead).

Full Setup (With Error Detection)
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
Available Hook Scripts
Script	Hook Type	Purpose
scripts/activator.sh	UserPromptSubmit	Reminds to evaluate learnings after tasks
scripts/error-detector.sh	PostToolUse (Bash)	Triggers on command errors
See references/hooks-setup.md for detailed configuration and troubleshooting.

Automatic Skill Extraction
When a learning is valuable enough to become a reusable skill, extract it using the provided helper.

Skill Extraction Criteria
A learning qualifies for skill extraction when ANY of these apply:

Criterion	Description
Recurring	Has See Also links to 2+ similar issues
Verified	Status is resolved with working fix
Non-obvious	Required actual debugging/investigation to discover
Broadly applicable	Not project-specific; useful across codebases
User-flagged	User says "save this as a skill" or similar
Extraction Workflow
Identify candidate: Learning meets extraction criteria
Run helper (or create manually):
./skills/self-improvement/scripts/extract-skill.sh skill-name --dry-run
./skills/self-improvement/scripts/extract-skill.sh skill-name
Customize SKILL.md: Fill in template with learning content
Update learning: Set status to promoted_to_skill, add Skill-Path
Verify: Read skill in fresh session to ensure it's self-contained
Manual Extraction
If you prefer manual creation:

Create skills/<skill-name>/SKILL.md
Use template from assets/SKILL-TEMPLATE.md
Follow Agent Skills spec:
YAML frontmatter with name and description
Name must match folder name
No README.md inside skill folder
Extraction Detection Triggers
Watch for these signals that a learning should become a skill:

In conversation:

"Save this as a skill"
"I keep running into this"
"This would be useful for other projects"
"Remember this pattern"
In learning entries:

Multiple See Also links (recurring issue)
High priority + resolved status
Category: best_practice with broad applicability
User feedback praising the solution
Skill Quality Gates
Before extraction, verify:

 Solution is tested and working
 Description is clear without original context
 Code examples are self-contained
 No project-specific hardcoded values
 Follows skill naming conventions (lowercase, hyphens)
Multi-Agent Support
This skill works across different AI coding agents with agent-specific activation.

Claude Code
Activation: Hooks (UserPromptSubmit, PostToolUse) Setup: .claude/settings.json with hook configuration Detection: Automatic via hook scripts

Codex CLI
Activation: Hooks (same pattern as Claude Code) Setup: .codex/settings.json with hook configuration Detection: Automatic via hook scripts

GitHub Copilot
Activation: Manual (no hook support) Setup: Add to .github/copilot-instructions.md:

## Self-Improvement

After solving non-obvious issues, consider logging to `.learnings/`:
1. Use format from self-improvement skill
2. Link related entries with See Also
3. Promote high-value learnings to skills

Ask in chat: "Should I log this as a learning?"
Detection: Manual review at session end

OpenClaw
Activation: Workspace injection + inter-agent messaging Setup: See "OpenClaw Setup" section above Detection: Via session tools and workspace files

Agent-Agnostic Guidance
Regardless of agent, apply self-improvement when you:

Discover something non-obvious - solution wasn't immediate
Correct yourself - initial approach was wrong
Learn project conventions - discovered undocumented patterns
Hit unexpected errors - especially if diagnosis was difficult
Find better approaches - improved on your original solution
Copilot Chat Integration
For Copilot users, add this to your prompts when relevant:

After completing this task, evaluate if any learnings should be logged to .learnings/ using the self-improvement skill format.

Or use quick prompts:

"Log this to learnings"
"Create a skill from this solution"
"Check .learnings/ for related issues"
Files
15 total

SKILL.md
19 KB

.learnings/FEATURE_REQUESTS.md
84 B

.learnings/ERRORS.md
75 B

.learnings/LEARNINGS.md
99 B

assets/SKILL-TEMPLATE.md
3.3 KB

assets/LEARNINGS.md
1.1 KB

scripts/activator.sh
680 B

scripts/extract-skill.sh
5.2 KB

scripts/error-detector.sh
1.3 KB

hooks/openclaw/handler.js
1.6 KB

hooks/openclaw/HOOK.md
589 B

hooks/openclaw/handler.ts
1.8 KB

references/examples.md
8.1 KB

references/openclaw-integration.md
5.5 KB

references/hooks-setup.md
4.8 KB
Select a file
Select a file to preview.
Comments
Sign in to comment.

@gao51-qw
hi
@pskoett
@shayena84-byte
If you do not know how to do that simply ask the Openclaw to make sure the AGENTS.md has the instruction about the skill
 
## Self-Improvement Workflow

When errors or corrections occur:
1. Log to `.learnings/ERRORS.md`, `LEARNINGS.md`, or `FEATURE_REQUESTS.md`.
2. Review and promote broadly applicable learnings to:
   - `AGENTS.md` - workflows and automation
@shayena84-byte
My openClaw tells me that I need to manually enable hooks for activator.sh and error-detector.sh, but I don't see this in the manual for this skill.
@hah31
yoo ts pretty sick icl
@pskoett
Best learnings from my own claw :)
2. LRN-20260201-001 — Always run coding agents in YOLO mode ✅ promoted
3. LRN-20260201-002 — Don't interrupt coding agents while working ✅ promoted
4. LRN-20260201-003 — Codex YOLO flag is --yolo ✅ promoted
5. LRN-20260201-004 — Actually follow the self-improvement reminder ⏳ pending
@pskoett
@vadbars @rohits79  I removed the hard OpenClaw env requirement from SKILL.md so CLAUDE_TOOL_OUTPUT will no
  longer block/skip the skill. Made a mistake yesterday when updating and it was caught in scanning loop. The TOOL_OUTPUT is not valid here in OpenClaw I use this skill mainly for Coding Agents not Openclaw
@vadbars
@rohits79, @pskoett
> this shows as blocked because of missing `CLAUDE_TOOL_OUTPUT`, what is this output env point to? The readme or description does not explain

It's not clear to me either.
@rohits79
this shows as blocked because of missing `CLAUDE_TOOL_OUTPUT`, what is this output env point to? The readme or description does not explain
@devonakelley
Love this pattern. The instinct is exactly right, agents that don't learn from mistakes are broken by design. We took a different angle with Kalibr where instead of logging for human/agent review, the system closes the loop automatically and reroutes around failures in real time based on outcome telemetry. Different tradeoffs. Yours is zero-config and immediate, ours requires a backend but the agent never has to "read its diary" to improve. Would be genuinely interesting to see these composed together, log the learnings AND auto-reroute while the fix propagates.
@pskoett
pair it with https://clawhub.ai/pskoett/simplify-and-harden
@pskoett
Doremo it will use a little more yes since you are added to the sessions initial context
@doremo2021
Will this use a lot of credits or tokens?
@pskoett
Hey Isaiahfeldt the hook does not ensure learnings are recorded, it injects a reminder into the models context at the beginning of a session. Another solution is to reference the workflow in the agents.md file 

Like so.

## Self-Improvement Workflow

When errors or corrections occur:
1. Log to `.learnings/ERRORS.md`, `LEARNINGS.md`, or `FEATURE_REQUESTS.md`.
2. Review and promote broadly applicable learnings to:
   - `CLAUDE.md` - project facts and conventions
   - `AGENTS.md` - workflows and automation
   - `.github/copilot-instructions.md` - Copilot context

https://github.com/pskoett/pskoett-ai-skills/blob/main/AGENTS.md

Also worth noting: how reliably the agent follows through depends on the model. Opus/Sonnet tend to pick up on injected context better than Haiku.
@Isaiahfeldt
Is there any logging I can look through to see if this is working as intended? I have hook enabled and have set up `/workspace/,learnings/` along with its supporting md files but I've gone entire day with any of the three being written to once.. which is odd because there have definitely been errors since enabling the hook. It definitely says enabled in my config as well as ready in `openclaw hooks`.. Not sure what im missing
@pskoett
there is a PR already to fix the CLI install issue
@pskoett
I have not changed anything that would affect this skill being installable via CLI/API. I think the issue is ClawHub related
@rangegroup-commits
Contact ClawHub support — report that the skill is visible on the web but not installable via CLI/API
@h4us91
why is the skill delisted ?
@pskoett
fixed bug with sub-agent session failing
@0xBosch
open claw 1.30 sub session spawn failing with the hook enabled
@wdsing25-tech
Top
@pskoett
updated with openclaw hook
@pskoett
updated for openclaw
@pskoett
the .learnings folder and files are in your root
@larsonreever
Hit unexpected errors , tried again and worked like a charm with
codeconductor.ai
@TheEditor
Is this meant to be installed in each project separately or at a top-level folder?
@pskoett
updated again with clawdbot too and skill pattern
@pskoett
This is a generic version of this skill you need to adjust it to your agent
ClawHub · An OpenClaw project · Open source (MIT) · Peter Steinberger."""

---

**Cursor**


Création d'un fichier dans `project/docs/` qui décrit le workflow d'auto-amélioration et qui consigne les corrections apportées à la page Timeline mobile.



Création du fichier `project/docs/self-improvement.md` décrivant le workflow et consignant les corrections de la Timeline mobile.



Création du dossier `.learnings/` et des trois fichiers prévus par le workflow.



Voici ce qui a été mis en place.

**1. `project/docs/self-improvement.md`**  
Document qui décrit le workflow d’auto-amélioration :

- **Référence rapide** : tableau Situation → Action (erreur → ERRORS.md, correction → LEARNINGS.md, feature → FEATURE_REQUESTS.md, etc.).
- **Structure du journal** : `.learnings/` avec les 3 fichiers, pas de secrets.
- **Formats** : IDs (LRN/ERR/FEAT-YYYYMMDD-XXX), champs (Priority, Status, Area), sections pour chaque type d’entrée, bloc Resolution.
- **Promotion** : quand passer dans CLAUDE.md, AGENTS.md, `.github/copilot-instructions.md`, avec des règles courtes.
- **Déclencheurs** : corrections, demandes de feature, knowledge gap, erreurs.
- **Corrections récentes** : entrée détaillée pour la Timeline mobile (layout flex-1, header + indicateur de jour, suppression zone vide et overlay, fichiers concernés).

**2. Dossier `.learnings/` et 3 fichiers**

- **LEARNINGS.md** : en-tête + première entrée `[LRN-20260227-001]` (Timeline mobile), status `resolved`, lien vers `project/docs/self-improvement.md`.
- **ERRORS.md** et **FEATURE_REQUESTS.md** : en-têtes et consignes, prêts à recevoir des entrées.

Les principes du skill self-improving-agent (ClawHub) sont repris et adaptés au projet ; les corrections Timeline sont notées dans `project/docs/self-improvement.md` et reprises dans `.learnings/LEARNINGS.md`. La règle existante `.cursor/rules/self-improvement.mdc` reste la référence pour « quand écrire quoi » au quotidien.

---

**User**

tu peux créer une cursor rules pour alimenter ça dès qu'il y a une erreur ou truc du genre stp ? de plus ça me permettra de logguer mes idées plutot que de les noter dans des "feuilles volantes" : @project/notes.md ou @project/docs/mobile-components-reference.md par exemple...
D'ailleurs si tu peux aussi m'aider à organiser la doc stp...

---

**Cursor**


Enrichissant la règle self-improvement pour qu'elle déclenche le logging automatique et en ajoutant la prise en charge des idées, puis en organisant la doc.



Voici ce qui a été mis en place.

---

### 1. Règle Cursor pour alimenter `.learnings/`

**Fichier** : `.cursor/rules/self-improvement.mdc` (alwaysApply: true)

- **Comportement** : après une erreur (commande qui échoue, exception, crash), une entrée doit être proposée ou écrite dans `ERRORS.md`. Après une correction de l’utilisateur → `LEARNINGS.md`. Quand une idée est exprimée → proposer de la mettre dans `FEATURE_REQUESTS.md` ou `IDEAS.md` plutôt que dans des feuilles volantes.
- **Tableau** : Erreur → ERRORS, Correction → LEARNINGS, Idée / feature → FEATURE_REQUESTS ou IDEAS.
- **Création** : si `.learnings/` ou les fichiers manquent, ils sont créés.
- **Formats** : les mini-templates (ERR, LRN) sont dans la règle ; le détail (IDs, Priority, Status, métadonnées) reste dans `project/docs/self-improvement.md`.

---

### 2. Support des idées (plus de feuilles volantes)

- **`.learnings/IDEAS.md`** : créé pour les idées en vrac (format libre, date + courte description). À faire évoluer vers FEATURE_REQUESTS ou LEARNINGS quand c’est mûr.
- **`project/docs/self-improvement.md`** : 
  - Référence rapide mise à jour avec la ligne « Idée produit / technique en vrac » → `IDEAS.md`.
  - Structure du journal mise à jour avec `IDEAS.md`.
  - Nouvelle section **« Idées au lieu de feuilles volantes »** : où loguer les idées (FEATURE_REQUESTS / IDEAS), ce qui reste dans `notes.md` (intention produit), et ce qui va dans les références (ex. mobile-components).

---

### 3. Organisation de la doc

- **`project/docs/README.md`** (nouveau) :
  - Index des fichiers du dossier (self-improvement, mobile-components-reference, deploy-backend-render).
  - **« Où mettre quoi »** : décisions techniques → `project/docs/` ; erreurs / corrections / idées → `.learnings/` ; intention produit → `notes.md` ; specs → `project/specs/` ; ledger → `project/distilled/`.
  - Rappel de la règle Cursor self-improvement.

- **`project/notes.md`** :
  - En-tête ajouté : ce fichier = intention produit et décisions de fond ; idées en vrac, bugs, erreurs, corrections → `.learnings/`, avec renvoi vers `project/docs/self-improvement.md` et la règle.

Tu as maintenant une règle qui pousse à logger erreurs et idées dans `.learnings/`, un fichier dédié aux idées (`IDEAS.md`), et une doc organisée avec un README et une clarification de l’usage de `notes.md`.

---

**User**

non le notes est à enlever.


---

**Cursor**


C’est fait : le bloc d’explication en tête de `project/notes.md` a été retiré. Le fichier commence à nouveau directement par le titre et la section « Slice 2 — Item Detail ».

---

**User**

non le ficheir est a supprimer, 40 000 doc pour la même chose. 

---

**Cursor**


Mise à jour des références à `notes.md` dans le projet.



C’est fait. `project/notes.md` a été supprimé et toutes les références ont été mises à jour :

- **project/docs/README.md** : plus de mention de `notes.md` ; intention produit → doc dédié dans `project/docs/`.
- **.cursor/rules/self-improvement.mdc** : plus de référence à `notes.md`, uniquement « feuilles volantes » / « doc épars ».
- **project/docs/self-improvement.md** : section « Idées au lieu de feuilles volantes » sans `notes.md` ; intention produit → `project/docs/`.
- **README.md** (racine) : arborescence `project/` sans `notes.md`, avec `docs/` à la place.
- **.cursor/rules/project.mdc** : idem, structure sans `notes.md`, avec `docs/`.

Le plan `.cursor/plans/01_slice_0_mobile_+_docs_e3830dd5.plan.md` contient encore une mention historique de mise à jour de `notes.md` ; je l’ai laissée telle quelle (contexte passé). Tu peux la supprimer ou adapter le plan si tu veux.

