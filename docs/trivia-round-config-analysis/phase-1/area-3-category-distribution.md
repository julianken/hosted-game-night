# Investigation: Category Data & Distribution

## Summary
7 internal categories with rich utility support. External API has 10 categories mapping to 7. Category data is always present on imported questions. Key edge cases: single-category fetch (1 round), no-filter fetch (up to 7 categories = 7 rounds), unequal distribution (common). Existing utilities (getUniqueCategories, getCategoryStatistics) provide everything needed for "By Category" mode.

## Key Findings

### Finding 1: Categories Always Present on Questions
- **Evidence:** Question type requires `category: QuestionCategory` (types/index.ts:132). API adapter always maps via `mapApiCategory()` (api-adapter.ts:122)
- **Confidence:** high
- **Implication:** "By Category" mode can always group — no null/missing category risk

### Finding 2: Rich Utility Library Already Exists
- **Evidence:** `categories.ts` provides: `getUniqueCategories()`, `getCategoryStatistics()`, `filterQuestionsByCategory()`, `filterQuestionsBySingleCategory()`, `getCategoryName()`, `getCategoryColor()`, `getCategoryBadgeClasses()`
- **Confidence:** high
- **Implication:** No new utility functions needed for grouping/display

### Finding 3: API Category Pool is Imbalanced
- **Evidence:** Approximate pool sizes: entertainment ~3808, general_knowledge ~2972, geography ~1797, science ~1583, history ~1300, art_literature ~1289, sports ~676
- **Confidence:** medium (based on API metadata, actual fetches vary)
- **Implication:** "Mixed" fetches will have uneven category distribution

### Finding 4: User Can Pre-Filter Categories in Step 1
- **Evidence:** TriviaApiImporter.tsx:78 — `selectedCategories` state, multi-select UI for all 7 categories
- **Confidence:** high
- **Implication:** If user selects 3 categories, "By Category" mode creates exactly 3 rounds

### Finding 5: Algorithm for "By Category" is Straightforward
- Group by category → sort groups by size (descending) → assign roundIndex sequentially per group
- **Confidence:** high
- **Implication:** Simple to implement; edge cases (1 category, 7 categories) just produce 1 or 7 rounds

## Edge Cases Analysis

| Scenario | Categories | Questions | Rounds | QPR Range |
|----------|-----------|-----------|--------|-----------|
| Single category | 1 | 20 | 1 | 20 |
| Two categories | 2 | 20 | 2 | ~10 each |
| No filter (all) | 3-7 | 20 | 3-7 | 2-8 each |
| Unequal | 3 | 20 | 3 | 3-12 |
| Max categories | 7 | 50 | 7 | 4-12 each |

## Raw Evidence
- categories.ts (full file — 7 categories, mapping, utilities)
- api-adapter.ts:100-111 (TRIVIA_API_CATEGORY_MAP)
- TriviaApiImporter.tsx:78,101-107,118-123 (category selection + API params)
- types/index.ts:85-96 (QuestionCategory type)
- app/api/trivia-api/questions/route.ts (BFF accepting categories param)
