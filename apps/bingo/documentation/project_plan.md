# Beak Bingo - Project Plan

## Project Overview

**Name:** Beak Bingo
**Domain:** beak-bingo (TBD: .com, .io, .app)
**Access Model:** Free to play (no login required), optional accounts for saving templates
**Future Monetization:** Ads and/or paid tier (keep architecture flexible)

---

## Phase 1: Project Foundation

### 1.1 Project Setup

- [ ] Initialize Next.js project with TypeScript
  - `npx create-next-app@latest beak-bingo --typescript --tailwind --eslint --app --src-dir`
- [ ] Configure TypeScript (`tsconfig.json`)
  - Strict mode enabled
  - Path aliases (`@/components`, `@/lib`, etc.)
- [ ] Configure Tailwind
  - Custom color palette (senior-friendly, high contrast)
  - Custom font sizes (larger defaults)
  - Custom spacing scale
- [ ] Set up project structure (folders per spec)
- [ ] Add essential dependencies:
  - `@supabase/supabase-js` - Supabase client
  - `uuid` - ID generation
  - `zustand` - State management
- [ ] Configure ESLint + Prettier
- [ ] Set up `.env.local` for environment variables
- [ ] Create `.env.example` with required variables
- [ ] Add `.gitignore` entries for env files, node_modules, .next

### 1.2 Supabase Setup

- [ ] Create Supabase project (name: beak-bingo)
- [ ] Configure auth settings
  - Enable email/password auth
  - Configure email templates (welcome, reset password)
  - Set redirect URLs
- [ ] Create database tables
  - `profiles` table (extends auth.users)
  - `templates` table
- [ ] Set up Row Level Security policies
- [ ] Create database triggers
  - Auto-create profile on user signup
  - Auto-update `updated_at` timestamps
- [ ] Set up Storage bucket for logos
  - Configure public/private access
  - Set file size limits
- [ ] Get API keys (anon key, service role key)
- [ ] Document database schema in repo

### 1.3 Environment Configuration

