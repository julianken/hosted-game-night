# Trivia - Project Plan

## Project Overview

**Name:** Trivia
**Part of:** Joolie Boolie monorepo
**Purpose:** Presenter-controlled trivia system for groups and communities
**Access Model:** Free to play (no login required for MVP), optional accounts for future custom questions

---

## MVP vs Full Scope Summary

This plan defines two scopes:
- **MVP**: Minimal playable version to validate the concept
- **Full**: Complete feature set from original requirements

| Aspect | MVP | Full | Notes |
|--------|-----|------|-------|
| Questions | 5 hardcoded | 20 hardcoded | Expand after MVP works |
| Rounds | 1 (hardcoded) | 2-6 (configurable) | No settings UI in MVP |
| Questions/Round | 5 (hardcoded) | 3-10 (configurable) | No settings UI in MVP |
| Max Teams | 6 | 20 | Simpler UI for MVP |
| Default Teams | 3 | 6 | Quick start |
| Timer | None | 30s countdown | Presenter says time verbally |
| TTS Audio | None | Web Speech API | Post-MVP feature |
| Pause/Resume | None | Yes | Post-MVP feature |
| Emergency Pause | None | Yes (blanks screen) | Post-MVP feature |
| Answer Amendment | None | On-the-fly re-scoring | Post-MVP feature |
| Scoreboard Toggle | Always visible | Manual toggle | Simpler for MVP |
| Keyboard Shortcuts | 3 (Space, N, R) | 7 (all) | Add more post-MVP |
| Remove Team | No | Yes | Only add/rename in MVP |
| Settings UI | None | Full config panel | Hardcoded values in MVP |
| localStorage | None | Persist preferences | Post-MVP feature |

---

## User Decisions

| Decision | MVP Value | Full Value |
|----------|-----------|------------|
| **Scope** | 5 questions, 1 round, no timer | 20 questions (4×5), auto timer, optional TTS |
| **Categories** | Classic Era: Music, Movies, TV, History | Same |
| **Team Setup** | 3 default teams, add up to 6, rename only | Default "Table 1-6", add/remove/rename up to 20 |
| **Max Teams** | 6 | 20 |
| **Answer Method** | Hybrid: Presenter records → auto-score | Same |
| **Correct Answer** | Fixed (no amendment) | Can be amended on-the-fly |
| **Timer** | None (presenter manages verbally) | 30s default, optional auto-start, audience toggle |
| **Emergency Pause** | None | Yes, blanks audience display |
| **Scoreboard** | Always visible in presenter | Auto between rounds + manual toggle |
| **Round Config** | Hardcoded: 1 round, 5 questions | Configurable: 2-6 rounds, 3-10 questions |
| **TTS Audio** | None | Optional toggle, off by default |
| **Keyboard Shortcuts** | Space=Reveal, N=Next, R=Reset | +P=Pause, M=Mute, E=Emergency |

---

## MVP Implementation Plan

### MVP Phase 1: Core Engine

**Files to create:**
```
src/types/index.ts                    ✅ DONE
src/lib/game/engine.ts                ← 7 functions only
src/lib/game/sample-questions.ts      ← 5 questions
```

**Engine functions (MVP only):**
- [x] Types defined (`src/types/index.ts`)
- [ ] `createInitialState()` - Initialize game state
- [ ] `startGame()` - Load questions, set to playing
- [ ] `nextQuestion()` - Advance to next question (auto-end after Q5)
- [ ] `revealAnswer()` - Toggle showAnswer flag
- [ ] `resetGame()` - Return to idle state
- [ ] `recordTeamAnswer(teamId, answer)` - Record + auto-score
- [ ] `addTeam(name?)` - Add team (max 6)
- [ ] `renameTeam(teamId, name)` - Rename existing team

**Sample questions (MVP):**
- [ ] Question 1: Music - Multiple choice
- [ ] Question 2: Movies - Multiple choice
- [ ] Question 3: TV - True/False
- [ ] Question 4: History - Multiple choice
- [ ] Question 5: Mixed - True/False

