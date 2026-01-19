# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beak Bingo** - A cloud-based, web-accessible Bingo system designed for retirement communities. Replaces USB-based solutions with a modern PWA that works offline, supports dual-screen presentation (presenter controls + audience display), and provides admin accounts for saved configurations.

**Current State:** Pre-code planning stage. Documentation exists in `/documentation/`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| Backend (BFF) | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (via BFF) |
| State Management | Zustand |
| Offline | PWA with Service Worker |
| Hosting | Vercel |

## Architecture

Frontend never talks directly to Supabase. All requests go through API routes (BFF pattern).

**Dual-Screen System:**
- Presenter window (controls): Game controls, pattern selector, speed control, audio toggle
- Audience window (projection): Large ball display, full bingo board, winning pattern
- Sync via BroadcastChannel API for same-device window communication

## Key Commands

Once the project is initialized:
```bash
# Initialize (from spec)
npx create-next-app@latest beak-bingo --typescript --tailwind --eslint --app --src-dir

# Development
npm run dev

# Build
npm run build

# Start production
npm start
```

## Project Structure (Planned)

```
src/
├── app/
│   ├── api/           # BFF routes (auth, profile, templates)
│   ├── play/          # Presenter view
│   ├── display/       # Audience view
│   └── dashboard/     # Template management (auth required)
├── components/
│   ├── presenter/     # Controls, pattern selector, call history
│   ├── audience/      # Large ball display, bingo board
│   └── ui/            # Shared components
├── lib/
│   ├── game/          # engine.ts, patterns.ts
│   ├── audio/         # player.ts
│   └── sync/          # broadcast.ts (BroadcastChannel wrapper)
└── hooks/             # useGame, useAudio, useSync, useAuth
```

## Design Requirements

- **Senior-friendly:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Keyboard shortcuts:** Space=roll, P=pause, R=reset, U=undo, M=mute

## Key Documentation

- `/documentation/mvp_specification.md` - Detailed MVP requirements, data models, API routes
- `/documentation/project_plan.md` - Phased development plan with checklists

## Game Details

- 75-ball format: B:1-15, I:16-30, N:31-45, G:46-60, O:61-75
- Free space in center
- 15-20 MVP patterns: lines, corners, frames, shapes (X, diamond, heart), letters (T, L), blackout
- Auto-call (5-30 sec delay) or manual calling