- [ ] Create environment variables structure:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  NEXT_PUBLIC_APP_URL=
  ```
- [ ] Set up Supabase client utilities
  - Server-side client (for API routes)
  - Browser client (if needed for real-time features)

---

## Phase 2: Core Game Engine

### 2.1 Game Logic (`lib/game/`)

- [ ] Create TypeScript types (`types/index.ts`)
  ```typescript
  type BingoBall = { letter: 'B'|'I'|'N'|'G'|'O', number: number }
  type GameState = { ... }
  type Pattern = { id: string, name: string, grid: boolean[][] }
  type BingoCard = { ... }
  ```
- [ ] Implement ball generation (`engine.ts`)
  - Generate shuffled deck of 75 balls
  - Draw next ball
  - Track called balls
  - Undo last call
  - Reset game
- [ ] Implement number-to-letter mapping
  - B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
- [ ] Implement game state management
  - Current ball
  - Previous ball
  - Called balls (ordered list)
  - Called balls (by column for board display)
  - Game status (not started, in progress, paused)

### 2.2 Pattern System (`lib/game/patterns.ts`)

- [ ] Define pattern data structure
  ```typescript
  interface Pattern {
    id: string
    name: string
    category: 'lines' | 'corners' | 'shapes' | 'letters' | 'coverage'
    grid: boolean[][] // 5x5, true = must be marked
    description?: string
  }
  ```
- [ ] Implement MVP patterns (15-20):

  **Lines:**
  - [ ] Horizontal Line (any row)
  - [ ] Vertical Line (any column)
  - [ ] Diagonal (either direction)
  - [ ] Any Single Line

  **Corners:**
  - [ ] Four Corners

  **Frames:**
  - [ ] Small Frame (inner 3x3 border)
  - [ ] Large Frame (outer border)

  **Shapes:**
  - [ ] Letter X
  - [ ] Diamond
  - [ ] Heart
  - [ ] Cross / Plus Sign

  **Letters:**
  - [ ] Letter T
  - [ ] Letter L

  **Coverage:**
  - [ ] Postage Stamp (2x2 in any corner)
  - [ ] Blackout / Coverall

  **Combo:**
  - [ ] Four Corners + Any Line

- [ ] Implement pattern matching function
  - Given called numbers and pattern, check if any valid card could win
  - (Note: we're not tracking individual player cards, just displaying pattern)

### 2.3 Card Generation — DEFERRED (Post-MVP)

Card generation and PDF printing moved to post-MVP. Facilities will use physical cards (purchased separately or already owned).

---

## Phase 3: Audio System

### 3.1 Audio File Generation

- [ ] Select AI TTS service (ElevenLabs recommended)
- [ ] Choose voice options (3-4 voices):
  - [ ] Voice 1: Professional male (American)
  - [ ] Voice 2: Professional female (American)
  - [ ] Voice 3: Warm/friendly male
  - [ ] Voice 4: Warm/friendly female
- [ ] Generate audio files for each voice:
  - [ ] 75 number calls ("B-1" through "O-75")
  - [ ] Optional: "Bingo!" celebration
  - [ ] Optional: "Game starting" / "New game"
- [ ] Audio format: MP3 (good compression, universal support)
- [ ] Organize files: `/public/audio/{voice-id}/b-1.mp3`

### 3.2 Ball Reveal Chime

- [ ] Source reveal chime sound effect
  - Research nostalgic sounds for seniors (service bell, classic game show ding)
  - Consider: desk bell, Price is Right style ding, or simple attention chime
  - Purchase from AudioJungle, Epidemic Sound, or similar
- [ ] Add chime audio files
  - `/public/audio/sfx/chime/reveal.mp3` - clean version
  - `/public/audio/sfx/chime/reveal-hall.mp3` - hall reverb variant
- [ ] Implement `playRevealChime()` in audio store
- [ ] Update call sequence: roll → ball appears + chime → voice announcement
- [ ] Add UI toggle to enable/disable reveal chime

### 3.3 Audio Player (`lib/audio/player.ts`)

- [ ] Create audio player class/hook
- [ ] Implement preloading (cache all 75 files on game start)
- [ ] Implement playback with error handling
- [ ] Handle browser autoplay restrictions
  - Require user interaction before first play
  - Show visual indicator if audio blocked
- [ ] Implement volume control
- [ ] Implement mute toggle
- [ ] Implement voice selection (switch between voice sets)
- [ ] Store audio preference in localStorage

### 3.4 Audio Hook (`hooks/useAudio.ts`)

- [ ] Create React hook for audio controls
- [ ] Expose: play(ball), setVolume, toggleMute, setVoice
- [ ] Handle loading states
- [ ] Handle errors gracefully

---

## Phase 4: State Management & Sync

### 4.1 Game State Management

- [ ] Choose state library (recommend Zustand for simplicity)
- [ ] Create game store
  ```typescript
  interface GameStore {
    balls: BingoBall[]
    calledBalls: BingoBall[]
    currentBall: BingoBall | null
    previousBall: BingoBall | null
    pattern: Pattern
    status: 'idle' | 'playing' | 'paused'
    autoPlay: boolean
    autoPlaySpeed: number
    // actions
    startGame: () => void
    callNext: () => void
    undoLast: () => void
    reset: () => void
    setPattern: (pattern: Pattern) => void
    toggleAutoPlay: () => void
    setAutoPlaySpeed: (speed: number) => void
  }
  ```
- [ ] Persist relevant state to localStorage (pattern, speed, audio prefs)

### 4.2 Window Sync (`lib/sync/broadcast.ts`)

- [ ] Implement BroadcastChannel wrapper
  - Create channel with unique game session ID
  - Handle message serialization
- [ ] Define sync message types:
  ```typescript
  type SyncMessage =
    | { type: 'BALL_CALLED', ball: BingoBall }
    | { type: 'GAME_RESET' }
    | { type: 'PATTERN_CHANGED', pattern: Pattern }
    | { type: 'SETTINGS_CHANGED', settings: GameSettings }
    | { type: 'SYNC_REQUEST' }
    | { type: 'SYNC_RESPONSE', state: GameState }
  ```
- [ ] Implement presenter → audience sync
- [ ] Implement audience window "request current state" on open
- [ ] Handle audience window close/reopen gracefully

### 4.3 Sync Hook (`hooks/useSync.ts`)

- [ ] Create hook for window sync
- [ ] Differentiate presenter vs audience mode
- [ ] Presenter: broadcast state changes
- [ ] Audience: listen for state changes, request sync on mount

---

## Phase 5: API Routes (BFF Layer)

### 5.1 Auth Routes (`app/api/auth/`)

- [ ] `POST /api/auth/register`
  - Validate email, password
  - Create user via Supabase Auth
  - Create profile record
  - Return session
- [ ] `POST /api/auth/login`
  - Validate credentials
  - Return session token
- [ ] `POST /api/auth/logout`
  - Invalidate session
- [ ] `GET /api/auth/me`
  - Return current user profile (if authenticated)
  - Return null if not authenticated
- [ ] `POST /api/auth/reset-password`
  - Send password reset email
- [ ] `POST /api/auth/update-password`
  - Update password (when logged in or with reset token)

### 5.2 Profile Routes (`app/api/profile/`)

- [ ] `GET /api/profile`
  - Return user profile
  - Requires auth
- [ ] `PATCH /api/profile`
  - Update facility name, default game title
  - Requires auth
- [ ] `POST /api/profile/logo`
  - Upload logo to Supabase Storage
  - Update logo_url in profile
  - Requires auth
  - Validate file type (jpg, png, webp)
  - Validate file size (max 2MB?)
- [ ] `DELETE /api/profile/logo`
  - Remove logo from storage
  - Clear logo_url in profile

### 5.3 Template Routes (`app/api/templates/`)

- [ ] `GET /api/templates`
  - List all templates for user
  - Requires auth
- [ ] `POST /api/templates`
  - Create new template
  - Validate input
  - Requires auth
- [ ] `GET /api/templates/[id]`
  - Get specific template
  - Verify ownership
  - Requires auth
- [ ] `PATCH /api/templates/[id]`
  - Update template
  - Verify ownership
  - Requires auth
- [ ] `DELETE /api/templates/[id]`
  - Delete template
  - Verify ownership
  - Requires auth
- [ ] `POST /api/templates/[id]/default`
  - Set template as default
  - Unset previous default
  - Requires auth

### 5.4 API Utilities

- [ ] Create auth middleware/helper
  - Extract and verify session from cookies/headers
  - Return user or null
- [ ] Create error handling utilities
  - Consistent error response format
  - HTTP status codes
- [ ] Create validation utilities (or use Zod)

---

## Phase 6: UI Components

### 6.1 Shared UI Components (`components/ui/`)

- [ ] `Button` - Primary, secondary, danger variants; sizes
- [ ] `Input` - Text input with label, error state
- [ ] `Select` - Dropdown with search (for patterns)
- [ ] `Slider` - Range input (for speed control)
- [ ] `Toggle` - On/off switch (for audio, autoplay)
- [ ] `Modal` - Confirmation dialogs
- [ ] `Card` - Container component
- [ ] `Spinner` - Loading indicator
- [ ] `Toast` - Notifications

### 6.2 Auth Components (`components/auth/`)

- [ ] `LoginForm`
  - Email + password inputs
  - Submit button
  - Error display
  - "Forgot password" link
  - "Create account" link
- [ ] `RegisterForm`
  - Email + password + confirm password
  - Facility name (optional)
  - Submit button
  - Error display
- [ ] `ResetPasswordForm`
  - Email input
  - Submit button
- [ ] `AuthGuard`
  - Wrapper that redirects if not authenticated
  - For protected pages (dashboard)

### 6.3 Presenter Components (`components/presenter/`)

- [ ] `ControlPanel`
  - Start/pause/reset buttons
  - Call next button
  - Undo button
  - Status indicator
- [ ] `PatternSelector`
  - Dropdown with pattern categories
  - Search/filter
  - Pattern preview on hover/select
- [ ] `SpeedControl`
  - Slider (5-30 seconds)
  - Current speed display
  - Quick presets (slow/medium/fast)
- [ ] `AudioControls`
  - Volume slider
  - Mute button
  - Voice selector dropdown
- [ ] `CurrentBallDisplay` (compact version)
  - Current ball
  - Previous ball
  - Balls called count
- [ ] `CallHistoryPanel`
  - Scrollable list of called balls
  - Most recent at top
- [ ] `MiniBoard`
  - Compact 5x15 grid
  - Shows called numbers
- [ ] `PatternPreview`
  - Small 5x5 grid showing pattern
- [ ] `OpenDisplayButton`
  - Opens audience window
  - Shows status (connected/disconnected)

### 6.4 Audience Components (`components/audience/`)

- [ ] `LargeCurrentBall`
  - Very large ball display (readable from distance)
  - Letter and number
  - Color coded by column
  - Animation on new ball
- [ ] `BingoBoard`
  - 5x15 grid (5 columns x 15 numbers each)
  - Called numbers highlighted
  - Column headers (B-I-N-G-O)
  - High contrast colors
- [ ] `PatternDisplay`
  - 5x5 grid showing winning pattern
  - Label with pattern name
- [ ] `FacilityBranding`
  - Logo display (if uploaded)
  - Game title
- [ ] `BallsCalledCounter`
  - "X of 75 balls called"

### 6.5 Dashboard Components (`components/dashboard/`)

- [ ] `TemplateList`
  - List of saved templates
  - Default template indicator
  - Load/edit/delete actions
- [ ] `TemplateCard`
  - Template name
  - Pattern name
  - Quick settings preview
  - Actions (load, edit, delete, set default)
- [ ] `TemplateForm`
  - Name input
  - Pattern selector
  - Settings (speed, audio)
  - Save button
- [ ] `ProfileForm`
  - Facility name
  - Default game title
  - Logo upload
- [ ] `LogoUpload`
  - Drag & drop or click to upload
  - Preview
  - Remove button

---

## Phase 7: Pages

### 7.1 Public Pages

- [ ] `/` (Home/Landing)
  - Hero section explaining the app
  - "Play Now" button (no login required)
  - "Login" / "Create Account" links
  - Feature highlights
- [ ] `/play` (Presenter View)
  - Full presenter interface
  - Works without login (local storage only)
  - If logged in, can load templates
- [ ] `/display` (Audience View)
  - Full-screen audience display
  - Minimal UI
  - Syncs with presenter window
- [ ] `/login`
  - Login form
  - Links to register, reset password
- [ ] `/register`
  - Registration form
  - Link to login
- [ ] `/reset-password`
  - Password reset request form

### 7.2 Protected Pages (Require Auth)

- [ ] `/dashboard`
  - Template management
  - Profile settings
  - Quick "Start Game" with default template

---

## Phase 8: PWA & Offline

### 8.1 PWA Configuration

- [ ] Create `public/manifest.json`
  ```json
  {
    "name": "Beak Bingo",
    "short_name": "Beak Bingo",
    "description": "Digital bingo caller for retirement communities",
    "start_url": "/play",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#...",
    "icons": [...]
  }
  ```
- [ ] Create PWA icons (multiple sizes)
  - 192x192
  - 512x512
  - Apple touch icon
- [ ] Add manifest link to layout
- [ ] Add theme-color meta tag

### 8.2 Service Worker

- [ ] Choose service worker strategy
  - next-pwa package (recommended for Next.js)
  - Or custom service worker
- [ ] Configure caching strategy:
  - **Cache first:** Static assets, audio files
  - **Network first:** API routes
  - **Stale while revalidate:** Pages
- [ ] Cache audio files aggressively (they don't change)
- [ ] Handle offline fallback
  - Show cached version of game
  - Indicate offline status
  - Queue any pending actions (if applicable)

### 8.3 Offline UX

- [ ] Create offline indicator component
- [ ] Handle offline gracefully in game (should work 100%)
- [ ] Handle offline in dashboard (show cached templates, disable save)
- [ ] Test offline scenarios thoroughly

---

## Phase 9: Polish & Accessibility

### 9.1 Accessibility

- [ ] Audit with axe or Lighthouse
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works
  - Tab order logical
  - Enter/Space activate buttons
  - Escape closes modals
- [ ] Add skip links
- [ ] Ensure color contrast meets WCAG AA
- [ ] Test with screen reader
- [ ] Add reduced motion support

### 9.2 Keyboard Shortcuts (Presenter)

- [ ] Space: Call next number
- [ ] P: Pause/resume auto-play
- [ ] R: Reset game (with confirmation)
- [ ] U: Undo last call
- [ ] M: Mute/unmute
- [ ] F: Toggle fullscreen
- [ ] Add keyboard shortcut help modal

### 9.3 Visual Polish

- [ ] Loading states for all async operations
- [ ] Error states with helpful messages
- [ ] Empty states (no templates, etc.)
- [ ] Animations/transitions (subtle, not distracting)
- [ ] Ball call animation in audience view
- [ ] Consistent spacing and typography

### 9.4 Responsive Design

- [ ] Test presenter view on various laptop sizes
- [ ] Test audience view on projector resolutions
- [ ] Ensure touch targets are large enough

---

## Phase 10: Testing & QA

### 10.1 Unit Tests

- [ ] Game engine (ball generation, state management)
- [ ] Pattern matching

### 10.2 Integration Tests

- [ ] API routes (auth, profile, templates)
- [ ] Database operations

### 10.3 E2E Tests (Optional for MVP)

- [ ] Full game flow (start, call, reset)
- [ ] Dual screen sync
- [ ] Auth flow (register, login, logout)

### 10.4 Manual Testing

- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on actual projector setup
- [ ] Test offline mode
- [ ] Test audio on various devices
- [ ] Test PWA install on desktop and mobile
- [ ] Test with actual users (your mom!)

---

## Phase 11: Deployment

### 11.1 Vercel Setup

- [ ] Create Vercel project
- [ ] Connect to Git repository
- [ ] Configure environment variables
- [ ] Set up preview deployments for PRs
- [ ] Configure custom domain (when ready)

### 11.2 Supabase Production

- [ ] Review security rules
- [ ] Set up database backups
- [ ] Configure rate limiting (if needed)
- [ ] Monitor usage

### 11.3 Monitoring & Analytics

- [ ] Set up error tracking (Sentry or similar)
- [ ] Set up basic analytics (privacy-respecting)
- [ ] Monitor Core Web Vitals

---

## Future Considerations (Post-MVP)

### Monetization Prep

- [ ] Design ad placements (non-intrusive)
- [ ] Plan paid tier features
  - Custom patterns
  - More voice options
  - No ads
  - Priority support
- [ ] Design upgrade flow

### Additional Features

- [ ] Card generator (PDF printing)
- [ ] Custom pattern editor
- [ ] 90-ball bingo (UK)
- [ ] Player digital cards (QR to phone)
- [ ] Game history/statistics
- [ ] Multi-language audio
- [ ] Themed bingo (holidays, etc.)

---

## Milestones

### Milestone 1: Playable Game
- [ ] Project setup complete
- [ ] Core game engine working
- [ ] Presenter UI functional
- [ ] Single-window game playable

### Milestone 2: Dual Screen
- [ ] Audience display complete
- [ ] BroadcastChannel sync working
- [ ] Both windows in sync

### Milestone 3: Audio
- [ ] Audio files generated
- [ ] Audio playback working
- [ ] Voice selection working

### Milestone 4: Accounts
- [ ] Auth flow complete
- [ ] Profile management working
- [ ] Template save/load working

### Milestone 5: Offline
- [ ] PWA configured
- [ ] Offline play working
- [ ] Audio cached and working offline

### Milestone 6: Launch Ready
- [ ] All features complete
- [ ] Testing complete
- [ ] Deployed to production
- [ ] Ready for real users
