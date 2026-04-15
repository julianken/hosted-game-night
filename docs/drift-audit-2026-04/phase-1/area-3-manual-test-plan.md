# Investigation Area 3: Manual Test Plan Drift

**Target:** `docs/MANUAL_TEST_PLAN.md` (610 lines, single file)
**HEAD:** `a7369f16` (2026-04-13)
**Prior audit:** `docs/post-standalone-audit/phase-4/analysis-report.md` Finding 2.1 (2026-04-11) recommended a **rewrite** of this file preserving ~65%.

## Summary

The Manual Test Plan has been **partially** brought in line with the standalone rebuild. The top-level framing, prerequisites, and Section 1 (Platform Hub) removal happened — prose now reads "No authentication is required — both apps are standalone and all persistence is localStorage" [MANUAL_TEST_PLAN.md:71] and a BEA-702 footnote at line 91 acknowledges that runs 1-9 included deleted systems. **However, the test cases themselves were not rewritten** — only the hub section was cut. Multiple story tables still describe removed UI: "Room Setup modal" with "Create New Game / Join with Room Code / Play Offline" options, 4-digit PINs, 6-char uppercase session IDs (they're UUIDs now), `/display?room=INVALID` URL params, a `/question-sets` route, and a Trivia home "Question Sets" link. The prior audit's rewrite recommendation largely **did not happen** — the footnote disclaim-and-preserve pattern was chosen instead.

Beyond stale content: the claimed pass-count (168 PASS / 16 NOT TESTED) doesn't match the actual table entries (≥170 **PASS**, 30+ NOT TESTED in-table), keyboard-shortcut docs for Bingo omit F and ? (which exist on the Display page), recently-shipped features (`/api/health`, ChatGPT question guide, BEA-685/687 template+preset stores, BEA-664 audio sequencing move, BEA-676/677 layout changes) have zero dedicated coverage, and the Bingo landing page "Play Now" button is documented as "Play".

## Key Findings

---

### Dead test cases

#### F3.1 — Story 2.2 "Room Setup" describes deleted multi-option modal

**Evidence:** `docs/MANUAL_TEST_PLAN.md:126-139` describes a modal with "Create New Game / Join with Room Code / Play Offline", 4-digit PIN validation (1000-9999), and uppercase room-code conversion. Verified against `apps/bingo/src/app/play/page.tsx:24-175` — there is no Room Setup modal. The page auto-instantiates a session via `generateSessionId()` at line 35 and shows a single header action "New Game" at line 163. `generateSessionId` returns a UUID v4, not a 6-char ID (`apps/bingo/src/lib/sync/session.ts:10-12`). No PIN field, no room-code input, no join-room form exists in the bingo source tree — grep `PIN|room.code|Join with Room Code` under `apps/bingo/src` returns zero matches in UI code.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high — verified against Zustand store, session helper, and play page
**Impact:** Story 2.2's 8 test cases are all exercising a UI flow that does not exist. An agent asked to "run Story 2.2" will not find the modal and may invent fixes for a nonexistent regression. Same mechanism the prior audit flagged as "poisoning the read."

#### F3.2 — Story 3.2 "Room Setup" (Trivia) is entirely stale

**Evidence:** `docs/MANUAL_TEST_PLAN.md:266-280` — 9 test cases describing a trivia Room Setup modal, PIN validation, "Create New Game Room" button, "Join Existing Game" form with room code + PIN, form cancel behavior. Verified against `apps/trivia/src/app/play/page.tsx:27-115` + `apps/trivia/src/components/presenter/SetupGate.tsx` — trivia `/play` renders a `SetupGate` with `SetupWizard`, not a room modal. SetupGate's only header actions are "Open Display" and the connection dot (`SetupGate.tsx:140-148`). There is no room-code input, no PIN input, no `/play` modal. `generateSessionId` (trivia equivalent at `apps/trivia/src/lib/sync/session.ts`) also returns UUIDs.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** All 9 test cases non-applicable. E2E fixture for trivia setup (see commit `278c8249`) drives the wizard, not a modal.

#### F3.3 — Story 2.11 still named "Standalone Play" — meaningful name, but test case 3 references pre-standalone wording

**Evidence:** `docs/MANUAL_TEST_PLAN.md:241-249`. Test case 3 says "an offline session is auto-created (6-char session ID visible). | **PASS** — Session PPBZ5K auto-created, no redirect (run 7)". Current session IDs are UUID v4 (`apps/bingo/src/lib/sync/session.ts:4` regex confirms). A "6-char session ID" is not visible in the current UI — the UUID isn't rendered to the user at all in the bingo play header.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** Tester following test case 3 will not find a 6-char ID and may file a false-positive bug. Run 7 pass data (`Session PPBZ5K`) is from a pre-standalone build.

#### F3.4 — Story 2.8 test 5 "Invalid session" URL format is wrong

**Evidence:** `docs/MANUAL_TEST_PLAN.md:214` — "Navigate to `localhost:3000/display?room=INVALID`". Verified against `apps/bingo/src/app/display/page.tsx:93-99`: the display page reads `searchParams.get('session')`, not `room`. The URL `?room=INVALID` will trigger `InvalidSessionError` (line 32-64) but only because `session` is missing — the message would appear regardless of the `room=` query. The test is accidentally passing for the wrong reason.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** A tester copying this URL doesn't exercise "invalid session" — they exercise "no session param" which follows a different code path. Should be `?session=INVALID` or `?session=not-a-uuid`.

#### F3.5 — Story 3.1 test 1 claims a "Question Sets" link on Trivia home

**Evidence:** `docs/MANUAL_TEST_PLAN.md:261` — "Verify 'Play' and 'Question Sets' links exist. | **PASS** — 'Trivia' branding, 'Play' and 'Question Sets' buttons visible (run 7)". Verified against `apps/trivia/src/app/page.tsx:1-26`: the home page has exactly one CTA — `<Link href="/play">Play</Link>`. No Question Sets link, no secondary nav. Grep `question-sets|Question Sets` under `apps/trivia/src` returns no UI hits — only prose in `apps/trivia/README.md:14,61` (stale README, separate issue).

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** Test case 1's claim "Play and Question Sets buttons visible" will always fail at HEAD. The pre-standalone trivia home had two CTAs; current one has one.

#### F3.6 — Story 3.8 test 1 navigates to deleted `/question-sets` route

**Evidence:** `docs/MANUAL_TEST_PLAN.md:350` — "Navigate to `localhost:3001/question-sets`. Verify the page loads. | NOT TESTED". Verified: `ls apps/trivia/src/app/` shows no `question-sets` directory; `Glob apps/trivia/src/app/**/page.tsx` returns only `page.tsx`, `play/page.tsx`, `display/page.tsx`. The route was removed via PR #517. Test case 1 is dead but marked NOT TESTED, not REMOVED.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** Points a manual tester at a route that 404s. NOT TESTED makes it look like a coverage gap to close; actually it's a dead requirement to delete.

#### F3.7 — Story 2.1 test 1 describes wrong CTA text on Bingo home

**Evidence:** `docs/MANUAL_TEST_PLAN.md:120` — "Verify 'Play' button exists." Verified against `apps/bingo/src/app/page.tsx:30-46` — the button text is `Play Now` (line 44). A tester running a strict accessibility-name assertion for "Play" will miss. (Story 2.11 test 1 at :243 repeats the same drift.)

**Provenance:** `[tracked-HEAD]`
**Confidence:** medium — rendered text is "Play Now" but aria-label isn't set explicitly, so loose matching may still succeed
**Impact:** Low severity, fixed by relaxing expectation to "Play Now".

---

### Coverage gaps (features shipped, no test coverage)

#### F3.8 — `/api/health` endpoint has zero test coverage in the plan

**Evidence:** `apps/bingo/src/app/api/health/route.ts` + `apps/trivia/src/app/api/health/route.ts` (tracked) exist and their doc-comment references "docs/ALERTING_SETUP.md and the E2E baseline health spec" (both files, line 5-7). Added in commit `7489d1c5` / `31856c8e` (BEA-698, 2026-04-11 — after run 9). `docs/MANUAL_TEST_PLAN.md` has zero mentions of `/api/health`, `api/health`, or `health` in the context of a new endpoint. Security-headers test cases (Story 2.1 #4 at :123, Story 3.1 #4 at :264) don't cover health.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** A net-new public API surface shipped after run 9 has no Playwright MCP story. If a future change breaks the content-type or shape, manual QA wouldn't catch it.

#### F3.9 — BEA-713 SetupGate derived-settings fix has no test case

**Evidence:** Commit `3c06ee28` + `7d4fc464` (2026-04-12 and 2026-04-13 per `git log`) fixed a bug where SetupGate was mutating persisted settings on mount. `apps/trivia/src/components/presenter/SetupGate.tsx:37-80` contains extensive commentary on the effective-vs-user settings model. The test plan's Story 3.11 Settings Panel (`MANUAL_TEST_PLAN.md:380-392`) predates BEA-713 and doesn't cover the "importing questions with ≤4 categories triggers by-category downgrade" flow, the "user rounds count clamps to category count" behavior, or the "settings reversal when categories expand" flow — all key BEA-713 semantics.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** The highest-risk UX path in trivia setup is uncovered in manual QA.

#### F3.10 — Trivia ChatGPT question creation guide has no story

**Evidence:** `apps/trivia/src/components/presenter/ChatGptGuide.tsx` + `__tests__/ChatGptGuide.test.tsx` exist (commit `da27b9d4`). Grep of `docs/MANUAL_TEST_PLAN.md` for "ChatGPT" or "creation guide" returns zero. Story 3.7 Question Import (:332-342) covers CSV/JSON but not the ChatGPT copy-prompt flow.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** A user-facing tab in the importer has no manual verification path.

#### F3.11 — BEA-685/687 template and preset localStorage stores undertested

**Evidence:** `apps/bingo/src/stores/template-store.ts` (key `hgn-bingo-templates`, line 107) and `apps/trivia/src/stores/` contain `useBingoTemplateStore` / `useTriviaTemplateStore` / `useTriviaPresetStore` / `useTriviaQuestionSetStore`. Story 3.8 (:344-353) has 2 PASS / 2 NOT TESTED for question sets; Story 3.15 (:427-435) has 2 PASS / 1 NOT TESTED for presets. Bingo has **no** template story at all — the `Save as Template` button (`apps/bingo/src/components/presenter/ControlPanel.tsx:182`) appears only incidentally at `MANUAL_TEST_PLAN.md:536` as a Tab-focus-order entry. No full save-load-delete-rename flow covered for any of the 4 stores.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** Cross-session localStorage persistence is the entire value prop of this feature family; "save + load" is uncovered.

#### F3.12 — BEA-664 audio-playback move to display not covered in Story 2.6

**Evidence:** Commit `fcaab963` (BEA-664) moved sound playback from presenter to display. The presenter page shows `Audio: {displayAudioActive ? 'Display' : 'Presenter'}` indicator (`apps/bingo/src/app/play/page.tsx:144-147`) and uses `broadcastPlayBallSequence` + `waitForReveal` + `waitForComplete` as a 3-message cross-window audio sequence (:38-44). Story 2.6 (:180-189) Audio System has 4 test cases — none verify the display-plays-sound routing, the "Audio: Display" indicator, or the reveal/complete ack handshake. The MEMORY.md even notes wasted hours during the BEA-664 fix.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** The signature audio change in the last 30 days has no manual regression test.

#### F3.13 — BEA-676 sidebar removal & BEA-677 max-width constraints undocumented

**Evidence:** Commits `ad3d61b1` (BEA-676 "remove right sidebar") and `c848503a` (BEA-677 "add center panel max-width constraints") changed trivia presenter layout. Story 3.22 Round Scoring Layout (:501-512) mentions "sidebar hidden during round_scoring" (:509) but was written before the BEA-676 full removal. No test covers the general presenter layout (sidebar expected state outside round_scoring). No test verifies max-width visually at tablet/desktop breakpoints despite Story 7.2 (:582-584).

**Provenance:** `[tracked-HEAD]`
**Confidence:** medium — Story 3.22 touches adjacent concerns but doesn't test BEA-676/677 outcomes directly
**Impact:** Layout regressions could pass CI and manual QA.

#### F3.14 — E2E selector drift fixes (BEA-704/706) imply UI changed; MTP not cross-checked

**Evidence:** Commits `8a926562` (BEA-704 display + dual-screen selector updates) and `ea59cddf` / `f0c64d4b` (BEA-706 bingo presenter selector drift) landed 2026-04-12. No Playwright MCP selectors are spelled out in MTP but many test-case assertions depend on visible text ("Roll [Space]", "Open Display", "Waiting for presenter...", status badge strings like "Paused"). Run 9 (:89) claims all these pass at 2026-03-02 — before the post-rebrand selector changes. The test plan was not re-verified after BEA-704/706.

**Provenance:** `[tracked-HEAD]` — commit log
**Confidence:** high
**Impact:** "Run 9" column entries may reflect pre-rebrand accessibility names that are now different. The plan likely has silent false positives.

---

### Internal inconsistencies

#### F3.15 — Status count doesn't match table entries

**Evidence:** `docs/MANUAL_TEST_PLAN.md:20` claims "168 PASS, 0 BUGS, 16 NOT TESTED". Grep counts: **PASS** bolded entries = 170 in current tables (plus ~17 more in history rows). Literal `NOT TESTED` string = 37 occurrences, at least 30 of which are in test-case rows (excluding history text like "55 NOT TESTED"). Even without exact classification, the claimed counts are provably wrong.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high — ripgrep output reproducible
**Impact:** The header "Current status" tagline is a self-contradiction. If CI or an agent tries to parse this, they get inconsistent signals.

#### F3.16 — Execution history dates are stale (all 2026-02-14 / 02-16 / 02-17 / 02-24 / 03-02)

**Evidence:** `docs/MANUAL_TEST_PLAN.md:79-89` — latest entry is "2026-03-02 (run 9)". HEAD is 2026-04-13, so ~6 weeks stale. Since run 9 the following shipped: BEA-697 through BEA-719 (rebrand, auth removal, template stores, /api/health, SetupGate refactor, E2E selector drift fixes). The BEA-702 footnote at :91 handles the top-level framing but doesn't cover runs 7-9 per-test-case staleness.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** "PASS (run 9)" annotations imply current validity but refer to a pre-rebrand, pre-auth-removal build.

#### F3.17 — Bingo keyboard shortcut list omits F (fullscreen) and ? (help) — but they exist

**Evidence:** `docs/MANUAL_TEST_PLAN.md:61` lists "Space, P, R, U, M, D, E, ?, arrows" as "Key Playwright MCP tools" shortcuts — D isn't a bingo shortcut at all (it's trivia). `apps/bingo/src/hooks/use-game.ts:354-379` binds Space/P/R/U/M only for the `/play` page. `apps/bingo/src/app/display/page.tsx:269-281` binds `?` (help modal) and `KeyF` (fullscreen) but only on `/display`. The modal defaults in `apps/bingo/src/components/ui/KeyboardShortcutsModal.tsx:11-19` list Space, P, R, U, M, F, ?. Story 2.3 #8 claims "keyboard shortcuts reference is visible ... lists Space, P, R, U, M shortcuts" (:154) — short list missing F, ?. Story 2.8 #2 (:211) correctly notes F toggles fullscreen on display only.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** The inventory of key bindings in the prereqs is wrong. `D` does not belong, and the "Space, P, R, U, M" summary in Story 2.3 is incomplete (misses F, ?).

#### F3.18 — Trivia keyboard shortcuts list in MTP prereqs is missing keys present in source

**Evidence:** `docs/MANUAL_TEST_PLAN.md:61` again: "Space, P, R, U, M, D, E, ?, arrows". Actual trivia bindings (`apps/trivia/src/hooks/use-game-keyboard.ts:160-305`): Arrow Up/Down/Left/Right, Space, P (peek), E (emergency), R (reset), N (next round), M (mute), T (timer/scoreboard), S (close question), Enter (skip), F (fullscreen), 1-9/0 (quick score), Shift+1-9 (negative score), Ctrl/Cmd+Z (undo), Slash with shift (help). The Modal defaults at `apps/trivia/src/components/ui/KeyboardShortcutsModal.tsx:11-24` list 12 bindings. The MTP prereq line misses N, T, S, Enter, F, digit-scoring, Ctrl/Cmd+Z entirely.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** Anyone writing new trivia scenarios based on this line will under-test. Also: Story 3.13 (:405-416) only lists 7 test cases, skipping T/N/S/Enter/digit-scoring/undo — a sub-inventory of bindings gets partial coverage.

#### F3.19 — Story 3.13 numbering has a gap: tests 1-4 then 6-7 (no #5)

**Evidence:** `docs/MANUAL_TEST_PLAN.md:410-416`. After test #4 "Emergency blank (E)" the next row is "| 6 | Reset (R)". No row #5. Suggests an entry was deleted (likely "Buzz-in (B)" per 2026-02-24 note at :88 "Removed Story 3.17 (Buzz-In)") but #5 slot wasn't renumbered.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** Small cosmetic inconsistency, but signals the file hasn't been fully rewritten.

#### F3.20 — Bugs-Found table lists only BEA-503 and BEA-504, both fixed

**Evidence:** `docs/MANUAL_TEST_PLAN.md:93-98` — two entries, both closed. "Current status: 0 BUGS" (:20) is consistent. BUT: no bugs found in any run since 2026-02-14 — either bugs have been filed to Linear directly and not mirrored here, or 9 runs have produced literally zero issues. Given the feature churn since run 9 (BEA-697-719), zero bugs strains credibility. Plan has no explicit "file Linear, don't update this table" guidance beyond :18 "file a Linear issue".

**Provenance:** `[tracked-HEAD]`
**Confidence:** medium — can't confirm without Linear audit
**Impact:** The bugs table may be decorative; a reader expects it to reflect reality.

#### F3.21 — "Skip to game controls" skip link documented but removed by BEA-673

**Evidence:** `docs/MANUAL_TEST_PLAN.md:537` (Tab-order assertion for trivia): "Focus order: Skip to main → **Skip to game controls** → Open Display …" And :511 Story 3.22 test 5: "Skip link removed | **PASS** — No `#game-controls` anchor in DOM (co-deleted per BEA-673)." These contradict each other. If the skip link was removed, the Tab-order at :537 referencing it is wrong.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high — verified no `game-controls` anchor via `Grep "Skip to game controls|game-controls" apps/trivia/src` → no matches
**Impact:** Tab-navigation story appears to rely on an element that no longer exists.

---

### Brand drift

#### F3.22 — Title line uses "Hosted Game Night" — consistent and up-to-date

**Evidence:** `docs/MANUAL_TEST_PLAN.md:1` — `# Manual Test Plan — Hosted Game Night`. No `joolie-boolie`, `Joolie Boolie`, `@joolie-boolie`, `beak-gaming`, or `Beak Gaming` anywhere in the file (grep returns zero matches). The rebrand landed here via BEA-719 (commit `45a84e89`).

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** No action needed — this is the bright spot. File is brand-clean.

---

### Navigation drift

#### F3.23 — URLs `localhost:3000` / `localhost:3001` correct but worktree ADR link intact

**Evidence:** `docs/MANUAL_TEST_PLAN.md:34-39`. Ports match `apps/bingo` (3000) and `apps/trivia` (3001) defaults. Worktree hash-offset reference at :39 links `[ADR-001](adr/ADR-001-e2e-hash-port-isolation.md)` — file exists at `docs/adr/ADR-001-e2e-hash-port-isolation.md` (confirmed via `ls docs/adr/`).

**Provenance:** `[tracked-HEAD]`
**Confidence:** high
**Impact:** No drift.

#### F3.24 — `/play` and `/display` route references correct

**Evidence:** Glob `apps/*/src/app/**/page.tsx` returns exactly `page.tsx`, `play/page.tsx`, `display/page.tsx` per app. No drift vs MTP's URL assertions.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high

#### F3.25 — `localhost:3000/question-sets` in Story 3.8 #1 → 404

**Evidence:** Already covered in F3.6 — the question-sets route was deleted. The URL in the test would 404 since there's no app/question-sets/page.tsx.

**Provenance:** `[tracked-HEAD]`
**Confidence:** high

---

## Prior Audit Status Check

The 2026-04-11 `post-standalone-audit/phase-4/analysis-report.md` Finding 2.1 (lines 157-164) recommended a **rewrite** of MANUAL_TEST_PLAN preserving ~65%, specifically citing stale content in "Section 1 (lines 119–189) and Section 4 (lines 603–644)" describing Platform Hub at `localhost:3002` and OAuth/SSO flows.

**What did land since 2026-04-11:**
- A BEA-702 footnote at `MANUAL_TEST_PLAN.md:91` disclaims prior runs' coverage of Platform Hub, OAuth SSO, and template-aggregation stories.
- Top-level prereqs cleaned up: line 71 says "No authentication is required — both apps are standalone and all persistence is localStorage."
- Title rebranded to "Hosted Game Night" (BEA-719).
- Platform Hub sections removed (`localhost:3002` references → zero).
- OAuth/SSO stories → zero grep hits for "OAuth" in the file.

**What did NOT land (prior recommendation unfulfilled):**
- **The rewrite itself.** Instead of rewriting the ~65% that's valid and dropping what isn't, the maintainer appended a footnote and kept the rest of the prose verbatim. So Stories 2.2 (Room Setup), 3.2 (Trivia Room Setup), Story 3.8 question-sets route, and all PIN/room-code/6-char-session-ID assertions **remain** in the plan as "documented features" even though they refer to deleted UI. The prior audit's `Finding 2.1 → recommended rewrite` is approximately 30-40% done.
- Execution history dates not refreshed after run 9 (2026-03-02).
- Status counts not recomputed after re-counting table entries.
- Bugs Found and Fixed table not updated (still just BEA-503/504 from 2026-02).
- Keyboard-shortcut prereqs line (`:61`) not fact-checked against current bindings.
- Coverage for post-run-9 features (/api/health, SetupGate derive fix, ChatGPT guide, template/preset stores, BEA-664 audio move, BEA-676/677 layout) not added.

Bottom line: the prior audit's top-line narrative fix (deleted sections) happened, but the per-test-case drift — which the prior iterator 3 described as "~35% of content" — was not addressed.

## Surprises

1. **Brand rebrand is 100% complete in this file.** No residual `joolie-boolie` / `Joolie Boolie` / `beak-gaming` anywhere. BEA-719 caught it all here.
2. **The footnote pattern at :91 vs rewrite.** Rather than rewrite the stale tables, the maintainer added a single disclaimer footnote. That works for Section 1 / former Section 4 (deleted wholesale), but it does **not** address the pre-standalone vocabulary leaking into Stories 2.2, 2.11, 3.1, 3.2, 3.8 whose tests still exist in the 2-app scope.
3. **BEA-698 `/api/health` endpoint** is one of the few net-new features in the last 30 days and has exactly zero manual-QA coverage. This is a simple 20-line route; a single "Story 6.3" could be added in minutes.
4. **Run 9 (2026-03-02) claims 168 PASS but grepping the current file returns 170 PASS bolded entries** — meaning 2 test cases were added or rewritten after run 9 but no new execution row was added to the history table.
5. **Story 3.13's test #5 is missing** — numbered 1, 2, 3, 4, 6, 7 — a byproduct of "Removed Story 3.17 (Buzz-In)" note at :88 that wasn't followed by renumbering.
6. **"Skip to game controls" tab-order assertion at :537 contradicts BEA-673 removal at :511** — both pass, internally inconsistent.

## Unknowns & Gaps (for Phase 2)

1. **Is BEA-702 actually the prior audit's "rewrite" deliverable, or was only the footnote added?** Commit `913e5e61` (docs: post-standalone cleanup sprint BEA-702) should be diffed against the pre-BEA-702 MTP to quantify what was actually removed vs. footnoted.
2. **Should the Bugs Found table be deleted?** It has two rows, both from 2026-02, both closed. If Linear is the source of truth (per CLAUDE.md), this table is redundant.
3. **What is the canonical source for which keyboard shortcuts each app binds?** MTP :61 claims one set, Bingo KeyboardShortcutsModal defaults claim another, `apps/bingo/CLAUDE.md` claims yet another (Space/P/R/U/M only, no F/?), and `use-game.ts` binds yet another subset. Phase 2 should pick a canonical and verify all documentation lines up.
4. **Do any of the "PASS — run 9" entries still pass?** Specifically the Story 3.9 dual-screen tests and Story 5.1 #5 (display readability) — both depend on UI strings that may have changed with BEA-704/706 selector drift.
5. **Is there a policy on retaining "NOT TESTED" rows after features are removed?** Story 3.8 test 1 (`/question-sets` route) is NOT TESTED but the route is deleted; the row should be REMOVED or flagged dead, not left in "coverage gap" limbo.
6. **Should Story 2.11 ("Standalone Play") be merged into Story 2.1/2.3?** Post-standalone, every bingo session is standalone — there's no non-standalone alternative to contrast with. A standalone story name is redundant.
7. **Does the plan need to cover `bingo.joolie-boolie.com` / `trivia.joolie-boolie.com` legacy domain aliases** (still live per MEMORY.md)? Or is the plan scoped only to localhost?
8. **What happened to Story 3.17?** :88 says "Removed Story 3.17 (Buzz-In)". There's no Story 3.17 in the file today. Fine — but this is a buried change-log entry that should probably migrate to the BEA-702 footnote or a changelog section.
9. **No Story 4.x section exists.** Sections numbered 1 (Bingo), 2 (Trivia), 3 (A11y), 4 (PWA), 5 (Responsive). But story-numbers inside use `2.X` for Bingo, `3.X` for Trivia, `5.X` for A11y, `6.X` for PWA, `7.X` for Responsive. There's no `4.X` — historical artifact from deleted Section 4 (OAuth/Platform Hub). Consider renumbering.

## Raw Evidence

### Commands run
```
wc -l docs/MANUAL_TEST_PLAN.md                              # 610 lines
ls apps/bingo/src/app                                        # no question-sets dir
ls apps/trivia/src/app                                       # no question-sets dir
git log --grep="BEA-702|BEA-713|BEA-698|BEA-664|BEA-676|BEA-677|BEA-685|BEA-687|BEA-704|BEA-706|BEA-719" --oneline
grep -c "PASS" docs/MANUAL_TEST_PLAN.md                      # 218 (includes history text)
grep -c "NOT TESTED" docs/MANUAL_TEST_PLAN.md                # 37
grep -c "\*\*PASS\*\*" docs/MANUAL_TEST_PLAN.md              # 170
grep "joolie-boolie\|Joolie Boolie" docs/MANUAL_TEST_PLAN.md # no matches
```

### Source cross-references
- `apps/bingo/src/app/page.tsx:44` — CTA text is "Play Now", not "Play"
- `apps/bingo/src/app/play/page.tsx:35,163` — auto-created session, single "New Game" button, no Room Setup modal
- `apps/bingo/src/app/display/page.tsx:95,269-281` — reads `?session=`, binds `?` + `KeyF` only
- `apps/bingo/src/hooks/use-game.ts:354-379` — bindings: Space/P/R/U/M (no F, no ?)
- `apps/bingo/src/lib/sync/session.ts:10-12` — UUID v4 generator
- `apps/bingo/src/components/ui/KeyboardShortcutsModal.tsx:11-19` — modal defaults include F and ?
- `apps/bingo/src/components/presenter/ControlPanel.tsx:169-182` — `Save as Template` button
- `apps/bingo/src/stores/template-store.ts:107` — localStorage key `hgn-bingo-templates`
- `apps/trivia/src/app/page.tsx:14-20` — only one CTA ("Play")
- `apps/trivia/src/app/play/page.tsx:25` — imports SetupGate; no room modal
- `apps/trivia/src/components/presenter/SetupGate.tsx:116-175` — full setup UI; no room-code/PIN
- `apps/trivia/src/components/ui/KeyboardShortcutsModal.tsx:11-24` — 12 bindings listed
- `apps/trivia/src/hooks/use-game-keyboard.ts:160-305` — ArrowLeft/Right/Space/P/E/R/N/M/T/S/Enter/F/digit/Shift+digit/Ctrl-Z/Shift+Slash
- `apps/trivia/src/components/presenter/ChatGptGuide.tsx` — new component, no MTP story
- `apps/*/src/app/api/health/route.ts` — new endpoint, no MTP story
- `apps/trivia/src/stores/settings-store.ts:61-64` — ranges `roundsCount 1-6`, `questionsPerRound 3-10`, `timerDuration 10-120` (match MTP Story 3.11)
- `packages/game-stats/src/index.ts:4` — `GameStatus = 'idle' | 'playing' | 'paused' | 'ended'` (no `setup` at base; trivia has `setup`/`between_rounds` via its own store)

### Commits relevant to MTP staleness
- `45a84e89` — BEA-719 rebrand docs (caught "Hosted Game Night" in MTP title)
- `913e5e61` — BEA-702 post-standalone cleanup sprint (added footnote at MTP :91)
- `31856c8e` — BEA-698 /api/health (uncovered)
- `3c06ee28` / `7d4fc464` — BEA-713 SetupGate derived settings (uncovered)
- `fcaab963` — BEA-664 move audio to display (uncovered)
- `c848503a` — BEA-677 center panel max-width (uncovered)
- `ad3d61b1` — BEA-676 remove right sidebar (partial Story 3.22 coverage)
- `5de2da12` — BEA-687 trivia template/preset/question-set stores (undercoverage)
- `fb183574` — BEA-685 bingo template store (no dedicated story)
- `381fb156` + `f0c64d4b` — BEA-704/706 E2E selector drift (MTP not re-verified)
- `da27b9d4` — ChatGPT question guide (uncovered)
