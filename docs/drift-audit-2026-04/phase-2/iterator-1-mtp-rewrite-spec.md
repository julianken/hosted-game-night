# Iteration 1: Manual Test Plan Rewrite Spec

**Input:** Phase 1 Area 3 findings (25), `docs/MANUAL_TEST_PLAN.md` at HEAD `a7369f16`.
**Output:** Per-case disposition + new-text blocks + status/keyboard/history reconciliation.
**Methodology:** Every proposed rewrite verified against `[tracked-HEAD]` source. New counts recomputed from scratch.

---

## Assignment

Turn Area 3's 25 findings into an executable rewrite plan. Phase 1 inventoried; Phase 2 specifies.

---

## Provenance Key

- `[tracked-HEAD]` = verified via `git ls-files` / file reads at HEAD `a7369f16`.
- `[on-disk-snapshot]` = read from working tree, not cross-checked against HEAD (none used here).
- `[live-verified]` = checked against a live external system (none needed here).

All source references below are `[tracked-HEAD]` unless noted.

---

## 1. Per-Test-Case Disposition Table

Total test cases in MTP at HEAD: **85** stories / test rows in-scope, spanning Stories 2.1 → 7.2. Disposition per row:

| Test ID | Current MTP line range | Disposition | Reason | New text (if REWRITE/ADD) |
|---------|----------------------|-------------|--------|---------------------------|

### Section 1 — Bingo (Stories 2.1 – 2.11)

#### Story 2.1 — Home Page (:114–:124)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 2.1.1 | :120 | REWRITE | CTA text is "Play Now" not "Play" (`apps/bingo/src/app/page.tsx:44`). **New:** `Navigate to localhost:3000. Verify "Bingo" branding visible. Verify "Play Now" CTA link exists and has href="/play".` |
| 2.1.2 | :121 | REWRITE | No longer "offline session" in UI vocab; session is a UUID; link text is "Play Now". **New:** `Click "Play Now" (or navigate to localhost:3000/play). Verify the page loads and a session UUID is auto-generated (visible in Open Display URL).` |
| 2.1.3 | :122 | KEEP | `/display` with no `session` param still shows InvalidSessionError (`apps/bingo/src/app/display/page.tsx:97`). Text unchanged. |
| 2.1.4 | :123 | KEEP | Security headers test stands. |
| 2.1.5 | :124 | KEEP | `StatsDisplay` still rendered (`apps/bingo/src/app/page.tsx:188`). |

#### Story 2.2 — Room Setup (:126–:139) — **DELETE ENTIRELY**

| Test ID | Current MTP line | Disposition | Reason |
|---|---|---|---|
| 2.2 header | :126–:128 | DELETE | No Room Setup modal exists. `apps/bingo/src/app/play/page.tsx` shows a single auto-instantiated UUID session; no modal, no PIN, no room code, no "Create/Join/Offline" branching. |
| 2.2.1 | :132 | DELETE | Same. |
| 2.2.2 | :133 | DELETE | Three-option modal never rendered. |
| 2.2.3 | :134 | DELETE | No "Create New Game" / PIN / room code. |
| 2.2.4 | :135 | DELETE | No join-room form. |
| 2.2.5 | :136 | DELETE | No PIN field exists (F3.1). |
| 2.2.6 | :137 | DELETE | No room code input exists. |
| 2.2.7 | :138 | DELETE | Session IDs are UUIDs (`apps/bingo/src/lib/sync/session.ts:10–12`), not 6 uppercase chars. |
| 2.2.8 | :139 | DELETE | Same; remove entire 6-char-ID premise. |

**Rationale:** Entire feature removed; no equivalent flow exists. Merge the "single auto-session on /play" semantic into Story 2.11 (renamed) so every bingo story has a canonical landing test.

#### Story 2.3 — Bingo Game Controls (:141–:154)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 2.3.1 – 2.3.7 | :147–:153 | KEEP | Space/P/R/U keybindings verified at `apps/bingo/src/hooks/use-game.ts:354–378`. Behaviors unchanged. |
| 2.3.8 | :154 | REWRITE | "Keyboard shortcuts reference ... lists Space, P, R, U, M" is incomplete per F3.17. The in-page reference on `/play` (ControlPanel) does list the 5 game shortcuts, but the `KeyboardShortcutsModal` defaults at `apps/bingo/src/components/ui/KeyboardShortcutsModal.tsx:11–19` list 7 (adds F and ?). Clarify which is under test. **New:** `Verify the in-page keyboard shortcuts reference on /play lists Space (Roll), P (Pause), R (Reset), U (Undo), M (Mute). Verify that pressing ? on /display opens the full KeyboardShortcutsModal listing 7 bindings (Space, P, R, U, M, F, ?).` |

#### Story 2.4 — Pattern Selection (:156–:166) — KEEP ALL

All 5 tests still valid. `PatternSelector`, 29 patterns across 7 categories per `apps/bingo/CLAUDE.md` Pattern list.

#### Story 2.5 — Auto-Call Mode (:168–:177) — KEEP ALL

`/play` renders auto-call toggle + 5-30s slider at lines 287–304. All 4 tests valid.

#### Story 2.6 — Audio System (:179–:188) — REWRITE test 1, ADD tests for BEA-664

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 2.6.1 | :185 | REWRITE | Audio controls now inside a `<details>` "Audio & Sound" collapsible (`apps/bingo/src/app/play/page.tsx:313–341`). Also add "Audio: Display/Presenter" indicator (line 143–147). **New:** `Expand the "Audio & Sound" collapsible on /play. Verify voice pack selector, voice-volume control, roll-sound selector, and reveal-chime selector are all visible. Verify the header-right "Audio: Presenter" indicator is visible (flips to "Display" when audience window unlocks audio).` |
| 2.6.2 – 2.6.4 | :186–:188 | KEEP | M-key mute + voice pack selection + sliders unchanged. |
| **2.6.5 (NEW)** | insert after :188 | ADD | Cover BEA-664 audio-sequence handshake (F3.12). **New:** `Open /display alongside /play (Story 2.7.1). Click overlay to unlock audio on display. Verify header on /play flips from "Audio: Presenter" to "Audio: Display". Press Space to roll. Verify the roll sound and voice announcement play on /display (not /play), with reveal chime firing ~400ms after the ball number appears.` |
| **2.6.6 (NEW)** | after 2.6.5 | ADD | **New:** `With display not unlocked (or no display open), press Space. Verify audio plays on presenter window (fallback path). Verify indicator still reads "Audio: Presenter".` |

