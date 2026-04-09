# Trivia Question Import UX Redesign

## Current Page Structure and Entry Points

### Navigation to /question-sets

There are two ways users reach the question-sets page:

1. **Home page** (`apps/trivia/src/app/page.tsx`, line 33): A secondary button labeled "Question Sets" links to `/question-sets`. This is an equal-weight sibling to the "Play" button.

2. **Back from /play**: No direct link exists from the play page back to `/question-sets`. The SetupGate overlay contains a `SetupWizard` which embeds its own question management inline (via `WizardStepQuestions`), but does not link to the standalone page.

### Current Page Layout (`apps/trivia/src/app/question-sets/page.tsx`)

The page has a flat structure with everything at the same level:

```
+---------------------------------------------------------------+
| HEADER: "My Question Sets"                                    |
| [Create Question Set] [Import Questions] [Fetch from API] [Back] |
+---------------------------------------------------------------+
|                                                               |
| (conditionally shown -- only when toggled)                    |
| +-----------------------------------------------------------+ |
| | QuestionSetImporter (file upload / JSON paste)             | |
| +-----------------------------------------------------------+ |
|                                                               |
| (conditionally shown -- only when toggled)                    |
| +-----------------------------------------------------------+ |
| | TriviaApiImporter (category/difficulty/count form)         | |
| +-----------------------------------------------------------+ |
|                                                               |
| EMPTY STATE: "No question sets yet. Import your first set    |
|  above."                                                      |
|       -- or --                                                |
| GRID: 2-column card grid of existing question sets            |
+---------------------------------------------------------------+
| (modal) QuestionSetEditorModal (manual creation/editing)      |
+---------------------------------------------------------------+
```

### Button Bar (lines 154-188)

Four buttons sit in a horizontal row. All use identical styling (`bg-primary text-primary-foreground`):

| Button | Action | Visual Weight |
|--------|--------|---------------|
| "Create Question Set" | Opens modal editor | Primary (same as others) |
| "Import Questions" / "Hide Importer" | Toggles file importer panel | Primary (same as others) |
| "Fetch from Trivia API" / "Hide API Importer" | Toggles API importer panel | Primary (same as others) |
| "Back to Home" | Navigation link | Muted (only differentiated button) |

The three action buttons are visually identical and functionally exclusive -- toggling one hides the other (lines 164-167, 174-177) -- but there is no visual indication of which is active or recommended.

### Context: The SetupWizard Also Has Import

In the `/play` route, the `SetupGate` > `SetupWizard` > `WizardStepQuestions` component (`apps/trivia/src/components/presenter/WizardStepQuestions.tsx`) provides its own question import flow with:
- CSV/JSON file import (always visible)
- Question set selector dropdown (always visible)
- Trivia API importer (collapsed by default behind a toggle, line 67-84)

This means the API importer is ALSO secondary/hidden in the play-flow wizard. Users encounter a consistently demoted API import experience across both entry points.

---

## Problems Identified

### Problem 1: Three Equal-Weight Buttons With No Default (Critical UX)

**File:** `apps/trivia/src/app/question-sets/page.tsx`, lines 154-188

All three import methods are presented as identical `bg-primary` buttons in a horizontal row. There is:
- No visual hierarchy (all same color, size, font weight)
- No recommended label or default selection
- No description text explaining what each does
- Mutual exclusion is handled silently (toggling one hides the other)

A first-time user sees three equally prominent buttons and must understand what "Import Questions" vs. "Fetch from Trivia API" vs. "Create Question Set" means before they can proceed. This is the classic paradox of choice.

### Problem 2: Empty State Provides No Actionable Guidance (Critical UX)

**File:** `apps/trivia/src/app/question-sets/page.tsx`, lines 230-239

The empty state shows a faded "?" character and the text: "No question sets yet. Import your first set above." This is:
- Vague ("above" refers to buttons that are all collapsed)
- Not actionable (no inline CTA, just directions to look elsewhere)
- Missing any explanation of the fastest path

### Problem 3: API Importer Requires Game Setup State (Confusing Constraint)

**File:** `apps/trivia/src/components/presenter/TriviaApiImporter.tsx`, lines 234-237, 247-250

The `TriviaApiImporter` checks `isGameSetup` and shows a warning "API question fetching is only available during game setup" when the game is not in setup status. However, when used from the `/question-sets` page (which is a standalone management page, not inside the game), the game store defaults to `setup` status. The constraint is confusing because:
- On `/question-sets`, it always works (game store initializes to setup)
- The warning text references "game setup" which is irrelevant on a management page
- The "Load into Game" button in preview is disabled when not in setup, but "Save to My Question Sets" always works

