# Joolie Boolie - Project Overview

## Purpose
A unified gaming platform for groups and communities featuring Bingo, Trivia, and future games. Built as a Turborepo monorepo with shared packages.

## Design Philosophy
- Accessible UI (min 18px body text, high contrast, 44x44px touch targets)
- Audience display optimized for projector/large TV
- Dual-screen system (host controls + audience display)

## Tech Stack
- **Monorepo**: Turborepo + pnpm 9.15
- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19 + Tailwind CSS 4 + Zustand 5
- **Backend**: Supabase (PostgreSQL) + OAuth 2.1
- **Testing**: Vitest 4 + Testing Library + Playwright
- **PWA**: Serwist for service workers

## Repository Structure

### Apps
- `apps/bingo` - 75-ball bingo game (Production Ready 85%)
- `apps/trivia` - Team trivia game (Production Ready 95%)
- `apps/platform-hub` - OAuth 2.1 server, game selector (Backend Complete 55-60%)

### Packages
- `packages/ui` - Shared React components (15 components)
- `packages/theme` - Design tokens (10+ themes, typography, spacing)
- `packages/sync` - BroadcastChannel sync + Zustand store
- `packages/database` - Type-safe Supabase client + CRUD
- `packages/auth` - AuthProvider, hooks, ProtectedRoute
- `packages/game-engine` - Base game types and transitions
- `packages/types` - Shared TypeScript types
- `packages/testing` - Test mocks (BroadcastChannel, Audio)
- `packages/error-tracking` - Error logging

## Issue Tracking
- Uses **Linear** (BEA-### format), NOT GitHub Issues
- Use `mcp__linear-server__*` tools for issue operations

## Development Model
- Developed exclusively with AI agents
- No time/effort estimates
- Focus on dependencies, complexity, scope, completion status