**State machine (MVP - simplified):**
```
idle → START_GAME → playing
playing → REVEAL_ANSWER → showing_answer
showing_answer → NEXT_QUESTION → playing (or ended if Q5)
ended → RESET_GAME → idle
```

### MVP Phase 2: Store + Presenter UI

**Files to create:**
```
src/stores/game-store.ts
src/hooks/use-game.ts                 ← 3 keyboard shortcuts only
src/components/presenter/ControlPanel.tsx
src/components/presenter/QuestionDisplay.tsx
src/components/presenter/TeamAnswerGrid.tsx
src/components/presenter/TeamManager.tsx
src/components/presenter/TeamScoreboard.tsx
src/components/presenter/OpenDisplayButton.tsx
src/app/play/page.tsx
```

**Presenter components (MVP):**
- [ ] `ControlPanel.tsx` - Start, Reveal, Next, Reset buttons
- [ ] `QuestionDisplay.tsx` - Question text + options + progress
- [ ] `TeamAnswerGrid.tsx` - 6-team grid, click to record answers
- [ ] `TeamManager.tsx` - Add team (max 6), rename inline
- [ ] `TeamScoreboard.tsx` - Ranked team scores (always visible)
- [ ] `OpenDisplayButton.tsx` - Opens `/display?session=xxx`

**Keyboard shortcuts (MVP):**
- [ ] Space = Reveal answer
- [ ] N = Next question
- [ ] R = Reset game

### MVP Phase 3: Sync + Audience Display

**Files to create:**
```
src/lib/sync/broadcast.ts             ← Copy from bingo
src/lib/sync/session.ts               ← Copy from bingo
src/hooks/use-sync.ts
src/components/audience/LargeQuestionDisplay.tsx
src/components/audience/AnswerReveal.tsx
src/components/audience/ScoreboardDisplay.tsx
src/app/display/page.tsx
```

**Audience components (MVP):**
- [ ] `LargeQuestionDisplay.tsx` - 48px+ font, high contrast
- [ ] `AnswerReveal.tsx` - Green highlight correct answer
- [ ] `ScoreboardDisplay.tsx` - Large ranked scores

### MVP Phase 4: Landing + Testing

**Files to create:**
```
src/app/page.tsx                      ← Simple landing
```

**Manual testing (MVP):**
- [ ] Run full 5-question game
- [ ] Test with 3-6 teams
- [ ] Test sync between presenter and audience windows
- [ ] Test on large display / projector
- [ ] Verify text readable from back of room

---

## MVP Milestones

### Milestone M1: Playable Engine
- [x] Types defined
- [ ] 7 engine functions working
- [ ] 5 sample questions created
- [ ] Basic unit tests for engine

### Milestone M2: Presenter UI Working
- [ ] Game store integrated
- [ ] All 6 presenter components built
- [ ] Can play full game in presenter window
- [ ] Keyboard shortcuts working

### Milestone M3: Dual Screen Complete (MVP DONE)
- [ ] Sync working via BroadcastChannel
- [ ] Audience display shows questions/answers/scores
- [ ] Landing page with "Start Game" button
- [ ] Manual testing passed

---

## Deferred Features (Post-MVP Backlog)

These features are cut from MVP but tracked here for future implementation.

### Deferred: Timer System
**Priority:** High (most requested feature)
**Files needed:**
- `src/hooks/use-timer.ts`
- `src/components/presenter/TimerControl.tsx`
- `src/components/audience/TimerDisplay.tsx`

**Engine functions to add:**
- [ ] `tickTimer(state)` - Decrement timer by 1 second
- [ ] `resetTimer(state, seconds?)` - Reset to initial value
- [ ] `toggleTimerAutoStart(state)` - Toggle auto-start setting
- [ ] `toggleAudienceTimer(state)` - Toggle audience visibility

**Features:**
- [ ] 30-second default countdown
- [ ] Auto-start toggle (optional)
- [ ] Audience visibility toggle
- [ ] Color change at 10 seconds (yellow) and 5 seconds (red)
- [ ] Auto-reveal when timer hits 0 (optional)

### Deferred: Pause/Resume
**Priority:** Medium
**Engine functions to add:**
- [ ] `pauseGame(state)` - Pause timer and game
- [ ] `resumeGame(state)` - Resume from paused state