This dual-purpose component tries to serve both the play-flow (where game state matters) and the management page (where it does not), creating confusing messaging.

### Problem 4: Button Labels Are Toggle States, Not Actions (Minor UX)

**File:** `apps/trivia/src/app/question-sets/page.tsx`, lines 170, 180

Buttons toggle between "Import Questions" / "Hide Importer" and "Fetch from Trivia API" / "Hide API Importer". Using the button label as a state indicator means:
- The button's purpose changes after click
- Users must re-read to understand what the button now does
- There is no persistent visual indicator of which panel is open

### Problem 5: No Visual Relationship Between Import Methods (Information Architecture)

The three methods are not presented as alternatives to each other. They are independent toggle panels that happen to occupy the same space. There is no:
- Shared section title ("Add Questions" or "Get Questions")
- Tab or accordion grouping
- "or" connectors between methods
- Description of when to use each

---

## Proposed Redesign

### Design Philosophy

The redesign centers on one insight: **most users want to play trivia quickly, and the API import is the fastest path from zero to a full question set**. The page should guide users toward this path while keeping alternatives accessible.

### Layout: Two Distinct Page States

The page should behave differently based on whether the user has question sets or not.

---

### State A: Empty State (No Question Sets)

This is the first-time experience. The entire page is a guided onboarding flow.

```
+---------------------------------------------------------------+
| HEADER BAR                                                    |
| "Question Sets"                             [Back to Home]    |
+---------------------------------------------------------------+
|                                                               |
|  Get Started with Trivia Questions                            |
|  The fastest way to get playing is to fetch questions          |
|  from our free trivia database.                               |
|                                                               |
|  +=========================================================+  |
|  |  [PRIMARY CARD -- Full Width, Prominent]                 |  |
|  |                                                          |  |
|  |  Fetch from Trivia Database              RECOMMENDED     |  |
|  |  Get questions instantly from thousands of trivia         |  |
|  |  questions across 7 categories. No account needed.        |  |
|  |                                                          |  |
|  |  [--- Inline TriviaApiImporter form ---]                 |  |
|  |  (Categories, difficulty, count, fetch button)           |  |
|  |                                                          |  |
|  +=========================================================+  |
|                                                               |
|  Other ways to add questions                                  |
|  +---------------------------+  +---------------------------+  |
|  | Upload a File             |  | Create Manually           |  |
|  | Import from a JSON file   |  | Write your own questions  |  |
|  | you already have.         |  | one by one.               |  |
|  |                           |  |                           |  |
|  | [Upload JSON File]        |  | [Create Question Set]     |  |
|  +---------------------------+  +---------------------------+  |
|                                                               |
+---------------------------------------------------------------+
```

**Key design decisions:**

1. **API importer is shown inline by default** -- no toggle needed. The form (categories, difficulty, count slider, fetch button) is immediately visible and interactive.

2. **"RECOMMENDED" badge** on the primary card signals to the user that this is the suggested path without hiding alternatives.

3. **Secondary methods are smaller cards** below, using `bg-card` / `border-border` styling (not `bg-primary`). They have descriptive text explaining when to use each.

4. **No toggle buttons** -- the API form is always visible in the empty state. Secondary methods use card-style buttons that open their respective UIs.

5. **Header simplified** -- only the page title and back link. The action buttons are removed from the header and placed contextually within the content.

---

### State B: Has Question Sets

Once the user has question sets, the page transitions to a management view with a streamlined "add more" section.

```
+---------------------------------------------------------------+
| HEADER BAR                                                    |
| "My Question Sets" (N sets)         [+ Add Questions] [Back]  |
+---------------------------------------------------------------+
|                                                               |
| (conditionally shown -- when "Add Questions" is active)       |
| +=========================================================+  |
| |  Add Questions                                    [X]    |  |
| |                                                          |  |
| |  [Fetch from API]  [Upload File]  [Create Manually]     |  |
| |   (selected)        (tab)          (tab)                 |  |
| |                                                          |  |
| |  +----------------------------------------------------+  |  |
| |  | Active panel content (API / Upload / Manual)       |  |  |
| |  +----------------------------------------------------+  |  |
| +=========================================================+  |
|                                                               |
| GRID: 2-column card grid of question sets                     |
| +---------------------------+  +---------------------------+  |
| | Science Mix (20 Qs)      |  | History Round 1 (15 Qs)  |  |
| | Science, Geography       |  | History                   |  |
| | Created Jan 5, 2026      |  | Created Jan 3, 2026      |  |
| | [Edit] [Rename] [Export] |  | [Edit] [Rename] [Export] |  |
| | [Delete]                 |  | [Delete]                 |  |
| +---------------------------+  +---------------------------+  |
+---------------------------------------------------------------+
```

