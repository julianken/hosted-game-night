# USER ACCEPTANCE TESTING (UAT)

**Document Version:** 1.0
**Created:** 2026-01-22
**Target:** Internal Beta Release
**Audience:** Beta testers, QA team, stakeholders

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Flows to Test](#2-user-flows-to-test)
3. [Known Limitations](#3-known-limitations)
4. [Expected vs Actual Behavior](#4-expected-vs-actual-behavior)
5. [Feedback Collection](#5-feedback-collection)
6. [Bug Reporting Guidelines](#6-bug-reporting-guidelines)
7. [Beta Testing Schedule](#7-beta-testing-schedule)

---

## 1. Introduction

### 1.1 Purpose

This document guides internal beta testers through User Acceptance Testing (UAT) of the Joolie Boolie. Beta testing validates that the platform meets the needs of group and community activity coordinators for running Bingo and Trivia games.

### 1.2 Scope

**In Scope for Beta:**
- Bingo game (full game flow)
- Trivia game (full game flow)
- OAuth authentication
- Dual-screen presentation (presenter + audience displays)
- Template saving/loading
- PWA functionality (offline mode, install)

**Out of Scope for Beta:**
- Platform Hub dashboard (placeholder data)
- User profile management
- Session history/analytics
- Admin panel functionality
- Facility branding customization

### 1.3 Prerequisites

Before testing:
1. Use a modern browser (Chrome, Firefox, or Safari recommended)
2. Have two browser windows/monitors available for dual-screen testing
3. Have test credentials provided by the development team
4. Review known limitations section before reporting bugs

### 1.4 Test Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Development** | localhost:3000-3002 | Local testing |
| **Staging** | staging.joolieboolie.com | Pre-production testing |
| **Production** | *.joolieboolie.com | Live beta (TBD) |

---

## 2. User Flows to Test

### 2.1 Authentication Flows

#### Flow A1: First-Time Login (Bingo)

**Preconditions:** No existing account or session

**Steps:**
1. Navigate to Bingo app (`/play`)
2. Click "Sign In" or be redirected automatically
3. On Platform Hub consent page, create account or sign in
4. Click "Approve" on consent dialog
5. Verify redirect back to Bingo with session active

**Expected Results:**
- [ ] Consent page shows app name and permissions
- [ ] After approval, user is logged in
- [ ] User menu/avatar appears in UI
- [ ] Session persists after page refresh

**Notes for Testers:**
- First login may take longer due to account creation
- Note any error messages during the flow

---

#### Flow A2: First-Time Login (Trivia)

**Preconditions:** No existing Trivia session (may have Bingo session)

**Steps:**
1. Navigate to Trivia app (`/play`)
2. Complete OAuth flow if prompted
3. Verify session established

**Expected Results:**
- [ ] OAuth consent may be required again for Trivia
- [ ] Session is independent from Bingo session
- [ ] User can use both apps after login

---

#### Flow A3: Return User Login

**Preconditions:** Previously logged in, cookies present

**Steps:**
1. Close all browser windows
2. Reopen browser
3. Navigate to Bingo or Trivia `/play`
4. Observe automatic session restoration

**Expected Results:**
- [ ] No login prompt shown
- [ ] Session automatically restored
- [ ] User can immediately start game

---

### 2.2 Bingo Game Flows

#### Flow B1: Create and Play Offline Game

**Preconditions:** Logged in or anonymous

**Steps:**
1. Navigate to Bingo `/play`
2. Click "Create New Game"
3. Select "Offline Mode"
4. Note the generated 6-character session ID
5. Select a pattern (e.g., "Four Corners")
6. Configure audio settings if desired
7. Click "Start" or press Space
8. Call 10-15 balls using Space or button
9. Observe the board and ball history update

**Expected Results:**
- [ ] Session ID is 6 characters, alphanumeric
- [ ] Pattern preview shows correct cells highlighted
- [ ] Audio plays (if enabled) - ball announcement + roll sound
- [ ] Board updates with each call
- [ ] Ball history shows last 5 balls
- [ ] Duplicate balls never called

**Notes for Testers:**
- Test with audio both enabled and disabled
- Try different patterns
- Verify all 75 balls can be called without errors

---

#### Flow B2: Dual-Screen Presentation

**Preconditions:** Game created

**Steps:**
1. Start a Bingo game in one window (`/play`)
2. Open a second window/tab
3. Navigate to `/display`
4. Perform actions on presenter window
5. Observe changes on audience display

**Expected Results:**
- [ ] Display shows same current ball as presenter
- [ ] Display shows same called balls
- [ ] Display shows same pattern
- [ ] Pause/resume syncs to display
- [ ] Reset syncs to display (blank state)

**Notes for Testers:**
- Test on actual two monitors if available
- Note any lag between windows (should be <1 second)
- Try closing and reopening display window

---

#### Flow B3: Game Controls

**Preconditions:** Game in progress

**Test Pause:**
1. Press P or click Pause
2. Verify: Ball calling disabled
3. Verify: Status shows "Paused"
4. Press P again to resume
5. Verify: Game continues normally

**Test Undo:**
1. Call a ball
2. Press U or click Undo
3. Verify: Last ball removed from history
4. Verify: Ball returned to deck (can be called again)

**Test Reset:**
1. Call several balls
2. Press R or click Reset
3. Accept confirmation dialog
4. Verify: Game returns to initial state
5. Verify: All 75 balls available again

**Expected Results:**
- [ ] Pause prevents ball calling
- [ ] Undo correctly removes last ball
- [ ] Reset clears all state
- [ ] All keyboard shortcuts work as documented

---

#### Flow B4: Template Management

**Preconditions:** Logged in, authenticated user

**Save Template:**
1. Configure game (pattern, audio settings)
2. Click "Save as Template" or settings icon
3. Enter template name
4. Optionally check "Set as default"
5. Click Save

**Load Template:**
1. Click template selector dropdown
2. Select a previously saved template
3. Verify settings are applied

**Delete Template:**
1. Open template selector
2. Click delete/trash icon on template
3. Confirm deletion

**Expected Results:**
- [ ] Template saves successfully
- [ ] Template appears in selector after save
- [ ] Loading template restores all settings
- [ ] Deleted template no longer appears
- [ ] Default template auto-loads on login (if set)

**Notes for Testers:**
- Test with various pattern/audio combinations
- Note any settings that don't save/load correctly

---

### 2.3 Trivia Game Flows

#### Flow T1: Import Questions

**From CSV:**
1. Navigate to Trivia `/play`
2. Click "Import Questions"
3. Upload a CSV file with questions
4. Preview imported questions
5. Click "Import" to confirm

**From JSON:**
1. Click "Import Questions"
2. Paste JSON array of questions
3. Preview and confirm

**Expected Results:**
- [ ] CSV parser handles various formats
- [ ] Questions show in preview before import
- [ ] Invalid questions show errors
- [ ] Import adds questions to game

**Sample CSV Format:**
```csv
question,option1,option2,option3,option4,correct,category
What is 2+2?,3,4,5,6,2,math
Is the sky blue?,True,False,,,1,science
```

---

#### Flow T2: Team Management

**Steps:**
1. Start a new Trivia game
2. Click "Add Team"
3. Enter team name or accept default
4. Add 3-4 more teams
5. Rename a team by clicking its name
6. Delete a team using the X button

**Expected Results:**
- [ ] Teams appear in scoreboard
- [ ] Team names are editable
- [ ] Teams can be deleted
- [ ] Scores start at 0

---

#### Flow T3: Run a Complete Trivia Game

**Steps:**
1. Import questions (or use defaults)
2. Add 3+ teams
3. Click first question in list
4. Click "Display" to show on audience
5. Read question aloud (or use TTS)
6. Wait for teams to answer
7. Click "Reveal Answer"
8. Award points to correct teams (+1)
9. Move to next question
10. Complete all questions
11. End game and view final scores

**Expected Results:**
- [ ] Questions display correctly on audience
- [ ] Timer works (if enabled)
- [ ] Scoring updates immediately
- [ ] Scores sync to audience display
- [ ] Final standings shown at end

---

#### Flow T4: Emergency Pause

**Steps:**
1. During active game, press E
2. Observe audience display
3. Press E again to resume

**Expected Results:**
- [ ] Audience display goes blank (or shows pause screen)
- [ ] No game content visible during pause
- [ ] Game resumes normally after unpause

---

### 2.4 PWA Flows

#### Flow P1: Install PWA

**Chrome/Edge:**
1. Navigate to app
2. Look for install icon in address bar
3. Click install
4. Accept prompt
5. Verify app opens as standalone window

**Mobile:**
1. Navigate to app in mobile browser
2. Tap "Add to Home Screen"
3. Accept prompt
4. Verify app icon appears on home screen
5. Open app from icon
6. Verify standalone mode (no browser chrome)

**Expected Results:**
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] App launches as standalone
- [ ] App icon has correct branding

---

#### Flow P2: Offline Mode

**Steps:**
1. Open app and load a page
2. Disconnect from network (airplane mode)
3. Navigate within the app
4. Perform offline actions (game play)
5. Reconnect and verify sync

**Expected Results:**
- [ ] App loads from cache when offline
- [ ] Game can be played offline
- [ ] No errors shown for cached content
- [ ] Reconnection doesn't lose game state

---

## 3. Known Limitations

### 3.1 Platform Hub Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | Placeholder data | Shows sample data, not real sessions |
| Profile management | Not functional | Can view but not edit |
| Session history | Not implemented | Shows fake data |
| Settings | UI only | Changes don't persist |
| Logout | Not implemented | Clear cookies manually |

### 3.2 Bingo Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Online multiplayer | Backend exists | Not fully tested |
| Room joining with PIN | Implemented | May have edge cases |
| Voice pack selection | Works | Some browsers may have TTS issues |
| Pattern editor | Not implemented | Coming post-beta |

### 3.3 Trivia Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Timer auto-reveal | Not implemented | Manual reveal required |
| Answer amendment | Works | Re-scoring is automatic |
| Question editing | Limited | Edit before starting game |
| TTS | Browser-dependent | May not work in all browsers |

### 3.4 Browser-Specific Issues

| Browser | Issue | Workaround |
|---------|-------|------------|
| Safari | Audio autoplay blocked | Click to enable audio first |
| Mobile Safari | PWA limitations | Some features reduced |
| Firefox | TTS voice selection limited | Fewer voices available |
| Older Edge | Not tested | Use Chrome instead |

### 3.5 Known Bugs (Do Not Report)

These issues are already tracked and being fixed:

1. **Test failures (32)** - Unit test issues, not user-facing
2. **Platform Hub URLs** - Will be fixed before production
3. **Logout missing** - On the roadmap
4. **Console warnings** - Development artifacts

---

## 4. Expected vs Actual Behavior

### 4.1 Bingo Expected Behavior

| Action | Expected Behavior | If Different, Report |
|--------|-------------------|---------------------|
| Press Space | Ball called and announced | YES |
| Press P | Game pauses, no more calls | YES |
| Press R | Game resets after confirm | YES |
| Press U | Last ball removed | YES |
| Close display window | Presenter continues | YES |
| Reopen display | Syncs current state | YES |

### 4.2 Trivia Expected Behavior

| Action | Expected Behavior | If Different, Report |
|--------|-------------------|---------------------|
| Click Display | Question shows on audience | YES |
| Click +1/-1 | Team score updates | YES |
| Press E | Emergency pause activates | YES |
| Import CSV | Questions load | YES |
| Save template | Template appears in list | YES |

### 4.3 Authentication Expected Behavior

| Action | Expected Behavior | If Different, Report |
|--------|-------------------|---------------------|
| First login | Consent page shown | YES |
| Approve consent | Redirect back logged in | YES |
| Page refresh | Stay logged in | YES |
| Clear cookies | Need to login again | NO (expected) |

---

## 5. Feedback Collection

### 5.1 Feedback Categories

When providing feedback, categorize as:

| Category | Description | Example |
|----------|-------------|---------|
| **BUG** | Something broken | "Undo doesn't work after pause" |
| **UX** | Usability issue | "Button too small to tap on phone" |
| **FEATURE** | Missing functionality | "Would like custom patterns" |
| **CLARITY** | Confusing interface | "Don't understand what icon means" |
| **PERFORMANCE** | Speed/responsiveness | "Takes 5 seconds to load questions" |

### 5.2 Feedback Template

```
## Feedback Type: [BUG/UX/FEATURE/CLARITY/PERFORMANCE]

### Summary
[One sentence description]

### App
[Bingo/Trivia/Platform Hub]

### Steps to Reproduce (if BUG)
1.
2.
3.

### Expected Behavior
[What you expected]

### Actual Behavior
[What actually happened]

### Browser/Device
[Chrome on Windows / Safari on iPhone / etc.]

### Screenshots
[Attach if helpful]

### Severity
[Critical/Major/Minor/Cosmetic]

### Additional Notes
[Any other context]
```

### 5.3 Feedback Submission

**Primary Channel:** GitHub Issues
- Repository: `joolie-boolie-platform`
- Label: `beta-feedback`
- Use template provided

**Alternative:** Email
- Send to: beta@joolieboolie.com (placeholder)
- Subject: `[Beta Feedback] [Category] Summary`

**Quick Feedback:** In-app
- Click feedback icon (if present)
- Rate experience and add comment

---

## 6. Bug Reporting Guidelines

### 6.1 Before Reporting

1. **Check Known Limitations** (Section 3)
2. **Check Known Bugs** (Section 3.5)
3. **Try to reproduce** - Can you do it again?
4. **Check browser console** - Any errors? (F12 > Console)
5. **Try another browser** - Browser-specific issue?

### 6.2 Good Bug Report Example

```
## Bug: Ball call audio plays twice

### Summary
When calling a ball, the announcement plays twice in quick succession.

### App
Bingo

### Steps to Reproduce
1. Start a new game
2. Enable audio
3. Set voice pack to "British Slang"
4. Press Space to call a ball
5. Listen to audio

### Expected Behavior
Ball announced once (e.g., "B-7")

### Actual Behavior
Ball announced twice in succession

### Browser/Device
Chrome 120 on Windows 11
Audio: Built-in speakers

### Screenshots
N/A (audio issue)

### Severity
Minor (cosmetic, game still functional)

### Additional Notes
Only happens with "British Slang" voice pack.
"Standard" voice pack works correctly.
```

### 6.3 Poor Bug Report Example

```
"Audio is broken" - Not enough detail

"It doesn't work" - What doesn't work?

"Everything crashes" - What specifically?
```

### 6.4 Severity Definitions

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | App unusable, data loss | Cannot start game, data not saving |
| **Major** | Feature broken, no workaround | Undo doesn't work at all |
| **Minor** | Feature works incorrectly | Ball called but wrong audio plays |
| **Cosmetic** | Visual/UX issue only | Button alignment off by 2px |

---

## 7. Beta Testing Schedule

### 7.1 Testing Phases

| Phase | Sequence | Focus |
|-------|----------|-------|
| **Alpha** | Phase 1 | Core functionality, critical bugs |
| **Beta 1** | Phase 2 | Full flows, edge cases |
| **Beta 2** | Phase 3 | Performance, polish, feedback |
| **Release** | Phase 4 | Final fixes, launch prep |

### 7.2 Daily Testing Checklist

**Morning (15 min):**
- [ ] Login to both apps
- [ ] Verify sessions work
- [ ] Quick game test in each

**Afternoon (30 min):**
- [ ] Focus on specific flow from Section 2
- [ ] Try edge cases
- [ ] Document any issues

**End of Day (15 min):**
- [ ] Submit feedback/bugs found
- [ ] Note any blockers for tomorrow

### 7.3 Testing Priorities

**Week 1 Focus:**
1. Authentication flows (A1-A3)
2. Basic game flows (B1, T1-T2)
3. Critical bugs only

**Week 2 Focus:**
1. Advanced game flows (B2-B4, T3-T4)
2. Dual-screen testing
3. Template management

**Week 3 Focus:**
1. PWA functionality (P1-P2)
2. Edge cases and error handling
3. Performance testing
4. All remaining flows

### 7.4 Beta Tester Responsibilities

1. **Complete assigned test flows** at least once
2. **Report all bugs** using provided template
3. **Provide subjective feedback** on usability
4. **Attend weekly sync** (if scheduled)
5. **Respond to follow-up questions** from dev team

---

## Appendix A: Quick Reference

### Keyboard Shortcuts

**Bingo:**
| Key | Action |
|-----|--------|
| Space | Call ball |
| P | Pause/Resume |
| R | Reset |
| U | Undo |
| M | Mute |

**Trivia:**
| Key | Action |
|-----|--------|
| Up/Down | Navigate questions |
| Space | Peek answer |
| D | Toggle display |
| P | Pause/Resume |
| E | Emergency pause |
| R | Reset |

### URLs

| App | Local | Staging |
|-----|-------|---------|
| Bingo | localhost:3000 | staging-bingo.joolieboolie.com |
| Trivia | localhost:3001 | staging-trivia.joolieboolie.com |
| Hub | localhost:3002 | staging-hub.joolieboolie.com |

### Contacts

| Role | Contact |
|------|---------|
| Dev Lead | TBD |
| QA Lead | TBD |
| Bug Escalation | GitHub Issues |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Presenter View** | `/play` page - host controls |
| **Audience View** | `/display` page - projection screen |
| **Dual-Screen** | Using presenter + audience simultaneously |
| **OAuth** | Authentication protocol used for login |
| **PWA** | Progressive Web App - installable web app |
| **Template** | Saved game configuration |
| **TTS** | Text-to-Speech - computer reads text aloud |

---

**Thank you for participating in beta testing!**

Your feedback is crucial for making Joolie Boolie ready for groups and communities.