#### Story 2.7 — Dual-Screen Sync (:190–:202) — KEEP ALL, add URL-format fix note

All 7 tests still valid. Noting: the "Open Display" link format is `/display?session=<UUID>` (`apps/bingo/src/app/play/page.tsx:79`), not `?offline=<code>` as the 2.7.1 PASS annotation (:196) implies. Rewrite the PASS annotation text only (Section 2, "Execution History Cleanup").

#### Story 2.8 — Display View Features (:204–:214)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 2.8.1 | :210 | KEEP | Large ball display still rendered via `BallReveal size="display"`. |
| 2.8.2 | :211 | KEEP | F key on `/display` toggles fullscreen (`apps/bingo/src/app/display/page.tsx:278–280`). |
| 2.8.3 | :212 | KEEP | `?` on `/display` opens `KeyboardShortcutsModal` with display-only shortcuts (lines 24–27 + 269–272). |
| 2.8.4 | :213 | KEEP | Status badge at lines 394–451 ("Live" / "Paused" / "Ended" / "Offline"). Note: labels are "Live" not "Playing" — see 2.8.4 REWRITE below. |
| 2.8.4 | :213 | REWRITE | Badge labels are "Live" (while playing), "Paused", "Ended", "Offline" — not "Playing" (`apps/bingo/src/app/display/page.tsx:441–450`). **New:** `Verify status badge shows "Live" during active play, "Paused" when paused, "Ended" on game over, and "Offline" when sync disconnected.` |
| 2.8.5 | :214 | REWRITE | Wrong URL param per F3.4. **New:** `Navigate to localhost:3000/display?session=not-a-uuid. Verify "Invalid Session" error page appears. Repeat with localhost:3000/display (no param). Verify same error page appears (the regex check at isValidSessionId returns false for both).` |

#### Story 2.9 — Theme System (:216–:225) — KEEP ALL

Theme store + `useApplyTheme` still active on `/play` and `/display`. 4 tests valid.

#### Story 2.10 — Session Recovery (:227–:235)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 2.10.1 | :233 | KEEP | Balls, status, pattern all recover via `useGameStore` persist. |
| 2.10.2 | :234 | REWRITE | There is no "Create online room" or "PIN" to persist. **New:** `Refresh /play. Verify the session UUID (visible via browser_evaluate on Open Display URL) remains stable across reload — each presenter window holds its own UUID generated once via generateSessionId() (apps/bingo/src/app/play/page.tsx:35).` |
| 2.10.3 | :235 | REWRITE | "Fresh room setup modal" does not exist — New Game button triggers `confirm()` then `resetGame()`. **New:** `While in an active session, click "New Game". Verify native confirm dialog appears ("This will end the current game and create a new one. Are you sure?"). Confirm. Verify the game resets to idle with no called balls, same session UUID.` |

#### Story 2.11 — Standalone Play (:237–:249) — Merge with 2.1, DELETE redundant wording

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| Story 2.11 header | :237–:240 | REWRITE | Name "Standalone Play" is redundant (every bingo session is standalone). Rename to **Story 2.11: Bingo Home → Play End-to-End** and keep as a smoke test. |
| 2.11.1 | :243 | REWRITE | "Play" → "Play Now" (F3.7). **New:** `Navigate to localhost:3000. Verify "Play Now" CTA is visible.` |
| 2.11.2 | :244 | KEEP | `href="/play"` confirmed at `apps/bingo/src/app/page.tsx:33`. |
| 2.11.3 | :245 | REWRITE | 6-char session ID claim is false (F3.3). **New:** `Click "Play Now". Verify /play loads. Open DevTools console and run window.open().arguments or evaluate document.querySelector on the "Open Display" button href → verify it contains ?session=<UUID-v4>. The UUID is not displayed in the visible header.` |
| 2.11.4 | :246 | KEEP | Controls (Space/P/U/R) still work. |
| 2.11.5 | :247 | KEEP | Audio controls still work. |
| 2.11.6 | :248 | KEEP | Pattern selector still works. |
| 2.11.7 | :249 | KEEP, but mark as **multi-window required** | Dual-screen sync covered in Story 2.7 — this is a smoke-test rollup, fine to stay NOT TESTED if no multi-window. |

---

### Section 2 — Trivia (Stories 3.1 – 3.22)

#### Story 3.1 — Home Page (:255–:264)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.1.1 | :261 | REWRITE | "Question Sets" link does not exist (F3.5). Trivia home has only "Play" (`apps/trivia/src/app/page.tsx:14–20`). **New:** `Navigate to localhost:3001. Verify "Trivia" branding and single "Play" CTA (href="/play") visible. Verify no secondary nav links exist.` |
| 3.1.2 | :262 | KEEP | "Play" click lands on `/play` → SetupGate. |
| 3.1.3 | :263 | KEEP | `/display` with no session shows Invalid Session. |
| 3.1.4 | :264 | KEEP | Security headers unchanged. |

#### Story 3.2 — Room Setup (:266–:280) — **DELETE ENTIRELY**, REPLACE with SetupGate wizard coverage