**Key design decisions:**

1. **Single "Add Questions" button** in the header replaces the three separate buttons. This reduces the header from 4 buttons to 2.

2. **Tabbed interface** inside the add-questions panel. Tabs are: "Fetch from API" (selected by default), "Upload File", "Create Manually". This preserves all three methods but establishes clear hierarchy through tab order and default selection.

3. **API tab is pre-selected** when the panel opens, reinforcing it as the primary method.

4. **Close button (X)** on the panel provides a clear way to dismiss without toggle-label confusion.

5. **Question set grid** remains below, unchanged in its card layout.

---

### Component Architecture

#### New Component: `AddQuestionsPanel`

A new component that wraps the three import methods in a tabbed interface.

```
File: apps/trivia/src/components/presenter/AddQuestionsPanel.tsx

Props:
  - defaultTab: 'api' | 'upload' | 'manual' (default: 'api')
  - onClose: () => void
  - onSuccess: () => void  (refreshes question set list)

Internal state:
  - activeTab: 'api' | 'upload' | 'manual'

Renders:
  - Tab bar with three tabs (proper ARIA tab pattern)
  - Conditional render of:
    - TriviaApiImporter (for 'api' tab)
    - QuestionSetImporter (for 'upload' tab)
    - Inline trigger for QuestionSetEditorModal (for 'manual' tab)
```

#### New Component: `EmptyStateOnboarding`

Replaces the current empty state with the guided experience.

```
File: apps/trivia/src/components/presenter/EmptyStateOnboarding.tsx

Props:
  - onSuccess: () => void  (refreshes question set list)

Renders:
  - Heading and description text
  - Primary card with inline TriviaApiImporter
  - Secondary cards for Upload and Manual creation
```

#### Modified: `TriviaApiImporter`

The component needs a small refactor to work cleanly on the management page:

- Add an optional `context: 'management' | 'game'` prop (default: `'game'`)
- When `context === 'management'`:
  - Skip the `isGameSetup` check entirely
  - Hide the "Load into Game" button (only show "Save to My Question Sets")
  - Remove the game-status warning text
- When `context === 'game'`: behavior unchanged

This eliminates the confusing "game setup" messaging on the management page.

---

### Wireframe Details: Empty State Primary Card

```
+================================================================+
| RECOMMENDED                                          (badge)   |
|                                                                |
| Fetch from Trivia Database                                     |
| Get questions instantly from thousands of trivia questions      |
| across 7 categories. Free, no account needed.                  |
|                                                                |
| Categories (none = all)                                        |
| [General] [Science] [History] [Geography] [Entertainment]      |
| [Sports] [Art & Lit]                       [Clear selection]   |
|                                                                |
| Difficulty                                                     |
| (Easy) (Medium) (Hard) (*Mixed*)                               |
|                                                                |
| Number of Questions: 20                                        |
| |==========--------| 5 .......................... 50           |
|                                                                |
| [x] Exclude niche questions (recommended for casual play)     |
|                                                                |
| [========== Fetch Questions ==========]  (full-width, large)  |
|                                                                |
| Powered by The Trivia API (free, no account required)          |
+================================================================+
```

The card uses:
- `border-2 border-primary bg-card` to visually distinguish from secondary cards
- The "RECOMMENDED" badge uses `bg-primary/15 text-primary rounded-full px-3 py-1 text-sm font-semibold`
- Internal form is the existing `TriviaApiImporter` rendered with `context="management"`

### Wireframe Details: Secondary Method Cards

```
+----------------------------+   +----------------------------+
| Upload a File              |   | Create Manually            |
|                            |   |                            |
| Import questions from a    |   | Write your own trivia      |
| JSON file you already      |   | questions one by one.      |
| have prepared.             |   | Best for custom or         |
|                            |   | specialized content.       |
|                            |   |                            |
| [Upload JSON File]         |   | [Create Question Set]      |
+----------------------------+   +----------------------------+
```

Cards use:
- `border border-border bg-card` (standard card styling, no primary border)
- Buttons inside use `bg-muted hover:bg-muted/80` (secondary styling)
- Each card is a `min-h-[160px]` flex column with content justified between top and bottom

### Wireframe Details: Has-Questions Tabbed Panel

```
+================================================================+
| Add Questions                                            [X]   |
|                                                                |
| [*Fetch from API*] [ Upload File ] [ Create Manually ]        |
| ----------------------------------------------------------------|
|                                                                |
| (Active tab content rendered here)                             |
|                                                                |
| When "Fetch from API" is active:                               |
|   -> TriviaApiImporter with context="management"               |
|                                                                |
| When "Upload File" is active:                                  |
|   -> QuestionSetImporter                                       |
|                                                                |
| When "Create Manually" is active:                              |
|   -> Description text + button that opens QuestionSetEditorModal|
|                                                                |
+================================================================+
```