**State machine additions:**
```
playing → PAUSE_GAME → paused
paused → RESUME_GAME → playing
```

**Keyboard shortcut:**
- [ ] P = Pause/Resume

### Deferred: Emergency Pause
**Priority:** Medium (important for real events)
**Engine functions to add:**
- [ ] `emergencyPause(state)` - Blank audience display

**Files needed:**
- `src/components/audience/EmergencyScreen.tsx`

**State machine additions:**
```
any_state → EMERGENCY_PAUSE → emergency_paused
emergency_paused → RESUME_GAME → playing
```

**Keyboard shortcut:**
- [ ] E = Emergency pause

### Deferred: Answer Amendment
**Priority:** Low (edge case)
**Engine functions to add:**
- [ ] `amendCorrectAnswers(state, answers[])` - Change correct answer + re-score all teams

**Files needed:**
- `src/components/presenter/CorrectAnswerEditor.tsx`

**Features:**
- [ ] Checkboxes to select which options are correct
- [ ] Auto re-score all teams when amended
- [ ] Visual indicator that answer was changed

### Deferred: Configurable Rounds
**Priority:** Medium
**Files needed:**
- `src/components/presenter/GameSettings.tsx`
- `src/components/presenter/RoundProgress.tsx`

**Engine functions to add:**
- [ ] `nextRound(state)` - Advance to next round
- [ ] `endGame(state)` - Transition to ended state

**State machine additions:**
```
showing_answer → NEXT_ROUND → between_rounds
between_rounds → START_ROUND → playing
between_rounds → END_GAME → ended
```

**Features:**
- [ ] Pre-game settings UI
- [ ] 2-6 rounds (configurable)
- [ ] 3-10 questions per round (configurable)
- [ ] Round progress indicator ("Round 2 of 4")
- [ ] Auto-scoreboard between rounds

### Deferred: Expand to 20 Teams
**Priority:** Low (6 is enough for most events)
**Changes needed:**
- [ ] Update `MAX_TEAMS` constant from 6 to 20
- [ ] Add scrolling to TeamAnswerGrid
- [ ] Add scrolling to TeamScoreboard
- [ ] Test UI with 20 teams

**Engine functions to add:**
- [ ] `removeTeam(state, teamId)` - Remove a team

### Deferred: Expand to 20 Questions
**Priority:** Medium
**Files to update:**
- `src/lib/game/sample-questions.ts` - Add 15 more questions

**Questions to add (5 per category):**
- [ ] Music Q2-Q5
- [ ] Movies Q2-Q5
- [ ] TV Q2-Q5
- [ ] History Q2-Q5

### Deferred: TTS Audio
**Priority:** Low (nice-to-have)
**Files needed:**
- `src/hooks/use-audio.ts`

**Features:**
- [ ] Web Speech API integration
- [ ] Read question text aloud
- [ ] Read options aloud
- [ ] Slow, clear speech rate
- [ ] Volume control
- [ ] Mute toggle (M key)
- [ ] localStorage preference persistence

### Deferred: Scoreboard Toggle
**Priority:** Low
**Changes needed:**
- [ ] `toggleScoreboard(state)` engine function
- [ ] Toggle button in presenter UI
- [ ] Conditional rendering in audience display

### Deferred: localStorage Persistence
**Priority:** Low
**Features:**
- [ ] Persist timer preferences
- [ ] Persist TTS preferences
- [ ] Persist last team setup

### Deferred: Additional Keyboard Shortcuts
**Priority:** Low
- [ ] P = Pause/Resume (requires pause feature)
- [ ] E = Emergency pause (requires emergency feature)
- [ ] M = Mute TTS (requires TTS feature)

---

## Full Implementation Plan (Post-MVP Reference)

The sections below document the complete feature set for reference after MVP is complete.

### Full Phase 1: Project Foundation

#### 1.1 Project Structure (Shared from Monorepo)

- [ ] Verify trivia app structure in monorepo
- [ ] Verify shared package dependencies:
  - `@joolie-boolie/sync` - Dual-screen synchronization
  - `@joolie-boolie/ui` - Button, Toggle, Slider components
  - `@joolie-boolie/theme` - Accessible design tokens
