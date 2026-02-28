# Lane Guardrail (Multi-Agents)

## Goal
Prevent accidental edits in hot-path Sync/Capture/Inbox files while parallel work is active.

## Red-zone check
- Script: `scripts/check-lane-boundary.mjs`
- Command: `npm run lane:check`
- Default scope: staged files (`git diff --name-only --cached`)
- Optional scope: working tree (`npm run lane:check -- --all`)

## Git hook setup (local)
```bash
git config core.hooksPath .githooks
```

The hook `.githooks/pre-commit` runs `npm run lane:check` and blocks commits touching red-zone files.

## Policy
If a change is needed in red-zone files, move it to a dedicated integration branch/window with explicit ownership.