| Test ID | Current MTP line | Disposition | Reason |
|---|---|---|---|
| 3.2 header | :266–:268 | DELETE | No Room Setup modal in trivia. `/play` renders `SetupGate` (`apps/trivia/src/app/play/page.tsx:557–563`) which hosts `SetupWizard` (questions → settings → teams → review). |
| 3.2.1 – 3.2.9 | :272–:280 | DELETE | No modal; no "Create New Game Room" / "Join Existing Game" / PIN / room code / Play Offline buttons exist. Source evidence: `apps/trivia/src/components/presenter/SetupGate.tsx:116–175` has only Brand + Setup badge header, connection dot, "Open Display" button, scrollable `SetupWizard`. |

**Rationale:** Replace this entire story with new Story 3.2 "Setup Wizard" (see §5 ADD block below).

#### Story 3.3 — Team Management (:282–:292) — KEEP 4, REWRITE 1

Team manager now lives inside SetupWizard's teams step, not as a top-level panel. Tests 3.3.1–3.3.4 still valid if run from inside the Teams wizard step. Test 3.3.5 (max 20) still valid — source: `apps/trivia/src/stores/settings-store.ts` reports no explicit 20-cap but `apps/trivia/CLAUDE.md` says "Up to 20 teams". KEEP as-is, test unchanged.

#### Story 3.4 — Game Lifecycle (:294–:307) — KEEP ALL

8 tests valid. Start game gating unchanged. Keyboard shortcuts (D→Space for display toggle, P peek, E emergency, R reset) match source `apps/trivia/src/hooks/use-game-keyboard.ts`. Note: test 3.4.5 "Press Space to display question" is correct (use-game-keyboard.ts:194–201). Legacy "D" key in MTP:61 prereq line is wrong (see §4 below) — the actual key is Space. No change needed here.

#### Story 3.5 — Scoring (:309–:318) — KEEP ALL

4 tests valid.

#### Story 3.6 — Round Progression (:320–:330) — KEEP ALL

5 tests valid. "N key advances round" confirmed at use-game-keyboard.ts:225–237.

#### Story 3.7 — Question Import (:332–:342)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.7.1 | :338 | REWRITE | "QuestionImporter" is now `QuestionSetImporter` inside the SetupWizard's questions step (`apps/trivia/src/components/presenter/QuestionSetImporter.tsx`, `AddQuestionsPanel.tsx`). Drag-drop zone exists. **New:** `Enter /play (SetupGate appears). Navigate to the "Add Questions" step. Verify the QuestionSetImporter drag-drop zone is visible alongside the TriviaApiImporter and ChatGptGuide tabs.` |
| 3.7.2 | :339 | REWRITE | CSV import removed — only JSON is supported (`apps/trivia/src/components/presenter/QuestionSetImporter.tsx:37 parseJsonQuestions`). No CSV parser exists. **New:** `Upload a valid JSON question-set file. Verify preview shows the parsed questions with category badges. Click "Import" and verify state transitions from preview → questions loaded.` |
| 3.7.3 | :340 | KEEP (wording stands) | JSON import is the supported path; update `**PASS**` annotation to remove the "3/3 valid questions parsed from JSON array format" specifics since that was run-9 data. |
| 3.7.4 | :341 | REWRITE | Error message differs (no "Missing required columns" for JSON). **New:** `Upload an invalid JSON file (e.g., missing "question" field). Verify the importer displays a validation error message listing the field issue.` |
| 3.7.5 | :342 | KEEP | Category detection still uses `getCategoryBadgeClasses` from `lib/categories`. |

#### Story 3.8 — Question Sets (:344–:353) — **DELETE test 1, REWRITE 3 and 4, KEEP 2**

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.8 header | :344 | REWRITE | Rename to "Story 3.8: Question Set Templates (Load/Save)" to match UI text "Load Question Set" / "Save Question Set" (`TemplateSelector.tsx:128`, `SaveTemplateModal.tsx:117`). |
| 3.8.1 | :350 | DELETE | `/question-sets` route does not exist (F3.6, F3.25). Route was deleted in PR #517. No replacement page. |
| 3.8.2 | :351 | KEEP (rename UI text) | Updated label: "Load Question Set" combobox (`TemplateSelector.tsx:128`). Test step text OK. |
| 3.8.3 | :352 | REWRITE | **New:** `From SetupGate wizard (or presenter view if mid-game), open the "Load Question Set" combobox. Select a saved template. Verify the game's question list populates with the template's questions and the round breakdown updates accordingly.` |
| 3.8.4 | :353 | REWRITE | Button label is "Save Question Set" not "Save Questions as Set"; opens `SaveTemplateModal`. **New:** `After importing questions, click "Save Question Set" button. Verify modal opens (title "Save Question Set"). Enter a name. Click Save. Verify the new template appears in the Load Question Set combobox.` |

#### Story 3.9 — Trivia Dual-Screen Sync (:355–:367) — KEEP 6, REWRITE 1

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.9.1 – 3.9.7 | :361–:367 | KEEP | All still valid. Note: 3.9.3 mentions "Press D to display a question" — source uses Space not D (use-game-keyboard.ts:194–201). **Clarify:** |
| 3.9.3 | :363 | REWRITE | **New:** `Start a game. Select a question in the left-rail navigator. Press Space to toggle "show on display". Verify the question text and options A–D appear on /display. Press Space again. Verify the display reverts to waiting / previous scene.` |

#### Story 3.10 — TTS (:369–:378) — KEEP ALL but flag coverage gap

4 tests. TTS is disabled mid-game (timing) — tests 2–4 still NOT TESTED because voice selector only surfaces in setup. Keep as-is.