Tab styling:
- Active tab: `border-b-2 border-primary text-primary font-semibold`
- Inactive tab: `text-muted-foreground hover:text-foreground`
- Tab bar: `flex gap-0 border-b border-border`
- Each tab button: `min-h-[44px] px-5 py-3 text-base` (accessible touch target)
- Uses proper ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`

---

## Implementation Notes

### Files to Create

| File | Purpose |
|------|---------|
| `apps/trivia/src/components/presenter/AddQuestionsPanel.tsx` | Tabbed container for all three import methods |
| `apps/trivia/src/components/presenter/EmptyStateOnboarding.tsx` | Guided empty state with inline API importer |

### Files to Modify

| File | Changes |
|------|---------|
| `apps/trivia/src/app/question-sets/page.tsx` | Major restructure: remove 3-button header, add conditional empty/populated rendering, integrate new components |
| `apps/trivia/src/components/presenter/TriviaApiImporter.tsx` | Add `context` prop to suppress game-state checks on management page; move `isGameSetup` gating behind context check (around lines 234-237, 247-250, 596-600, 632-637) |

### Files Unchanged

| File | Reason |
|------|--------|
| `apps/trivia/src/components/presenter/QuestionSetImporter.tsx` | Works as-is inside the tabbed panel |
| `apps/trivia/src/components/question-editor/QuestionSetEditorModal.tsx` | Works as-is, triggered from tab panel or card |
| `apps/trivia/src/components/presenter/WizardStepQuestions.tsx` | Separate flow (play page wizard), not part of this redesign |

### Specific Changes to `page.tsx`

**Remove (lines 154-188):** The entire header button bar with 4 buttons.

**Replace with:**
- Simplified header: title + count badge + single "Add Questions" button + "Back" link
- Conditional rendering: `questionSets.length === 0` renders `EmptyStateOnboarding`; otherwise renders `AddQuestionsPanel` (when toggled) + question set grid

**Remove (lines 230-239):** The current empty state ("No question sets yet").

**Replace with:** `EmptyStateOnboarding` component with inline API importer.

**Remove (lines 19-20):** `showImporter` and `showApiImporter` state variables. Replace with single `showAddPanel` boolean.

### Specific Changes to `TriviaApiImporter.tsx`

**Add prop (line 20-23):**
```typescript
export interface TriviaApiImporterProps {
  disabled?: boolean;
  onSaveSuccess?: () => void;
  context?: 'game' | 'management';  // NEW
}
```

**Modify derived state (lines 234-236):**
```typescript
const isManagement = context === 'management';
const isGameSetup = isManagement || gameStatus === 'setup';
```

When `isManagement` is true:
- The "Load into Game" button is not rendered (line 594-611)
- The game-status warning is not rendered (lines 247-250, 632-637)
- The fetch button is never disabled due to game state

### Accessibility Considerations

1. **Tab interface** must use proper ARIA roles (`tablist`, `tab`, `tabpanel`) with keyboard navigation (arrow keys to switch tabs, tab key to enter panel content).

2. **Empty state onboarding** should have a clear heading hierarchy: `h1` for page title, `h2` for "Get Started", `h3` for card titles.

3. **Touch targets** remain at 44x44px minimum for all interactive elements.

4. **Focus management**: When "Add Questions" panel opens, focus should move to the first tab. When panel closes, focus should return to the "Add Questions" button.

5. **Screen reader**: The "RECOMMENDED" badge should be announced: `<span aria-label="Recommended method">RECOMMENDED</span>`.

### Responsive Behavior

- **Desktop (md+):** Two-column layout for secondary cards. Tabbed panel at full width.
- **Mobile (<md):** Secondary cards stack vertically. Tab labels may abbreviate ("API" / "Upload" / "Manual") if needed, with full labels in `aria-label`.
- **The API importer form** is already responsive (uses `flex-wrap` for category buttons, full-width slider and fetch button).

### Migration Path

This redesign is backward-compatible:
- No API changes required
- No data model changes
- All three import methods remain functional
- The QuestionSetEditorModal continues to work as a modal (not inline)
- The WizardStepQuestions in the play flow is unaffected

The implementation can be done in a single PR by:
1. Creating the two new components
2. Modifying `TriviaApiImporter` to accept the `context` prop
3. Restructuring `page.tsx` to use the new components
4. Updating tests in `apps/trivia/src/app/question-sets/__tests__/page.test.tsx`
