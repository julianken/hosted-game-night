# Investigation: Round Assignment Patterns

## Summary
8 code paths assign roundIndex to questions, all using `Math.floor(index / questionsPerRound)`. Assignment happens at import time (not game start). The importQuestions() engine function does NOT assign roundIndex — it reads pre-assigned values. No category-based logic exists yet.

## Key Findings

### Finding 1: All 8 Assignment Sites Use Same Formula
- **Evidence:** `Math.floor(index / questionsPerRound)` in: api-adapter.ts:203, TriviaApiImporter.tsx:179, QuestionSetSelector.tsx:83, TemplateSelector.tsx:113-116, useAutoLoadDefaultTemplate.ts:34
- **Confidence:** high
- **Implication:** Single algorithm change point — create a shared utility

### Finding 2: importQuestions() Only Reads roundIndex
- **Evidence:** `questions.ts:63-64` — `maxRoundIndex = Math.max(...newQuestions.map(q => q.roundIndex))` then `totalRounds = maxRoundIndex + 1`
- **Confidence:** high
- **Implication:** Engine doesn't care HOW roundIndex was assigned — just reads it

### Finding 3: Assignment Happens Before importQuestions()
- **Evidence:** TriviaApiImporter.handleLoadIntoGame() maps roundIndex THEN calls importQuestions()
- **Confidence:** high
- **Implication:** "By Category" logic should happen at same point — before import

### Finding 4: Batch Conversion Also Assigns Rounds
- **Evidence:** `api-adapter.ts:191-205` triviaApiQuestionsToQuestions() assigns roundIndex using questionsPerRound option
- **Confidence:** high
- **Implication:** This is used by the BFF route, but TriviaApiImporter re-assigns in handleLoadIntoGame()

### Finding 5: Sample Questions Have Hardcoded roundIndex
- **Evidence:** `sample-questions.ts` — 5 questions per round, manually assigned
- **Confidence:** high
- **Implication:** No impact — sample questions are only for initial state

## Raw Evidence
- api-adapter.ts:80-134 (single), :191-205 (batch)
- TriviaApiImporter.tsx:172-188 (handleLoadIntoGame)
- QuestionSetSelector.tsx:75-90
- TemplateSelector.tsx:110-116
- useAutoLoadDefaultTemplate.ts:33-36
- questions.ts:43-77 (importQuestions — reads only)
- conversion.ts:51-74 (single), :86-88 (batch — uses array index)
- validator.ts:239-244 (reads from input)
- sample-questions.ts (hardcoded)
