# Trivia: Question Import UI — Contrast & Paradox of Choice

## Summary

The question import flow has three equally-weighted methods with no default, poor contrast on selected category buttons, and no guidance for new users. The result is a "paradox of choice" that may cause users to abandon the flow.

## Three Import Methods (All Equal, No Default)

| Method | Component | File |
|--------|-----------|------|
| API Import (OpenTDB) | `TriviaApiImporter.tsx` | `apps/trivia/src/components/presenter/TriviaApiImporter.tsx` |
| File/JSON Upload | `QuestionSetImporter.tsx` | `apps/trivia/src/components/presenter/QuestionSetImporter.tsx` |
| Manual Creation | `QuestionSetEditorModal.tsx` | `apps/trivia/src/components/presenter/QuestionSetEditorModal.tsx` |

All three are hidden by default on the `/question-sets` page — there's no guidance text explaining which to use or which is recommended.

## Issue 1: WCAG Contrast Violation on Selected Categories

### Root Cause

Selected category buttons use `-500` Tailwind colors with white text. In dark mode, many of these fail WCAG AA contrast.

**Location:** `apps/trivia/src/lib/categories.ts`, lines 209-217 — `getCategoryFilterActiveClasses()`

Examples of failing combinations:
- `bg-green-500 text-white` — fails AA in dark mode
- `bg-yellow-500 text-white` — fails AA
- `bg-amber-500 text-white` — borderline

### No Visual Selection Indicator

When a category is selected, the **only** change is the background color. There's no checkmark, icon, border highlight, or other affordance. This makes the selection state ambiguous, especially with the low-contrast colors.

### Count Badge Readability

In `CategoryFilter`, the count badge uses `bg-white/20` on a colored background — hard to read when the category is selected.

**Location:** `apps/trivia/src/components/presenter/CategoryFilter.tsx`

## Issue 2: No Default Flow / Paradox of Choice

The `/question-sets` page presents all three import options without hierarchy:
- No "recommended" or "quick start" path
- API import is the most common use case but isn't surfaced as the default
- New users have to understand all three options before making a choice

**Location:** `apps/trivia/src/app/question-sets/page.tsx`

## Suggested Fixes

### Phase 1 — Fix Contrast (Critical, Accessibility)

1. In `getCategoryFilterActiveClasses()` (`lib/categories.ts` lines 209-217):
   - Change `-500` → `-700` (or darker) for backgrounds
   - Or use dark text on light category backgrounds
2. Add a checkmark icon or border indicator to selected categories
3. Fix count badge: use solid background instead of `bg-white/20`

### Phase 2 — Fix Default Flow (Important, UX)

1. Auto-show the API importer as the default/expanded method
2. Add a "Quick Start" or explanation blurb: "Import questions from our free trivia database, or create your own"
3. Reorder buttons: API first, then Upload, then Manual
4. Consider a stepped wizard: "Step 1: Choose your source" with API pre-selected

### Phase 3 — Polish

1. Add "Select All / Deselect All" button for categories
2. Improve button labels with sub-text explaining each method
3. Add category help text: "Select categories to filter questions"
4. Show question count preview before import

## Key Files

| File | What to change |
|------|---------------|
| `apps/trivia/src/lib/categories.ts` | Fix color contrast in `getCategoryFilterActiveClasses()` |
| `apps/trivia/src/components/presenter/TriviaApiImporter.tsx` | Add selection indicators, improve labels |
| `apps/trivia/src/components/presenter/CategoryFilter.tsx` | Add checkmarks, fix count badge, add help text |
| `apps/trivia/src/app/question-sets/page.tsx` | Set API importer as default, add guidance text |
