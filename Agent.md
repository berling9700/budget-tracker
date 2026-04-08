# Agent Guide - budget-tracker

## Purpose
This project is a manual yearly budget tracker built with React + TypeScript + Vite.
Use this guide to make safe, consistent changes.

## Tech Stack
- React 19 with TypeScript
- Vite for local dev and builds
- Recharts for charts and dashboard visuals
- Gemini integrations in `src/services/`

## Runbook
- Install deps: `npm install`
- Local dev: `npm run dev`
- Build: `npm run build`
- Preview production build: `npm run preview`

Environment:
- Set `GEMINI_API_KEY` in `.env.local` before using AI chat/service features.

## Important Project Areas
- `src/App.tsx`: top-level application wiring
- `src/components/`: budget, investments, net worth dashboards, and modals
- `src/components/modals/`: data-entry and detail modals
- `src/components/ui/`: shared UI primitives (button, modal, dropdown, nav, spinner, chatbot)
- `src/services/`: external/data services (`gemini*`, market data)
- `types.ts`: shared domain and app types

## Coding Conventions
- Prefer function components and typed props/interfaces.
- Keep business logic in components/services, not in UI primitives.
- Reuse existing UI components from `src/components/ui/` before creating new ones.
- Match existing naming style:
  - Components: PascalCase (e.g., `BudgetView.tsx`)
  - Services/types/functions: camelCase
- Avoid adding new dependencies unless clearly necessary.

## Editing Guardrails
- Preserve current user data flow and calculations for budget and net worth views.
- Keep changes scoped; avoid broad refactors unless explicitly requested.
- Do not hardcode secrets or API keys.
- If touching Gemini-related features, fail gracefully when key/config is missing.

## Validation Checklist
Before finishing:
- App starts locally with `npm run dev` (when deps/env are present).
- TypeScript/React edits compile with `npm run build`.
- Updated UI behavior is consistent across impacted views and modals.
- No unrelated files are changed.

## Change Notes
When submitting changes, include:
- What changed
- Why it changed
- Any follow-up verification steps