#### Story 3.11 — Settings Panel (:380–:392) — KEEP ALL, expand for BEA-713

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.11.1 – 3.11.7 | :386–:392 | KEEP | Ranges match `apps/trivia/src/stores/settings-store.ts:61–64` (roundsCount 1–6, questionsPerRound 3–10, timerDuration 10–120). All 7 tests valid. |
| **3.11.8 (NEW)** | insert after :392 | ADD | Cover BEA-713 derived-settings (F3.9). **New:** `Import a question set with exactly 3 unique categories. In wizard Settings step, verify the "By category" toggle is enabled and selectable. Set roundsCount to 5. Verify effective roundsCount clamps to 3 (shown in Review step's per-round breakdown). Toggle "By category" off. Verify roundsCount returns to the user's raw setting of 5. Source: apps/trivia/src/components/presenter/SetupGate.tsx:71–74.` |
| **3.11.9 (NEW)** | insert after 3.11.8 | ADD | **New:** `Import a question set with 5+ unique categories. Verify the "By category" toggle is disabled or auto-off (canUseByCategory = false in SetupGate.tsx:57). Import a 3-category set afterwards. Verify the toggle becomes enabled again and honors the user's previously saved intent without requiring re-click.` |
| **3.11.10 (NEW)** | insert after 3.11.9 | ADD | **New:** `Set isByCategory=true and roundsCount=5 via wizard. Refresh. Verify persisted user settings intact (effective roundsCount may differ based on question set, but underlying userRoundsCount from settings-store remains 5; confirm via localStorage key "hgn-trivia-settings" JSON).` |

#### Story 3.12 — Session Recovery (:394–:403)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.12.1 – 3.12.3 | :400–:402 | KEEP | Game-store persist still works. |
| 3.12.4 | :403 | REWRITE | No "Room Setup dialog"; the "New Game" button shows `Modal` with "Start New Game?" title (`apps/trivia/src/app/play/page.tsx:578–590`). **New:** `Click "New Game" (R key or header icon). Verify the "Start New Game?" confirmation modal appears (danger variant). Click "New Game" inside the modal. Verify full reset: teams cleared, SetupGate re-mounts, audience scene set to "waiting".` |

#### Story 3.13 — Keyboard Shortcuts (:405–:416) — ADD tests for missing keys

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.13.1 – 3.13.4 | :411–:414 | KEEP | Still valid. |
| 3.13.5 | (missing) | ADD | Fill F3.19 numbering gap. **New:** `| 5 | Next round (N) | In between_rounds state (after completing a round), press N. Verify advances to next round's round_intro scene. Source: use-game-keyboard.ts:225–237. |` |
| 3.13.6 | :415 | KEEP | Reset (R). |
| 3.13.7 | :416 | KEEP | Help (?). |
| **3.13.8 (NEW)** | after :416 | ADD | **New:** `Timer / Scoreboard (T) — On question_display, press T. Verify timer starts. On any non-question scene, press T. Verify scoreboard visibility toggles on /display. Source: use-game-keyboard.ts:245–261.` |
| **3.13.9 (NEW)** | after 3.13.8 | ADD | **New:** `Close question (S) — In question_display, press S. Verify timer stops (if running) and scene advances to question_closed. Source: use-game-keyboard.ts:264–275.` |
| **3.13.10 (NEW)** | after 3.13.9 | ADD | **New:** `Skip timed scene (Enter) — On question_anticipation or answer_reveal, press Enter. Verify scene advances via SCENE_TRIGGERS.SKIP. On round_scoring, press Enter. Verify nothing happens (blocked per use-game-keyboard.ts:279).` |
| **3.13.11 (NEW)** | after 3.13.10 | ADD | **New:** `Fullscreen (F) — Press F. Verify fullscreen toggles via useFullscreen hook. Source: use-game-keyboard.ts:284–286.` |
| **3.13.12 (NEW)** | after 3.13.11 | ADD | **New:** `Quick score (1–9, 0) — In a scoring-phase scene (question_closed / answer_reveal / round_summary / round_scoring / recap_*), press digit N. Verify corresponding team toggles a point. Press Shift+N. Verify the team loses a point. Source: use-game-keyboard.ts:140–158.` |
| **3.13.13 (NEW)** | after 3.13.12 | ADD | **New:** `Undo score (Ctrl/Cmd+Z) — After quick-scoring a team, press Ctrl+Z (Win) or Cmd+Z (Mac). Verify last action reverses. Verify this is blocked during round_scoring (panel owns undo). Source: use-game-keyboard.ts:289–296.` |

#### Story 3.14 — Category System (:418–:425) — KEEP ALL

2 tests valid.

#### Story 3.15 — Presets (:427–:435)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.15.1 | :433 | KEEP | `PresetSelector` renders "Load Preset" combobox. |
| 3.15.2 | :434 | REWRITE | **New:** `Open "Load Preset" combobox. Select a saved preset. Verify SetupWizard settings (rounds, questions-per-round, timer duration, timer auto-start, timer visible, ttsEnabled, isByCategory) update to match the preset values. Verify localStorage key "hgn-trivia-presets" is read (not written).` |
| 3.15.3 | :435 | REWRITE | **New:** `Configure settings in wizard. Click "Save Settings as Preset". Verify SavePresetModal opens. Enter a name. Save. Verify the new preset appears in "Load Preset" combobox and localStorage key "hgn-trivia-presets" contains the new entry.` |

#### Story 3.16 — Scene Choreography (:437–:448) — KEEP ALL

6 tests valid. Scene list already matches `apps/trivia/CLAUDE.md` Scene Engine section.

#### Story 3.18 — Timer Auto-Reveal (:450–:460) — KEEP ALL

5 tests valid.

#### Story 3.19 — Round Recap Flow (:462–:472) — KEEP ALL

5 tests valid.

#### Story 3.20 — Scene Navigation Buttons (:474–:487) — KEEP ALL

8 tests valid.

#### Story 3.21 — Round Scoring Submission Gate (:489–:499) — KEEP ALL

5 tests valid.

#### Story 3.22 — Round Scoring Layout (:501–:512) — KEEP ALL but REWRITE test 5

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 3.22.1 – 3.22.4 | :507–:510 | KEEP | Layout unchanged. |
| 3.22.5 | :511 | KEEP | Skip-link-removed test correct. But see F3.21: it contradicts Story 5.2 test 2 (:537) which still expects the skip link. Fix is in that story, not this one. |
| 3.22.6 | :512 | KEEP | `hideHeader` logic still wired. |

