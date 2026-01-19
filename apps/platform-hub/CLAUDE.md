# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beak Gaming Platform Hub** - The central entry point for the Beak Gaming Platform. Provides game selection, authentication, and user dashboard.

**Current State:** Scaffolded with basic game selection UI. Authentication and dashboard not yet implemented.

## Purpose

- **Game Selector:** Links to Bingo and Trivia apps (implemented)
- **Authentication:** Shared login/register for all games (planned)
- **Dashboard:** User profile, saved templates across games (planned)
- **Branding:** Facility logo management (planned)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| Auth | Supabase Auth via @beak-gaming/auth (planned) |

## Implemented Features

- Game selection home page with cards for Bingo and Trivia
- Header and Footer components
- Responsive layout

## Shared Packages

- `@beak-gaming/ui` - Shared UI components (planned usage)
- `@beak-gaming/theme` - Senior-friendly design tokens (planned usage)
- `@beak-gaming/auth` - Supabase authentication (planned usage)

## Key Commands

```bash
# From monorepo root
pnpm dev:hub           # Start dev server on port 3002

# From apps/platform-hub
pnpm dev               # Start dev server
pnpm build             # Build app
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Game selector home page
└── components/
    ├── Header.tsx     # Site header
    ├── Footer.tsx     # Site footer
    ├── GameCard.tsx   # Game selection cards
    └── index.ts       # Component exports
```

## Current Routes

- `/` - Game selector (Bingo, Trivia)

## Planned Routes (TODO)

- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/auth/reset-password` - Password reset
- `/dashboard` - User dashboard (protected)
- `/dashboard/templates` - Saved game templates
- `/dashboard/settings` - User settings

## Future Work (TODO)

- [ ] User authentication with Supabase Auth
- [ ] User profile management
- [ ] Saved game templates
- [ ] Facility branding/logo management
- [ ] Admin dashboard
- [ ] Cross-game session history