- [ ] Configure TypeScript paths (`@/components`, `@/lib`, etc.)
- [ ] Set up `.env.local` for environment variables
- [ ] Create `.env.example` with required variables

#### 1.2 Project Dependencies

- [ ] Add Zustand for state management
- [ ] Add uuid for ID generation
- [ ] Verify Tailwind CSS configuration

---

### Full Phase 2: Core Game Engine

#### 2.1 TypeScript Types (`src/types/index.ts`)

```typescript
type QuestionType = 'multiple_choice' | 'true_false';
type QuestionCategory = 'music' | 'movies' | 'tv' | 'history';
type GameStatus = 'idle' | 'playing' | 'paused' | 'showing_answer' | 'between_rounds' | 'emergency_paused' | 'ended';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  correctAnswers: string[];        // Array to support multiple correct answers
  options: string[];               // A, B, C, D for MC; True, False for T/F
  category: QuestionCategory;
}

interface Team {
  id: string;
  name: string;                    // "Table 1" or custom name
  score: number;
  tableNumber: number;             // 1-20
}

interface TeamAnswer {
  teamId: string;
  answer: string | null;           // A, B, C, D, True, False, or null
  isCorrect: boolean;
  scoredAt: number | null;
}

interface TriviaGameState {
  sessionId: string;
  status: GameStatus;
  totalRounds: number;
  questionsPerRound: number;
  currentRound: number;
  currentQuestionIndex: number;
  selectedQuestions: Question[];
  currentQuestion: Question | null;
  showAnswer: boolean;
  currentQuestionAnswers: TeamAnswer[];
  timerSeconds: number;
  timerInitialSeconds: number;
  timerRunning: boolean;
  timerAutoStart: boolean;
  teams: Team[];
  showTimerOnAudience: boolean;
  showScoreboard: boolean;
  ttsEnabled: boolean;
}
```

- [x] Create TypeScript interfaces file
- [x] Export all types

#### 2.2 Game Engine (`src/lib/game/engine.ts`)

Core pure functions (state in, state out):

**MVP Functions:**
- [ ] `createInitialState(config: GameConfig): TriviaGameState`
- [ ] `startGame(state, config): TriviaGameState`
- [ ] `nextQuestion(state): TriviaGameState`
- [ ] `revealAnswer(state): TriviaGameState`
- [ ] `resetGame(state): TriviaGameState`
- [ ] `recordTeamAnswer(state, teamId, answer): TriviaGameState` - Auto-scores
- [ ] `addTeam(state, name?): TriviaGameState`
- [ ] `renameTeam(state, teamId, name): TriviaGameState`

**Deferred Functions:**
- [ ] `nextRound(state): TriviaGameState`
- [ ] `endGame(state): TriviaGameState`
- [ ] `pauseGame(state): TriviaGameState`
- [ ] `emergencyPause(state): TriviaGameState` - Blanks audience
- [ ] `resumeGame(state): TriviaGameState`
- [ ] `amendCorrectAnswers(state, answers: string[]): TriviaGameState` - Re-scores all
- [ ] `removeTeam(state, teamId): TriviaGameState`
- [ ] `tickTimer(state): TriviaGameState`
- [ ] `resetTimer(state, seconds?): TriviaGameState`
- [ ] `toggleTimerAutoStart(state): TriviaGameState`
- [ ] `toggleAudienceTimer(state): TriviaGameState`
- [ ] `toggleScoreboard(state): TriviaGameState`
- [ ] `toggleTTS(state): TriviaGameState`

#### 2.3 State Machine (`src/lib/game/state-machine.ts`)

**MVP State Machine:**
```
idle → START_GAME → playing
playing → REVEAL_ANSWER → showing_answer
showing_answer → NEXT_QUESTION → playing (or ended)
ended → RESET_GAME → idle
```

