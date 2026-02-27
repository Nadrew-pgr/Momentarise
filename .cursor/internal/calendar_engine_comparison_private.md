# Internal Technical Comparison — Coss Event Calendar vs FullCalendar

## Scope and baseline
- Comparison target: web calendar engines only.
- Pages under test:
  - `/timeline` -> Coss engine
  - `/calendar` -> FullCalendar engine
- Shared architecture (identical for both):
  - FastAPI as source of truth (`/api/v1/events*`)
  - Next.js BFF routes (`/api/events*`)
  - React Query hooks + optimistic UI + rollback on mutation failure
  - Multi-device conflict guard via `last_known_updated_at` and backend `409`

## UI / UX comparison

### 1) Customization model
- Coss:
  - Total rendering control because component internals are in-repo.
  - Higher freedom for bespoke interaction and layout.
  - Every visual/behavior edge-case is our maintenance burden.
- FullCalendar:
  - High but bounded customization (`eventContent`, classNames, custom toolbar/dialog).
  - Faster to ship consistent views (Month/Week/Day).
  - Some internals are framework-defined and less hackable than local source.

### 2) Interaction completeness
- Coss:
  - Create/edit/delete + drag/resize already available in our custom stack.
  - Behavior quality depends on our own DnD/event math code.
- FullCalendar:
  - Native and mature callbacks: `select`, `eventDrop`, `eventResize`, `eventClick`, `datesSet`.
  - Lower risk of regression on standard interactions.

### 3) Empty/error behavior and resilience
- Coss:
  - Fully controllable UX states, but requires us to wire and maintain all states.
- FullCalendar:
  - Grid remains visible by default; errors can be overlaid via shell component.
  - Good fit for non-blocking network failure UX.

### 4) Accessibility and cross-browser confidence
- Coss:
  - Depends on our own test coverage and fixes.
- FullCalendar:
  - Better default maturity from broad production usage.

## Backend / BFF comparison impact

### 1) API contract impact
- No engine requires API changes for current Momentarise scope.
- Both engines can run on existing endpoints:
  - `GET/POST /events`
  - `PATCH/DELETE /events/{id}`
  - `POST /events/{id}/start`
  - `POST /events/{id}/stop`

### 2) Conflict and consistency (multi-device)
- Engine-agnostic:
  - Conflict handling is solved in controller/backend, not in UI engine.
  - Strategy remains: send `last_known_updated_at`, on `409` -> toast + refetch + visual rollback.

### 3) BFF discipline
- Both integrations remain compliant with web BFF architecture:
  - no direct browser calls to FastAPI
  - auth/cookies and proxy behavior remain centralized in Next route handlers.

### 4) Data model coupling
- Coss and FullCalendar both consume the same canonical model:
  - `Event` linked to `Item` (`event.item_id`)
  - event title sourced from `item.title`
- No need for dual backend models.

## Business capability comparison (Momentarise-specific)

### 1) Current Phase 1 capabilities
- Required now:
  - Month/Week/Day planning
  - CRUD events
  - start/stop tracking
  - stable behavior when API is flaky
- Result:
  - both engines are viable
  - FullCalendar reaches production-grade behavior faster

### 2) Near-term product roadmap fit
- Recurrence:
  - Coss: custom build needed
  - FullCalendar: ecosystem support exists (plugin path)
- Team/resource scheduling:
  - Coss: major custom investment
  - FullCalendar: available in premium scheduler tier
- Decision implication:
  - if roadmap soon requires complex scheduling semantics, FullCalendar path de-risks delivery.

### 3) Cost and maintenance economics
- Coss:
  - lower vendor dependency
  - higher engineering maintenance (calendar engine becomes our product)
- FullCalendar:
  - external dependency risk
  - lower internal maintenance for core calendar mechanics

## Observed technical caveats in this repo
- FullCalendar v6 packages do not expose the old `@fullcalendar/*/index.css` import paths.
- React and ReactDOM must be exact version match in web workspace.
- These are integration constraints, not blocker-level product risks.

## Decision rubric (recommended)
Use this weighted score per sprint and decide after 2-3 sprints of real usage:
1. Reliability in QA and staging (bugs per sprint)
2. Change velocity (time to implement requested UX changes)
3. Regression rate after refactors
4. Multi-device conflict correctness
5. Developer maintenance cost

## Internal recommendation (current)
1. Keep both pages active during evaluation window (`/timeline` and `/calendar`).
2. Keep adapter architecture regardless of winner.
3. If no critical blocker appears, prefer FullCalendar as future default for operational stability and roadmap flexibility.
4. Preserve Coss as experimentation layer for bespoke UI patterns until final cutoff.

## Parity status (UI/UX)
- Parity layer implemented via shared primitives:
  - shared toolbar (`Today`, prev/next, view switch, `New event`)
  - shared event dialog (same action order and controls, including tracking toggle)
  - shared keyboard shortcuts (`M/W/D/A`)
  - shared agenda rendering (Coss `AgendaView` used for both engines)
  - aligned sizing/spacing tokens through `.calendar-parity` styles
- Decision note:
  - Same UX layer, interchangeable engine adapters.
  - Engine differences are intentionally internal for technical comparison only.

## Final recommendation (long-term)
- Keep both adapters to preserve reversibility and controlled A/B evaluation.
- Make FullCalendar the default production engine after parity sign-off:
  - lower long-term maintenance risk on drag/resize/date-grid edge cases,
  - better roadmap safety for recurrence and advanced scheduling needs.
- Keep Coss as an internal experimentation layer for high-velocity UI iteration.
