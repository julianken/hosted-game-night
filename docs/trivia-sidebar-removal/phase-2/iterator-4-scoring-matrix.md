# Iteration: Scoring UX Matrix — Scene-by-Scene Analysis

## Assignment
Map all scoring surfaces across all 16 audience scenes, with and without sidebar.

## Findings

### Two scoring definitions disagree on scope
- **Evidence:** SCORING_PHASE_SCENES (keyboard, use-game-keyboard.ts:64-72): 7 scenes including recap scenes. isScoringScene (QuickScoreGrid, page.tsx:175-179): only 3 scenes (question_closed, answer_reveal, round_summary).
- **Confidence:** Definitive
- **Significance:** 4 scenes have keyboard scoring active but no QuickScoreGrid — they show TeamScoreInput instead

### Scene gap: recap scenes have keyboard scoring but no visual quick-score
- **Evidence:** recap_qa, recap_scores, recap_title — all in SCORING_PHASE_SCENES but not in isScoringScene. Sidebar shows TeamScoreInput (±1/set) in these scenes, not QuickScoreGrid. recap_title is unreachable (dead state machine branch, scene.ts:252 returns null).
- **Confidence:** Definitive
- **Significance:** Visual quick-score feedback gap predates sidebar removal — already exists for keyboard users in recap scenes

### Scenes losing ALL mouse scoring on sidebar removal

**No keyboard fallback either:**
- waiting (playing), game_intro, round_intro, question_anticipation, question_display, paused, emergency_blank
- These are non-scoring scenes where TeamScoreInput exists for emergency corrections only

**Keyboard covers the gap (but no visual feedback):**
- question_closed, answer_reveal, round_summary — lose QuickScoreGrid clicks
- recap_qa, recap_scores — lose TeamScoreInput ±1/set

**Already sidebar-free (no change):**
- round_scoring — RoundScoringPanel in center panel, fully self-contained

### round_scoring proves sidebar-free scoring is viable
- **Evidence:** Sidebar suppressed during round_scoring (page.tsx:497). RoundScoringPanel provides complete scoring with number inputs, undo, clear, Done button. This was implemented as BEA-673.
- **Confidence:** Definitive
- **Significance:** Prior art for sidebar-free scoring already exists in the codebase

### Scoring matrix summary

| Scene category | WITH sidebar | WITHOUT sidebar |
|---|---|---|
| Scoring phases (3 scenes) | QuickScoreGrid + keyboard | Keyboard only (no visual) |
| Recap phases (2 active scenes) | TeamScoreInput + keyboard | Keyboard only (no ±1/set) |
| round_scoring | RoundScoringPanel (center) | Same — no change |
| Non-scoring phases (7 scenes) | TeamScoreInput (corrections) | Nothing |
| Ended (3 scenes) | Nothing | Nothing |

## Resolved Questions
- recap_qa/recap_scores: keyboard scoring IS active, sidebar shows TeamScoreInput (not QuickScoreGrid)
- recap_title: dead scene, unreachable through normal navigation

## Revised Understanding
Sidebar removal creates keyboard-only scoring for 5 active scenes. A replacement scoring widget in the center panel would need to cover: toggle-with-visual-feedback during question_closed/answer_reveal/round_summary, and ±1 correction during recap_qa/recap_scores. Non-scoring scenes lose emergency corrections, which are edge-case tools.
