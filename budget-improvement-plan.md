# Budget Tracker Improvement Plan

## Goals
- Keep data in sync across phone and computer.
- Make CSV import the primary, low-friction workflow.
- Improve usability and visual polish, especially on mobile.

## Current Baseline
- Persistence is currently local-only in `src/App.tsx` via `localStorage`.
- Import/export exists, but cross-device consistency depends on manual file movement.
- Styling is mostly utility classes with some legacy CSS still present.

## Phase 1: Foundation (no behavior change)
- Extract storage logic from `src/App.tsx` into a small adapter layer:
  - `loadAppData()`, `saveAppData()`, `loadSettings()`, `saveSettings()`
- Keep `localStorage` as the active backend for now.
- Add metadata (`updatedAt`, `version`) to persisted app payload.
- Keep all existing UI and budgeting behavior the same.

Why this matters:
- This creates a clean seam to add cloud sync later without a risky rewrite.

## Phase 2: Cross-Device Sync MVP
- Add cloud backup/restore tied to a user account (email + magic link or similar).
- Store one JSON snapshot per user as the initial sync model.
- Add visible sync controls/status:
  - `Sync now`
  - `Last synced at ...`
  - basic sync error message/retry
- After backup/restore is stable, optionally enable automatic sync:
  - on app start
  - periodic background sync
  - before app close/visibility change when possible

Why this matters:
- You get practical phone/computer consistency quickly, with limited complexity.

## Phase 2A: Google Sheets Sync Path (low-cost alternative)
- Use Google Sheets as the remote data store for a single user snapshot.
- Prefer a private Google Sheet with a lightweight Google Apps Script API layer:
  - `GET /snapshot` to load current app JSON
  - `POST /snapshot` to save updated app JSON
- Keep `localStorage` as local cache/offline fallback.
- Add sync metadata (`updatedAt`, `version`) and use last-write-wins with a stale-data warning.
- Add simple sync UI states:
  - connected/not connected
  - last synced timestamp
  - sync success/error status

Why this matters:
- It provides cross-device sync with minimal infrastructure and typically near-zero cost for personal usage.

## Phase 3: CSV Import-First Improvements (replaces recurring-entry focus)
- Build a robust import pipeline that handles different bank/card CSV formats:
  - column mapping UI (`date`, `description`, `amount`, `category` optional)
  - save mapping presets per institution/file shape
  - automatic delimiter/header detection where possible
- Improve categorization quality:
  - merchant normalization rules (e.g., "AMZN Mktp" -> "Amazon")
  - user-maintained categorization rules (contains/regex -> category)
  - confidence indicators and easy bulk recategorization
- Add duplicate detection heuristics during import:
  - same date +/- 1 day, same amount, similar merchant text
- Add import review step:
  - show unresolved rows
  - quick category suggestions
  - apply-to-all actions

Why this matters:
- It aligns directly with your real workflow: upload statements, review, and confirm.

## Phase 4: UX and Styling
- Mobile month selector: dropdown on small screens, segmented buttons on larger screens.
- Safer modals: warn before closing when form is dirty.
- Replace browser `alert/confirm` with in-app dialogs/toasts.
- Improve dense list/table readability with responsive card layouts.
- Standardize spacing/type/color tokens and remove unused legacy CSS.

## Cost and Service Options (for Phase 2)
- **Zero/very low cost option:** keep local-only plus optional manual JSON export/import (no backend).
- **Low-cost managed backend option:** use a hosted database/auth/storage service with free tier (often enough for one user).
- **Self-host option:** run your own backend/storage on a small VPS (more setup/maintenance, predictable monthly server cost).

## Suggested First Implementation Order
1. Phase 1 storage adapter extraction.
2. Phase 3 import pipeline upgrades (mapping + categorization rules).
3. Phase 2A Google Sheets sync MVP (Apps Script endpoint + status), or Phase 2 managed backend.
4. Phase 4 UI/styling pass.

## Success Criteria
- Same data appears on phone and desktop after sync.
- CSV imports from your typical institutions require minimal manual cleanup.
- Categorization accuracy improves over time via saved rules.
- Mobile interactions are easier and less error-prone.