**Full State Machine (Deferred):**
```
idle → START_GAME → playing
playing → PAUSE_GAME → paused
playing → EMERGENCY_PAUSE → emergency_paused
playing → REVEAL_ANSWER → showing_answer
paused → RESUME_GAME → playing
emergency_paused → RESUME_GAME → playing
showing_answer → NEXT_QUESTION → playing
showing_answer → NEXT_ROUND → between_rounds
between_rounds → START_ROUND → playing
between_rounds → END_GAME → ended
any_state → EMERGENCY_PAUSE → emergency_paused
ended → RESET_GAME → idle
```

- [ ] Define action types
- [ ] Implement state transitions
- [ ] Validate state transitions
- [ ] Handle invalid transitions gracefully

#### 2.4 Sample Questions (`src/lib/game/sample-questions.ts`)

**MVP Questions (5 total):**
- [ ] Question 1: Music - Multiple choice
- [ ] Question 2: Movies - Multiple choice
- [ ] Question 3: TV - True/False
- [ ] Question 4: History - Multiple choice
- [ ] Question 5: Mixed - True/False

**Deferred Questions (15 more for full 20):**

**Music (1940s-80s):**
- [ ] Question 2: Multiple choice
- [ ] Question 3: True/False
- [ ] Question 4: Multiple choice
- [ ] Question 5: True/False

**Classic Movies:**
- [ ] Question 6: Multiple choice
- [ ] Question 7: Multiple choice
- [ ] Question 8: True/False
- [ ] Question 9: Multiple choice
- [ ] Question 10: True/False

**Classic TV:**
- [ ] Question 11: Multiple choice
- [ ] Question 12: Multiple choice
- [ ] Question 13: True/False
- [ ] Question 14: Multiple choice
- [ ] Question 15: True/False

**U.S. History:**
- [ ] Question 16: Multiple choice
- [ ] Question 17: Multiple choice
- [ ] Question 18: True/False
- [ ] Question 19: Multiple choice
- [ ] Question 20: True/False

#### 2.5 Question Selection (`src/lib/game/questions.ts`)

**MVP:** Return all 5 questions in order

**Deferred:**
- [ ] `selectQuestions(count, categories?)`: Select questions for game
- [ ] Shuffle function for randomization
- [ ] Filter by category if specified

---

### Full Phase 3: State Management

#### 3.1 Game Store (`src/stores/game-store.ts`)

Single unified Zustand store wrapping engine functions:

- [ ] Initialize store with default state
- [ ] Wrap all engine functions as store actions
- [ ] Add `_hydrate(state)` method for sync
- [ ] Persist settings to localStorage (timer prefs, TTS) **[DEFERRED]**

#### 3.2 Sync Store (`src/stores/sync-store.ts`)

- [ ] Connection state tracking
- [ ] Session ID management
- [ ] Connected windows count

---

### Full Phase 4: Dual-Screen Sync

#### 4.1 Broadcast Channel (`src/lib/sync/broadcast.ts`)

Copy from bingo with trivia-specific channel name:

- [ ] Create `BroadcastSync` class
- [ ] Channel name: `trivia-{sessionId}`
- [ ] Message types:
  - `STATE_UPDATE` - Full state on every change
  - `REQUEST_SYNC` - Audience requests current state

#### 4.2 Session Utilities (`src/lib/sync/session.ts`)

- [ ] Generate session ID
- [ ] Parse session ID from URL
- [ ] Store session in sessionStorage

#### 4.3 Sync Hook (`src/hooks/use-sync.ts`)

- [ ] Differentiate presenter vs audience mode
- [ ] Presenter: broadcast state changes
- [ ] Audience: listen for state changes, request sync on mount
- [ ] Handle reconnection gracefully

---

### Full Phase 5: Hooks

#### 5.1 Main Game Hook (`src/hooks/use-game.ts`)

**MVP Keyboard shortcuts:**
- [ ] Space = Reveal answer
- [ ] N = Next question
- [ ] R = Reset game

**Deferred Keyboard shortcuts:**
- [ ] P = Pause/Resume
- [ ] E = Emergency pause
- [ ] M = Mute TTS

- [ ] Event listeners setup/cleanup
- [ ] Integration with game store

#### 5.2 Timer Hook (`src/hooks/use-timer.ts`) **[DEFERRED]**

