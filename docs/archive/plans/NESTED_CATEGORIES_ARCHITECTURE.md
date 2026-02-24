# Nested Categories Architecture

## Overview

**Change:** Restructure question storage from flat array to nested categories, where **categories = rounds**.

**Decisions:**
- Categories become rounds (Round 1 = Category 1's questions, Round 2 = Category 2's questions)
- Only nested format supported (no flat array)
- No backward compatibility needed (pre-release)
- Export matches nested structure

---

## New Data Structure

### Database Layer (`TriviaQuestionSet`)

**Before (flat):**
```typescript
interface TriviaQuestionSet {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  questions: TriviaQuestion[];  // Flat array
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category?: string;  // Optional, per-question
}
```

**After (nested):**
```typescript
interface TriviaQuestionSet {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  categories: TriviaCategory[];  // Nested structure
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TriviaCategory {
  id: string;           // Category ID (e.g., 'science', 'history')
  name: string;         // Display name (e.g., 'Science & Nature')
  questions: TriviaQuestion[];
}

interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  // No category field - inherited from parent
}
```

### Import/Export JSON Format

```json
{
  "name": "Trivia Week 1",
  "description": "Questions for January trivia event",
  "categories": [
    {
      "id": "science",
      "name": "Science & Nature",
      "questions": [
        {
          "question": "What is the chemical symbol for water?",
          "options": ["H2O", "CO2", "NaCl", "O2"],
          "correctIndex": 0
        },
        {
          "question": "What planet is known as the Red Planet?",
          "options": ["Venus", "Mars", "Jupiter", "Saturn"],
          "correctIndex": 1
        }
      ]
    },
    {
      "id": "history",
      "name": "History",
      "questions": [
        {
          "question": "In what year did World War II end?",
          "options": ["1943", "1944", "1945", "1946"],
          "correctIndex": 2
        }
      ]
    },
    {
      "id": "entertainment",
      "name": "Entertainment",
      "questions": [...]
    }
  ]
}
```

### App Layer (`Question`)

**After:**
```typescript
interface Question {
  id: string;
  text: string;
  type: QuestionType;
  correctAnswers: string[];
  options: string[];
  optionTexts: string[];
  category: QuestionCategory;  // Still present - derived from parent category
  explanation?: string;
  roundIndex: number;          // Derived from category position (0, 1, 2...)
}
```

---

## Category = Round Mapping

| Category Position | Round Number | Game Behavior |
|-------------------|--------------|---------------|
| categories[0] | Round 1 | First category's questions played |
| categories[1] | Round 2 | Second category's questions played |
| categories[2] | Round 3 | Third category's questions played |
| ... | ... | ... |

**Game Flow:**
1. Load question set with N categories
2. `totalRounds = categories.length`
3. `currentRound = 0` (Round 1)
4. `getCurrentRoundQuestions()` returns `categories[currentRound].questions`
5. Category name displayed as round title: "Round 1: Science & Nature"

---

## Files to Modify

### Phase 1: Database Layer

| File | Changes |
|------|---------|
| `packages/database/src/types.ts` | Add `TriviaCategory`, update `TriviaQuestionSet` |
| `packages/database/src/tables/trivia-question-sets.ts` | Update all CRUD operations |

### Phase 2: Parser & Validator

| File | Changes |
|------|---------|
| `apps/trivia/src/lib/questions/types.ts` | Add `RawJsonCategory` type |
| `apps/trivia/src/lib/questions/parser.ts` | Parse nested structure |
| `apps/trivia/src/lib/questions/validator.ts` | Validate nested structure |

### Phase 3: Conversion

| File | Changes |
|------|---------|
| `apps/trivia/src/lib/questions/conversion.ts` | Category-aware conversion |
| `apps/trivia/src/types/index.ts` | Update app-level types if needed |

### Phase 4: API Routes

| File | Changes |
|------|---------|
| `apps/trivia/src/app/api/question-sets/route.ts` | Nested request/response |
| `apps/trivia/src/app/api/question-sets/[id]/route.ts` | Nested request/response |
| `apps/trivia/src/app/api/question-sets/import/route.ts` | Parse nested JSON |

### Phase 5: UI Components

| File | Changes |
|------|---------|
| `apps/trivia/src/components/presenter/QuestionSetImporter.tsx` | Display nested preview |
| `apps/trivia/src/components/presenter/QuestionSetSelector.tsx` | Load nested data |
| `apps/trivia/src/components/presenter/SaveQuestionSetModal.tsx` | Save nested format |
| `apps/trivia/src/app/question-sets/page.tsx` | Display/export nested |