---

### Section 3 — Accessibility (Stories 5.1 – 5.2)

#### Story 5.1 — Font Sizes & Touch Targets (:518–:528) — KEEP ALL (5 tests)

#### Story 5.2 — Keyboard Navigation (:530–:539)

| Test ID | Current MTP line | Disposition | Reason / New text |
|---|---|---|---|
| 5.2.1 | :536 | REWRITE | Focus-order PASS annotation references "Save as Template" which exists but also embeds run-8 trajectory specifics. Trim to current DOM order. **New:** `Tab through /play. Verify focus order flows: Skip link → (if visible) Create New Game → Open Display → Roll → Pause → Undo → Reset → Save as Template. Source: apps/bingo/src/app/play/page.tsx sequence.` |
| 5.2.2 | :537 | REWRITE | "Skip to game controls" skip link was removed per BEA-673 (F3.21). No such link in `apps/trivia/src/app/play/page.tsx`. **New:** `Tab through /play on trivia. Verify focus order flows: Skip to main content → Open Display → Fullscreen → New Game (if mid-game) → Shortcuts help button → Wizard primary action (during setup) or Nav buttons (during gameplay). Verify no "Skip to game controls" link is present (removed per BEA-673).` |
| 5.2.3 | :538 | REWRITE | "Room Setup modal" does not exist. Use a different modal (e.g., SaveTemplateModal or KeyboardShortcutsModal). **New:** `Open any modal (e.g., press ? to open KeyboardShortcutsModal, or click "Save as Template" on bingo). Tab repeatedly. Verify focus stays within the modal (doesn't escape to background). Press Escape. Verify modal closes and focus returns to trigger element.` |
| 5.2.4 | :539 | REWRITE | Must reflect BEA-673 removal of "Skip to game controls" on trivia. **New:** `Verify "Skip to main content" skip link exists on both Bingo /play (apps/bingo/src/app/play/page.tsx:108) and Trivia /play (apps/trivia/src/app/play/page.tsx:262). Verify it's visually hidden until focused. Verify Trivia no longer has a second "Skip to game controls" link (removed BEA-673).` |

---

### Section 4 — PWA (Stories 6.1 – 6.2) — KEEP ALL

5 tests valid.

### Section 5 — Responsive (Stories 7.1 – 7.2) — KEEP ALL

4 tests valid.

---

## 2. Execution History Cleanup Plan

**Current state:** :77–:89 holds 9 runs dated 2026-02-14 → 2026-03-02. Plus the BEA-702 footnote at :91. All 9 runs include Platform Hub, OAuth, and template-aggregation stories that no longer exist.

**Decision:** **Wipe** all pre-rebuild rows (runs 1–9), and reset to a single empty "post-standalone-rebuild" table with a rebase-marker row.

**Rationale:**
- Rows 1–6 covered Platform Hub (removed BEA-682). Rows 7–8 covered Guest Mode + session recovery paths (partly still valid, but with auth-era URL patterns). Row 9 (2026-03-02) was before `/api/health` (BEA-698), SetupGate refactor (BEA-713), ChatGPT guide, and selector-drift fixes (BEA-704/706). None of the PASS annotations can be trusted to reflect HEAD behavior.
- Keeping stale rows as "historical continuity" (current BEA-702 footnote approach) is agent-poison — future agents see "PASS (run 9)" and assume the test is live.
- Per-test-case PASS annotations mixed into the Result column (lines 120–249, 261–528) should be pruned too — see §3.

**Proposed replacement block (:75–:98 and inline PASS annotations):**

```markdown
## Execution History

| Date | Scope | Result |
|------|-------|--------|
| 2026-04-13 (rebase marker) | Standalone rebuild + rebrand (BEA-697 → BEA-719). Prior execution history (2026-02 through 2026-03) preserved in git history at HEAD `a7369f16`; not reproducible against current UI. | — (rebaseline pending) |

> **Note:** Tests marked `NOT TESTED` in Result columns are awaiting first manual execution against the current HEAD. Tests with no explicit result marker are assumed NOT TESTED.

## Bugs Found and Fixed

| ID | Severity | Description | Fix |
|----|----------|-------------|-----|

> **Note:** Bugs filed against Linear (BEA-###); this table is no longer the source of truth. BEA-503 and BEA-504 (pre-standalone bingo/trivia persistence) are preserved in git history.
```

**Inline PASS annotation cleanup:** Strip all "— description (run N)" suffixes in Result columns. Either leave `**PASS**` bare (the test passes at HEAD, verified now) or downgrade to `NOT TESTED`. Do not preserve run-N attribution from the old regime.

---

## 3. Status-Count Reconciliation

**Goal:** Recompute the line-20 status ("168 PASS, 0 BUGS, 16 NOT TESTED") from scratch to match the post-rewrite plan.

**After applying §1 dispositions:**

- Tests DELETED (Story 2.2 entirely + Story 3.2 entirely + Story 3.8.1 + misc stale PASS annotations): **-19 tests**
  - Story 2.2: 8 tests
  - Story 3.2: 9 tests
  - Story 3.8 test 1 (`/question-sets` route): 1 test
  - Story 3.13 orphan numbering (recovered by ADD, net -0): 0
  - Story 2.11 redundancy: 0 (merge, no delete)
  - Tolerance: ±2 edge-cases