- [ ] Self-scheduling setTimeout pattern
- [ ] Auto-tick when enabled
- [ ] Auto-start on question display (when enabled)
- [ ] Stop on reveal/pause
- [ ] Reset on new question

---

### Full Phase 6: UI Components

#### 6.1 Presenter Components (`src/components/presenter/`)

**MVP Components:**

- [ ] `ControlPanel.tsx`
  - Start/Reveal/Next/Reset buttons
  - Status indicator
  - Keyboard shortcut hints

- [ ] `QuestionDisplay.tsx`
  - Current question text
  - Options (A, B, C, D or True/False)
  - Correct answer indicator
  - Question number / progress

- [ ] `TeamAnswerGrid.tsx`
  - Grid: teams × options (max 6 teams)
  - Click to record team answer
  - Visual feedback for recorded answers
  - Checkmark for correct answers

- [ ] `TeamScoreboard.tsx`
  - Ranked team list
  - Scores displayed

- [ ] `TeamManager.tsx`
  - Add team button (max 6)
  - Rename team inline edit
  - Default "Table N" naming

- [ ] `OpenDisplayButton.tsx`
  - Opens audience window
  - Connection status indicator

**Deferred Components:**

- [ ] `CorrectAnswerEditor.tsx`
  - Checkboxes for each option
  - Amend correct answers on-the-fly
  - Visual indicator when changed

- [ ] `TimerControl.tsx`
  - Current time display
  - Play/Pause timer
  - Reset timer
  - Auto-start toggle
  - Audience visibility toggle

- [ ] `GameSettings.tsx`
  - Pre-game configuration
  - Number of rounds (2-6)
  - Questions per round (3-10)
  - Timer default (20-60 seconds)
  - TTS toggle

- [ ] `RoundProgress.tsx`
  - "Round 2 of 4"
  - "Question 3 of 5"
  - Visual progress bar

#### 6.2 Audience Components (`src/components/audience/`)

**MVP Components:**

- [ ] `LargeQuestionDisplay.tsx`
  - 48px+ font size
  - Question text centered
  - Options A-D or True/False
  - High contrast colors
  - Readable from back of room

- [ ] `AnswerReveal.tsx`
  - Correct answer(s) highlighted green
  - Incorrect options dimmed
  - Shows which teams got it right **[DEFERRED: team results]**
  - Animation on reveal **[DEFERRED: animation]**

- [ ] `ScoreboardDisplay.tsx`
  - Ranked team scores
  - Large readable font
  - Animations on score change **[DEFERRED: animation]**

**Deferred Components:**

- [ ] `TimerDisplay.tsx`
  - Large countdown timer
  - Color change at 10 seconds
  - Conditional visibility (toggle)

- [ ] `EmergencyScreen.tsx`
  - Blank screen
  - Minimal "Paused" text
  - For emergencies only

#### 6.3 Shared UI (from @joolie-boolie/ui)

- [ ] Verify Button component works
- [ ] Verify Toggle component works **[DEFERRED: no toggles in MVP]**
- [ ] Verify Slider component works **[DEFERRED: no sliders in MVP]**

---

### Full Phase 7: Pages

#### 7.1 Landing Page (`src/app/page.tsx`)

- [ ] Hero section with app description
- [ ] "Start Game" button
- [ ] Feature highlights **[DEFERRED: simple landing for MVP]**
- [ ] Accessible design

#### 7.2 Presenter Page (`src/app/play/page.tsx`)

- [ ] Full presenter interface
- [ ] Pre-game setup (teams, rounds, settings) **[DEFERRED: settings]**
- [ ] Game controls during play
- [ ] Answer recording interface
- [ ] Scoreboard toggle **[DEFERRED: always visible in MVP]**
- [ ] Open audience display button

#### 7.3 Audience Page (`src/app/display/page.tsx`)

- [ ] Full-screen display
- [ ] Question display state
- [ ] Answer reveal state
- [ ] Scoreboard state
- [ ] Emergency pause state **[DEFERRED]**
- [ ] Timer display (conditional) **[DEFERRED]**
- [ ] Syncs with presenter window

---

### Full Phase 8: Audio System **[ENTIRELY DEFERRED]**

