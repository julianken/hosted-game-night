# Phase 0: Problem Statement — Standalone Conversion Plan

## Problem Restatement

1. Convert the Joolie Boolie monorepo from 3 apps (Platform Hub + Bingo + Trivia) with OAuth/Supabase to 2 standalone games with no auth, no Supabase, localStorage for all data.
2. Delete ~261 files / ~43K lines (33% of monorepo) including Platform Hub entirely, auth package, auth API routes, Supabase migrations, and auth-coupled tests.
3. Build 4 new Zustand stores with persist middleware for templates, presets, and question-sets (currently stored in Supabase).
4. Rewire ~15 UI components that currently fetch from API routes to read/write from localStorage stores.
5. Simplify middleware from 4-step JWT chain to passthrough.
6. Remove all Supabase dependencies (packages, env vars, migrations) — confirmed zero remaining usage.
7. Keep trivia-api proxy (CORS), monitoring tunnels (Sentry), and CSP report routes.
8. Maintain working build and passing tests throughout conversion.
9. Simplify home pages from auth-conditional rendering to single "Play" path.
10. Update all config: turbo.json, package.json scripts, env validation, Vercel deployment.

## Assumptions
- No production users with saved data that need migration (owner confirmed standalone intent)
- Monorepo structure is retained (not splitting into separate repos)
- Sentry/Grafana observability retained
- Both games already have guestModeEnabled: true in middleware
- game_sessions table was never built in UI (non-regression)
- Trivia-api proxy has zero Supabase dependency (verified)

## Domain Tags
1. **Architecture** — Deletion sequencing, dependency ordering, package graph
2. **React/Components** — Component rewiring, store integration, home page changes
3. **State Management** — 4 new Zustand persist stores, validation migration
4. **Testing** — Test deletion/creation strategy, E2E fixture simplification
5. **DevOps/Infra** — Config cleanup, env vars, deployment, build pipeline

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Build stability | 25% | Does each step maintain a working build? |
| Correctness | 20% | Does the plan cover all deletion/creation/rewiring? |
| Parallelizability | 15% | How much work can run in parallel? |
| Risk containment | 15% | Are risky steps isolated and reversible? |
| Testability | 15% | Can each step be verified before proceeding? |
| Minimal diff | 10% | Does the plan avoid unnecessary churn? |

## 5 Investigation Areas

### Area 1: Deletion Sequencing & Dependency Order
**Domain:** Architecture
**Focus:** What order must things be deleted to keep the build green at each step? Map the dependency graph of deletions. Which deletions are independent? Which must come before others?

### Area 2: Zustand Store Design & Implementation
**Domain:** State Management
**Focus:** Exact design of the 4 new stores. What's the type shape, persist config, validation logic, default handling? How do they follow existing patterns (settings-store.ts)?

### Area 3: Component Rewiring
**Domain:** React/Components
**Focus:** Which components change? What's the minimal diff for each? How do TemplateSelector, SaveTemplateModal, PresetSelector, QuestionSetsPage, useAutoLoadDefaultTemplate, home pages change?

### Area 4: Test Strategy
**Domain:** Testing
**Focus:** Which tests delete, which survive, which need creation? How to keep tests passing throughout? E2E fixture changes? Playwright config updates?

### Area 5: Config & Deployment Cleanup
**Domain:** DevOps/Infra
**Focus:** turbo.json, root package.json scripts, env validation files, .env.local, Vercel project changes, package.json dependency removal, SW cleanup.