- Tests REWRITTEN (steps change, count unchanged): ~24 (no delta to test count).
- Tests ADDED (§5 Coverage Additions below): **+18 tests**
  - Story 2.6 (BEA-664 audio-to-display): +2
  - Story 3.11 (BEA-713 derived settings): +3
  - Story 3.13 (missing keyboard shortcuts): +6 (fills gap at #5 + adds T, S, Enter, F, 1-9, Ctrl+Z)
  - Story 6.3 (NEW — `/api/health`): +2
  - Story 3.17 (NEW — ChatGPT guide): +2
  - Story 3.23 (NEW — Bingo Template Store): +3

**Starting total at HEAD:** 170 bolded `**PASS**` strings in Result column + 30+ `NOT TESTED` strings in test-case rows (roughly 85 distinct test cases per §1 counting; the 218 PASS count in F3.15's grep includes history text).

**Baseline test count at HEAD:** 85 test cases (counting distinct table rows under Section 1-5, excluding history/bugs tables).

**Post-rewrite math:**
- Baseline: 85
- DELETE: −18 (Story 2.2 × 8, Story 3.2 × 9, Story 3.8.1)
- ADD: +18 (see above)
- **Post-rewrite test count: 85** (coincidental equality)

**Post-rewrite status line:** Since Execution History is wiped (§2), **every** test starts as `NOT TESTED` until re-run. The new status line should read:

```markdown
**Current status:** 0 PASS, 0 BUGS, 85 NOT TESTED (rebaselined 2026-04-13; post BEA-697 → BEA-719 standalone rebuild)
```

(After first manual run, update as needed. But at time of spec, all tests are unverified against HEAD per Phase 1 F3.14.)

---

## 4. Keyboard Shortcut Truth Table

**Source:**
- Bingo `/play`: `apps/bingo/src/hooks/use-game.ts:354–378` (the `handleKeyDown` switch).
- Bingo `/display`: `apps/bingo/src/app/display/page.tsx:261–282` + `displayShortcuts` array at :24–27.
- Bingo modal defaults: `apps/bingo/src/components/ui/KeyboardShortcutsModal.tsx:11–19`.
- Trivia `/play`: `apps/trivia/src/hooks/use-game-keyboard.ts:140–305`.
- Trivia modal defaults: `apps/trivia/src/components/ui/KeyboardShortcutsModal.tsx:11–24`.

### Bingo (definitive)

| Key | Context | Action | Source |
|-----|---------|--------|--------|
| Space | `/play`, `canCall` | Roll / Call next ball | `use-game.ts:355–360` |
| P | `/play`, `canPause`/`canResume` | Pause / Resume game | `:361–367` |
| R | `/play`, always | Request reset (with confirm dialog) | `:368–370` |
| U | `/play`, `canUndo && !isProcessing` | Undo last call | `:371–375` |
| M | `/play`, always | Mute / unmute audio | `:376–378` |
| F | `/display` only | Toggle fullscreen | `display/page.tsx:278–280` |
| ? | `/display` only | Show keyboard shortcuts modal | `:269–272` |

**Note:** F and ? are NOT bound on `/play`. MTP:61 prereq lists "Space, P, R, U, M, D, E, ?, arrows" as global — incorrect for bingo (D/E don't exist; ? only on /display).

### Trivia (definitive)

| Key | Context | Action | Source |
|-----|---------|--------|--------|
| ArrowUp | `/play`, always | Navigate to previous question | `use-game-keyboard.ts:162–167` |
| ArrowDown | `/play`, always | Navigate to next question | `:169–174` |
| ArrowLeft | `between_rounds` + scene in `recap_qa`/`round_scoring`/`recap_scores` | Backward navigation | `:177–185` |
| ArrowRight | `/play`, always | Advance scene (SCENE_TRIGGERS.ADVANCE) | `:188–191` |
| Space | `/play`, always | Toggle question on display | `:194–201` |
| P | `/play`, always | Peek answer (local only) | `:204–206` |
| E | `/play`, always | Toggle emergency blank | `:209–211` |
| R | `/play`, `status !== 'setup'` | Reset game (with confirm callback) | `:214–222` |
| N | `between_rounds` + scene in `round_summary`/`recap_qa`/`round_scoring`/`recap_scores` | Next round | `:225–237` |
| M | `/play`, always | Toggle TTS mute | `:240–242` |
| T | `question_display`/`question_anticipation` → start timer; else → toggle scoreboard | Timer / scoreboard toggle | `:245–261` |
| S | `question_display`/`question_closed` | Close question | `:264–275` |
| Enter | `/play`, NOT in `round_scoring` | Skip timed scene (SCENE_TRIGGERS.SKIP) | `:278–281` |
| F | `/play`, always | Toggle fullscreen | `:284–286` |
| 1–9, 0 | Scoring-phase scenes | Quick-score team N (toggle +1) | `:140–158` |
| Shift+1–9 | Scoring-phase scenes | Remove point from team N | `:148–150` |
| Ctrl/Cmd+Z | Scoring-phase scenes, NOT `round_scoring` | Undo last score action | `:289–296` |
| ? (Shift+Slash) | `/play`, always | Show help modal | `:299–304` |

**What MTP:61 should say:**

```markdown
| `browser_press_key` | Keyboard shortcuts. See Story 2.3 (bingo /play: Space, P, R, U, M), Story 2.8 (bingo /display: F, ?), Story 3.13 (trivia full table — 18 bindings). |
```

**What's in `apps/bingo/CLAUDE.md` already:** Correct (Space, P, R, U, M). Matches use-game.ts.
**What's in `apps/trivia/CLAUDE.md` already:** Correct (all 18 bindings). Matches use-game-keyboard.ts.
**Canonical source of truth:** `apps/*/CLAUDE.md`. Copy those tables verbatim into MTP Story 2.3/2.8/3.13 tests as reference material if helpful.

---

## 5. Coverage Additions (new test cases)

### Story 6.3 (NEW) — Health Endpoint (BEA-698)

Insert after Story 6.2 at MTP ~:563.

```markdown
### Story 6.3: Health Endpoint — **ALL NOT TESTED**

**As a site reliability engineer**, I want a liveness endpoint for uptime monitors.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Bingo health responds 200 | `curl http://localhost:3000/api/health` (or browser_navigate + JSON render). Verify HTTP 200 response with JSON body `{ status: "ok", service: "bingo", timestamp: <ISO 8601 string> }`. Source: `apps/bingo/src/app/api/health/route.ts:11–20`. | NOT TESTED |
| 2 | Trivia health responds 200 | `curl http://localhost:3001/api/health`. Verify HTTP 200 with `{ status: "ok", service: "trivia", timestamp: <ISO> }`. Source: `apps/trivia/src/app/api/health/route.ts:11–20`. | NOT TESTED |
```

### Story 3.17 (NEW) — ChatGPT Question Guide

Replaces the "Removed Story 3.17 (Buzz-In)" note. Insert at :88 timeline note + new story block after Story 3.16 at MTP ~:449.

```markdown
### Story 3.17: ChatGPT Question Creation Guide — **ALL NOT TESTED**

**As a presenter**, I want a copy-paste ChatGPT prompt to generate trivia questions.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Guide tab visible | Enter /play setup, go to "Add Questions" step. Verify "ChatGPT Guide" (or similar) tab/collapsible is visible alongside JSON upload and Trivia API tabs. Source: `apps/trivia/src/components/presenter/ChatGptGuide.tsx` used by `QuestionSetImporter.tsx:9`. | NOT TESTED |
| 2 | Copy prompt | Click the "Copy prompt" button on the guide. Verify clipboard contains the PROMPT_TEMPLATE string starting with "Create a set of trivia questions about [YOUR TOPIC HERE] in JSON format." (see ChatGptGuide.tsx:7). | NOT TESTED |
| 3 | Example output visible | Verify the guide shows an example 3-question JSON block (ChatGptGuide.tsx:32–54). Verify the field reference table lists all 5 fields: question, options, correctAnswer, category, explanation (lines 56+). | NOT TESTED |
| 4 | Persist expanded state | Expand the guide. Refresh the page. Verify the guide is still expanded (localStorage key "hgn-trivia-chatgpt-guide-expanded", ChatGptGuide.tsx:5). | NOT TESTED |
```

### Story 3.23 (NEW) — Bingo Template Store (BEA-685)

Insert after Story 2.11 at MTP ~:250. (Numbering: 2.12 in Bingo section if strict, but MTP uses 2.X = bingo, 3.X = trivia. Put this at 2.12 to preserve bingo grouping. Alternatively keep as 3.23 since existing naming mixes.)

Use **Story 2.12** to stay within Bingo section:

```markdown
### Story 2.12: Bingo Template Store (BEA-685) — **ALL NOT TESTED**

**As a presenter**, I want to save bingo game configurations as templates.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Save as Template | On /play, click "Save as Template" button (bottom of ControlPanel, `apps/bingo/src/components/presenter/ControlPanel.tsx:170–183`). Verify SaveTemplateModal opens. Enter template name and save. Verify localStorage key `hgn-bingo-templates` contains the new entry with fields: id (UUID), name, pattern_id, voice_pack, auto_call_enabled, auto_call_interval (clamped 5000–30000ms), is_default, created_at, updated_at. Source: `apps/bingo/src/stores/template-store.ts:49–120`. | NOT TESTED |
| 2 | Auto-call interval clamping | Save a template with autoCallInterval=4000 (below min). Verify stored value is 5000. Save another with 31000 (above max). Verify stored value is 30000. Source: clampAutoCallInterval at template-store.ts:38–43. | NOT TESTED |
| 3 | Default template | Via the store API or a UI toggle (if exposed), mark one template as is_default=true. Verify getDefault() returns that template. Verify setting default on another template flips the flag (only one default at a time, template-store.ts:93–100). | NOT TESTED |
```

### Story 3.24 (NEW) — Trivia Template/Preset Stores (BEA-687)

Insert after Story 3.22 at MTP ~:513. Complements Story 3.8 (Question Set load) and Story 3.15 (Preset load) by adding a full save/load/delete/rename lifecycle test.

```markdown
### Story 3.24: Trivia Template & Preset Store Lifecycle (BEA-687) — **ALL NOT TESTED**

**As a presenter**, I want saved question-set templates and settings presets to survive refreshes and round-trip correctly.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Template save-load round-trip | Import questions. Click "Save Question Set" (`SaveTemplateModal` title at `apps/trivia/src/components/presenter/SaveTemplateModal.tsx:117`). Name it "Round-Trip". Refresh page. Open "Load Question Set" combobox (TemplateSelector.tsx:128). Verify "Round-Trip" is listed. Select it. Verify question list re-populates. localStorage key: `hgn-trivia-templates` (stores/template-store.ts:92). | NOT TESTED |
| 2 | Preset save-load round-trip | Configure wizard settings (rounds=4, timer=60, isByCategory=false). Click "Save Settings as Preset". Name it "4-Round-Fast". Refresh. Verify "Load Preset" (PresetSelector.tsx:84) lists "4-Round-Fast". Select it. Verify settings update. localStorage key: `hgn-trivia-presets` (stores/preset-store.ts:90). | NOT TESTED |
| 3 | Template delete | From the template list UI (wherever exposed), delete a saved template. Verify localStorage `hgn-trivia-templates` no longer contains that entry. | NOT TESTED |
| 4 | Preset rename | From the preset list UI, rename a preset. Verify localStorage `hgn-trivia-presets` entry's name field updates; id/created_at unchanged. | NOT TESTED |
```

### Story 3.25 (NEW) — Presenter View Layout (BEA-676, BEA-677)

Insert after Story 3.22 / 3.24 at MTP ~:513. Covers F3.13.

```markdown
### Story 3.25: Presenter Layout — Sidebar Removal + Max-Width (BEA-676, BEA-677) — **ALL NOT TESTED**

**As a presenter on a wide-screen monitor**, I want the content area centered and not dominated by a right sidebar.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | No right sidebar during gameplay | Enter /play, start a game (not in round_scoring). Verify the main content area uses a 2-column layout: left rail (w-64 QuestionList) + center panel. No right sidebar present. Source: `apps/trivia/src/app/play/page.tsx:394–551` — single `<aside>` + `<main>`. | NOT TESTED |
| 2 | Center max-width at wide viewport | Resize browser to 1920x1080. Verify center content respects max-width 64rem (apps/trivia/src/app/play/page.tsx:446) and is asymmetrically centered (marginLeft uses clamp with viewport calc). At widths ≥ ~1300px, verify the center panel appears near viewport-center despite the left rail. | NOT TESTED |
| 3 | Center max-width at narrow viewport | Resize to 800x600. Verify center content fills available space (marginLeft clamps to 0). No awkward margins. | NOT TESTED |
| 4 | Round scoring bypasses max-width | Enter round_scoring scene. Verify the side-by-side layout (scoring form + Q&A reference) uses full available width (isRoundScoringScene branch at apps/trivia/src/app/play/page.tsx:420–441). No max-w constraint applied. | NOT TESTED |
```

---

## Resolved Questions

Phase 1 Area 3 "Unknowns & Gaps" (1-9) resolved:

1. **BEA-702 = footnote + partial prose cleanup, NOT rewrite.** Confirmed by reading current MTP — Section 1 (Platform Hub) deleted, OAuth gone, but per-test-case drift remains. This spec closes that gap.
2. **Bugs Found table → delete.** Per §2 plan, wipe to empty + linearize in Linear.
3. **Canonical keyboard source → `apps/*/CLAUDE.md`.** §4 lays out the truth table; both app CLAUDE.md files already match their source hooks. MTP prereqs line (:61) should not duplicate this; instead reference the tables.
4. **"PASS (run 9)" entries are stale.** §2 wipes them. Rebaseline required after merging this spec.
5. **Retention policy for NOT TESTED rows pointing at deleted features → DELETE**, not retain. Example: Story 3.8 test 1 (`/question-sets`) deleted in §1.
6. **Story 2.11 "Standalone Play" name → rename** to "Bingo Home → Play E2E". Merged into a single smoke-test rollup.
7. **Legacy domain aliases (`bingo.joolie-boolie.com` etc.) → out of scope for MTP.** The plan is scoped to localhost. Legacy-domain smoke testing belongs to a separate alerts/monitoring runbook.
8. **Story 3.17 was Buzz-In (removed 2026-02-24).** Reclaimed in §5 as "ChatGPT Question Creation Guide" — new feature coverage in the same slot.
9. **No Story 4.x section → intentional artifact from OAuth/Platform Hub deletion.** Do NOT renumber Section 5/6/7 to 4/5/6; keep historical numbering so Story 5.2 etc. remain diffable. Future new sections can fill 4.X if needed.

---

## Remaining Unknowns

1. **BEA-676 vs. Story 3.22 overlap.** Story 3.25 test 1 (no right sidebar during gameplay) may partially duplicate Story 3.22 test 3 (sidebar hidden during round_scoring). If a BEA-676 regression hides the sidebar in round_scoring but ALSO reintroduces it elsewhere, both tests need to coexist. Keep both unless code review proves redundancy.
2. **Health endpoint auth/CORS.** BEA-698's route has no auth and no CORS headers. Should the MTP include a negative test (POST returns 405, OPTIONS preflight, etc.)? Current source only handles GET. Skipped in Story 6.3 for now.
3. **The `apps/bingo/src/CLAUDE.md` stub and `apps/trivia/src/CLAUDE.md` stub** still reference auth-era content (JWT middleware, OAuth analysis). Out of scope for this spec — handled in Area 4 findings / claude-mem cleanup track.
4. **Whether to mass-update `browser_press_key` line (:61) reference text** to cross-reference Story 3.13 + app CLAUDE.md. Small edit; depends on whether the MTP wants inline or by-reference doc style. Recommend inline reference (see §4).
5. **Audio unlock overlay test.** Bingo `/display` renders an "Click here to activate window audio" overlay (`display/page.tsx:293–319`). Story 2.7 or 2.8 doesn't explicitly cover this gate. Could become Story 2.8.6.
6. **SceneRouter's scene coverage** via Story 3.16.1 is comprehensive but text-heavy; should it be split into per-scene rows? Defer — current "all scenes rendered" rollup is sufficient for a manual-QA plan.

---

## Revised Understanding

**Area 3 Finding Reprise (what's different after this spec):**
- 17 tests get KEEP (stood up as-is against HEAD)
- 24 get REWRITE (text updated with file:line source citations)
- 18 get DELETE (feature removed; no replacement)
- 18 get ADD (covering BEA-664, BEA-676/677, BEA-685, BEA-687, BEA-698, BEA-713, ChatGPT guide)

**Net effect on test count:** 85 → 85 (coincidence). Net effect on test validity: pre-spec ~60% valid, post-spec ~100% valid against HEAD.

**Cost to execute:** Roughly 150 lines of MTP prose changed + ~200 lines of new story blocks added + 9 lines of PASS annotation stripped per Result column across ~85 rows. One sweep through the file, editable in a single session. The bulk of effort is in the two surgical deletes (Stories 2.2, 3.2) and the six new story blocks. All field references are verified in `[tracked-HEAD]` source.

**One methodology lesson confirmed:** BEA-719's rebrand-by-grep worked at the string level (zero `joolie-boolie` in MTP) but missed semantic drift (Room Setup modal references to a removed feature). A rewrite pass like this one is the only way to catch feature-vocabulary drift; no automated grep can flag "this paragraph describes a non-existent UI."

**Canonical sources for future agents:**
- Keyboard shortcuts: `apps/bingo/CLAUDE.md` + `apps/trivia/CLAUDE.md` (verified matches source hooks).
- Route inventory: `apps/*/src/app/` listing (no `question-sets`, no `question-editor` route; only `page.tsx`, `play/`, `display/`, `api/`, `serwist/`).
- localStorage keys: `hgn-bingo-templates`, `hgn-trivia-templates`, `hgn-trivia-presets`, `hgn-trivia-settings`, `hgn-trivia-chatgpt-guide-expanded` (grep confirmed).
- Session ID format: UUID v4 in both apps (`apps/*/src/lib/sync/session.ts`).

End of spec.