#### 8.1 Web Speech API Integration

- [ ] TTS engine wrapper
- [ ] Read question text
- [ ] Read options
- [ ] Slow, clear speech rate
- [ ] Volume control
- [ ] Mute toggle
- [ ] Store preference in localStorage

#### 8.2 Audio Hook (`src/hooks/use-audio.ts`)

- [ ] Expose: speak(text), stop, setVolume, toggleMute
- [ ] Handle browser TTS support
- [ ] Fallback for unsupported browsers

---

### Full Phase 9: Testing & QA

#### 9.1 Unit Tests (80%+ coverage target) **[DEFERRED: basic tests only for MVP]**

**MVP Engine Tests (`src/lib/game/__tests__/engine.test.ts`):**
- [ ] createInitialState
- [ ] startGame
- [ ] nextQuestion
- [ ] revealAnswer
- [ ] resetGame
- [ ] recordTeamAnswer
- [ ] addTeam
- [ ] renameTeam

**Deferred Engine Tests:**
- [ ] nextRound
- [ ] endGame
- [ ] pauseGame
- [ ] emergencyPause
- [ ] resumeGame
- [ ] amendCorrectAnswers (with re-scoring)
- [ ] removeTeam
- [ ] tickTimer
- [ ] toggles (timer, TTS, scoreboard)

**State Machine Tests (`src/lib/game/__tests__/state-machine.test.ts`):** **[DEFERRED]**
- [ ] All valid state transitions
- [ ] Invalid transition handling
- [ ] Emergency pause from any state

#### 9.2 Integration Tests **[DEFERRED]**

- [ ] Game store with engine
- [ ] Sync between windows
- [ ] Timer auto-tick

#### 9.3 Manual Testing Checklist

**MVP Manual Tests:**
- [ ] Run full 5-question game
- [ ] Test with 3-6 teams, record answers for each
- [ ] Verify sync: open display window, confirm real-time updates
- [ ] Test on 1920×1080 display (projector simulation)
- [ ] Verify text readable from 15+ feet
- [ ] Test keyboard shortcuts (Space, N, R)

**Deferred Manual Tests:**
- [ ] Run full 4-round game with 20 questions
- [ ] Test answer amendment: change correct answer mid-game
- [ ] Test pause/resume mid-question
- [ ] Test emergency pause: verify audience screen blanks
- [ ] Test scoreboard toggle: manual show/hide + auto between rounds
- [ ] Test configurable rounds (2×5, 4×5, 6×10)
- [ ] Test with max 20 teams (UI scrolling)
- [ ] Test TTS with Web Speech API

---

### Full Phase 10: Accessibility **[MOSTLY DEFERRED]**

#### 10.1 Visual Requirements

- [x] Minimum 48px font for audience display (in MVP)
- [x] High contrast colors (WCAG AA) (in MVP via theme)
- [x] Large click targets (44x44px minimum) (in MVP via theme)
- [x] Accessible color palette from @joolie-boolie/theme (in MVP)

#### 10.2 Keyboard Navigation

- [ ] All controls keyboard accessible **[PARTIAL in MVP]**
- [ ] Tab order logical **[DEFERRED]**
- [ ] Focus indicators visible **[DEFERRED]**
- [ ] Keyboard shortcuts documented **[BASIC in MVP]**

#### 10.3 Screen Reader Support **[DEFERRED]**

- [ ] ARIA labels on all interactive elements
- [ ] Status announcements
- [ ] TTS option for question reading

---

## File Dependency Order

### MVP Build Order

**MVP Day 1: Core Engine**
```
src/types/index.ts                    ✅ DONE
src/lib/game/engine.ts
src/lib/game/sample-questions.ts      (5 questions)
src/lib/game/__tests__/engine.test.ts (basic tests)
```

**MVP Day 2: Store + Sync**
```
src/stores/game-store.ts
src/lib/sync/broadcast.ts             (copy from bingo)
src/lib/sync/session.ts               (copy from bingo)
src/hooks/use-sync.ts
src/hooks/use-game.ts                 (3 keyboard shortcuts)
```