### Phase 6: Game Engine

| File | Changes |
|------|---------|
| `apps/trivia/src/lib/game/engine.ts` | Category-based round logic |
| `apps/trivia/src/stores/game-store.ts` | Update store types |

### Phase 7: Form Editor (New Components)

| File | Changes |
|------|---------|
| `apps/trivia/src/components/question-editor/*` | All new components use nested |

---

## Conversion Functions

### Database → App (Load)

```typescript
function triviaCategoriesToQuestions(categories: TriviaCategory[]): Question[] {
  return categories.flatMap((category, roundIndex) =>
    category.questions.map((tq, questionIndex) => ({
      id: generateId(),
      text: tq.question,
      type: detectType(tq.options),
      correctAnswers: [indexToLetter(tq.correctIndex)],
      options: generateLabels(tq.options.length),
      optionTexts: tq.options,
      category: category.id as QuestionCategory,
      roundIndex,  // Derived from category position
    }))
  );
}
```

### App → Database (Save)

```typescript
function questionsToTriviaCategories(questions: Question[]): TriviaCategory[] {
  const grouped = groupBy(questions, q => q.roundIndex);

  return Object.entries(grouped).map(([roundIndex, qs]) => ({
    id: qs[0].category,  // All questions in round share category
    name: getCategoryName(qs[0].category),
    questions: qs.map(q => ({
      question: q.text,
      options: q.optionTexts,
      correctIndex: letterToIndex(q.correctAnswers[0]),
    })),
  }));
}
```

---

## Game Engine Changes

### Before

```typescript
getCurrentRoundQuestions(): Question[] {
  return state.questions.filter(q => q.roundIndex === state.currentRound);
}
```

### After

```typescript
getCurrentRoundQuestions(): Question[] {
  const category = state.categories[state.currentRound];
  return category ? category.questions : [];
}

getCurrentRoundName(): string {
  const category = state.categories[state.currentRound];
  return category ? category.name : `Round ${state.currentRound + 1}`;
}
```

---

## Import Flow

```
User uploads nested JSON
        ↓
parseNestedJson() → { name, description, categories: RawCategory[] }
        ↓
validateCategories() → TriviaCategory[] (validated)
        ↓
POST /api/question-sets with { name, description, categories }
        ↓
createTriviaQuestionSet() → Database
        ↓
Return TriviaQuestionSet with categories
```

---

## Export Flow

```
GET /api/question-sets/[id]
        ↓
Return TriviaQuestionSet with categories
        ↓
UI generates JSON blob:
{
  "name": questionSet.name,
  "description": questionSet.description,
  "categories": questionSet.categories
}
        ↓
Download as .json file
```

---

## Form Editor Integration

The form editor (BEA-456 to BEA-460) now works with categories instead of rounds:

**Before (roundIndex-based):**
```
+ Add Round → new roundIndex value
Questions grouped by roundIndex
```

**After (category-based):**
```
+ Add Category → select category type, creates new category object
Questions nested inside category
Category order = round order
```

**UI:**
```
Question Set Editor
├── Name: [___________]
├── Description: [___________]
├── Categories:
│   ├── [Science & Nature] (Round 1) - 5 questions
│   │   ├── Question 1: [___]
│   │   ├── Question 2: [___]
│   │   └── [+ Add Question]
│   ├── [History] (Round 2) - 3 questions
│   │   └── ...
│   └── [+ Add Category]
└── [Save] [Cancel]
```

---

## Migration Notes

Since this is pre-release:
1. Drop existing `trivia_question_sets` data (or manually migrate)
2. No migration scripts needed
3. Update Supabase column from `questions JSONB` to `categories JSONB`
4. Test with fresh data

---

## Validation Rules

### Category Validation
- `id`: Required, must be valid QuestionCategory
- `name`: Required, non-empty string
- `questions`: Required, at least 1 question

### Question Validation (unchanged)
- `question`: Required, non-empty string
- `options`: Required, 2-4 items for MC, exactly 2 for T/F
- `correctIndex`: Required, valid index into options

### Question Set Validation
- `name`: Required, 1-100 chars
- `categories`: Required, at least 1 category
- Each category must have at least 1 question

---

## Valid Category IDs

```typescript
type QuestionCategory =
  | 'general_knowledge'
  | 'science'
  | 'history'
  | 'geography'
  | 'entertainment'
  | 'sports'
  | 'art_literature';
```

Each category has a display name in `apps/trivia/src/lib/categories.ts`.
