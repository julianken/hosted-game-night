# Context Packet: Phase 0

## Problem
Convert monorepo from "Platform Hub + 2 OAuth games + Supabase" to "2 standalone games, no auth, no Supabase, localStorage only." Delete ~43K lines, build 4 Zustand stores, rewire components, maintain working build throughout.

## Key Constraints
- Build must stay green at every step (lint, typecheck, test:run pass)
- Monorepo structure retained (shared packages stay shared)
- Sentry/Grafana observability retained (monitoring tunnels stay)
- Trivia-api proxy stays (CORS requirement)
- Both games have guestModeEnabled: true already
- No production user data migration needed
- No Supabase dependency remains after conversion

## Key Facts from Analysis
- Platform Hub: 159 files, 28,240 lines → DELETE entirely
- Auth package: 43 files, 8,364 lines → DELETE entirely
- Auth API routes (games): 7 files, 378 lines → DELETE
- Template/preset/question-set API routes: 19 files, 4,960 lines → DELETE (after stores built)
- Middleware: 2 files, 72 lines → REPLACE with passthrough
- 72% of tests survive unchanged (179 of 247)
- 4 new Zustand stores: bingo-templates, trivia-templates, trivia-presets, trivia-question-sets
- Existing persist pattern: settings-store.ts (version 4 with migration), audio-store.ts
- Components to rewire: TemplateSelector (both apps), SaveTemplateModal (both apps), PresetSelector, QuestionSetsPage, QuestionSetEditorModal, QuestionSetImporter, TriviaApiImporter, useAutoLoadDefaultTemplate, home pages (both apps)
- Validation to move: validateQuestions() from 4 API routes → shared client module
- Env vars to remove: 13+ OAuth/Supabase vars per app
- Supabase packages to remove: @supabase/ssr, @supabase/supabase-js, @supabase/postgrest-js

## Evaluation Criteria
- Build stability (25%): each step keeps build green
- Correctness (20%): plan covers all changes
- Parallelizability (15%): maximize parallel work
- Risk containment (15%): risky steps isolated
- Testability (15%): each step verifiable
- Minimal diff (10%): no unnecessary churn

## Non-Goals
- Splitting into separate repos
- Building data migration/export tools
- Redesigning game mechanics
- Adding new features