**MVP Day 3: Presenter UI**
```
src/components/presenter/ControlPanel.tsx
src/components/presenter/QuestionDisplay.tsx
src/components/presenter/TeamAnswerGrid.tsx
src/components/presenter/TeamManager.tsx
src/components/presenter/TeamScoreboard.tsx
src/components/presenter/OpenDisplayButton.tsx
src/app/play/page.tsx
```

**MVP Day 4: Audience UI**
```
src/components/audience/LargeQuestionDisplay.tsx
src/components/audience/AnswerReveal.tsx
src/components/audience/ScoreboardDisplay.tsx
src/app/display/page.tsx
```

**MVP Day 5: Landing + Testing**
```
src/app/page.tsx
Manual testing and bug fixes
```

### Full Build Order (Post-MVP Reference)

**Post-MVP: Timer System**
```
src/hooks/use-timer.ts
src/components/presenter/TimerControl.tsx
src/components/audience/TimerDisplay.tsx
```

**Post-MVP: Pause/Emergency**
```
src/components/audience/EmergencyScreen.tsx
Update state machine
```

**Post-MVP: Settings + Rounds**
```
src/components/presenter/GameSettings.tsx
src/components/presenter/RoundProgress.tsx
```

**Post-MVP: Answer Amendment**
```
src/components/presenter/CorrectAnswerEditor.tsx
```

**Post-MVP: Expand Questions**
```
src/lib/game/sample-questions.ts      (add 15 more)
src/lib/game/questions.ts             (shuffle, filter)
```

**Post-MVP: TTS Audio**
```
src/hooks/use-audio.ts
```

---

## Milestones

### MVP Milestones

#### Milestone M1: Playable Engine
- [x] Types defined
- [ ] 7 engine functions implemented
- [ ] 5 sample questions created
- [ ] Basic unit tests passing

#### Milestone M2: Presenter UI Working
- [ ] Game store integrated
- [ ] 6 presenter components built
- [ ] Can play full 5-question game
- [ ] 3 keyboard shortcuts working

#### Milestone M3: Dual Screen Complete (MVP DONE)
- [ ] Sync working via BroadcastChannel
- [ ] Audience display complete
- [ ] Landing page done
- [ ] Manual testing passed

### Full Milestones (Post-MVP)

#### Milestone F1: Timer System
- [ ] Timer hook implemented
- [ ] Timer controls in presenter
- [ ] Timer display on audience
- [ ] Auto-start toggle working

#### Milestone F2: Pause & Emergency
- [ ] Pause/Resume working
- [ ] Emergency pause blanks audience
- [ ] All state transitions tested

#### Milestone F3: Full Question Bank
- [ ] 20 questions created
- [ ] Shuffle and category filter working
- [ ] Configurable rounds (2-6)

#### Milestone F4: TTS Audio
- [ ] Web Speech API integrated
- [ ] Mute toggle working
- [ ] Preferences persisted

#### Milestone F5: Launch Ready
- [ ] All features complete
- [ ] All tests passing (80%+ coverage)
- [ ] Accessibility audit passed
- [ ] Deployed to Vercel

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict MVP: 5 questions, no timer, no TTS, no settings UI |
| Sync bugs | Copy bingo's tested BroadcastChannel code |
| Font too small | Use @joolie-boolie/theme, test on projector |
| Timer drift | Timer deferred to post-MVP; when added, runs in presenter only |
| No tests = bugs | Basic engine tests in MVP, expand coverage post-MVP |
| Answer amendment bugs | Feature deferred to post-MVP |
| Emergency pause edge cases | Feature deferred to post-MVP |
| 20 teams UI overflow | MVP limited to 6 teams; expand post-MVP |
| TTS browser support | Feature deferred to post-MVP |

---

## Future Considerations (Beyond Full Scope)

- [ ] Short answer questions
- [ ] Image-based questions
- [ ] Audio-based questions (music clips)
- [ ] Custom question builder
- [ ] Database persistence (Supabase)
- [ ] User authentication
- [ ] Pre-recorded audio announcements
- [ ] "Final Jeopardy" style round
- [ ] Holiday/themed question packs
- [ ] Multi-facility support
- [ ] Analytics and game history
