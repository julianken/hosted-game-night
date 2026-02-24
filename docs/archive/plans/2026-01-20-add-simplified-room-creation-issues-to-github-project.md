# Add Simplified Room Creation Issues to GitHub Project

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Systematically add all 10 issues from the Simplified Room Creation epic to the GitHub Project at https://github.com/users/julianken/projects/1

**Architecture:** Use GitHub CLI (`gh`) to create issues with proper labels, then add them to the project board. Issues will be created in dependency order with appropriate priority labels and linked dependencies.

**Tech Stack:** GitHub CLI (`gh`), GitHub Projects V2 API, markdown formatting

**Source Document:** `apps/bingo/docs/GITHUB_PROJECT_PLAN.md`

**GitHub Project:**
- ID: `PVT_kwHOANZgD84BNBSx`
- Number: 1
- Owner: julianken
- URL: https://github.com/users/julianken/projects/1

---

## Prerequisites Check

Before starting, verify:
- [ ] GitHub CLI is authenticated: `gh auth status`
- [ ] Can access the project: `gh project view 1 --owner julianken`
- [ ] Repository context: Currently in `joolie-boolie-platform` repo
- [ ] Source document exists: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md`

---

## Task 1: Extract Issue Content from Plan Document

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md`

**Step 1: Verify the source document exists**

Run: `ls -la apps/bingo/docs/GITHUB_PROJECT_PLAN.md`
Expected: File exists with readable permissions

**Step 2: Count how many issues are defined**

Run: `grep -c "^## Issue #" apps/bingo/docs/GITHUB_PROJECT_PLAN.md`
Expected: `10`

**Step 3: Extract issue titles for reference**

Run: `grep "^## Issue #" apps/bingo/docs/GITHUB_PROJECT_PLAN.md`
Expected: List of 10 issue titles

---

## Task 2: Determine Repository for Issues

**Step 1: Check current git repository**

Run: `git remote get-url origin`
Expected: Output showing the repository URL

**Step 2: Extract owner and repo name**

The issues should be created in the `joolie-boolie-platform` repository.
- Owner: `julianken` (or extracted from remote URL)
- Repo: `joolie-boolie-platform`

**Step 3: Verify repository access**

Run: `gh repo view`
Expected: Repository information displayed

---

## Task 3: Create Issue #1 - Secure Generation Utilities

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 29-85)

**Step 1: Extract issue content**

Extract the complete markdown content from "## Issue #1: Create Secure Generation Utilities" to the next `---` separator.

**Step 2: Create the issue**

Run:
```bash
gh issue create \
  --title "Create Secure Generation Utilities" \
  --body-file <(sed -n '/^## Issue #1:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: critical" \
  --label "bingo" \
  --label "enhancement"
```

Expected: Issue created with number (e.g., #110)

**Step 3: Capture issue number**

Save the issue number from the output (e.g., `ISSUE_1=110`)

**Step 4: Add issue to project**

Run:
```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_1
```

Expected: "Added item" confirmation

**Step 5: Verify issue was added**

Run: `gh issue view $ISSUE_1`
Expected: Issue details displayed with correct labels

---

## Task 4: Create Issue #2 - Update Play Page Session ID Strategy

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 87-147)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Update Play Page Session ID Strategy" \
  --body-file <(sed -n '/^## Issue #2:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: critical" \
  --label "bingo" \
  --label "enhancement"
```

Expected: Issue created with number (e.g., #111)

**Step 2: Capture issue number**

Save: `ISSUE_2=111`

**Step 3: Add dependency reference to Issue #1**

Run:
```bash
gh issue comment $ISSUE_2 --body "**Dependencies:** #$ISSUE_1"
```

Expected: Comment added

**Step 4: Add to project**

Run:
```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_2
```

Expected: "Added item" confirmation

---

## Task 5: Create Issue #3 - Fix Modal Timing and Recovery Error Handling

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 149-212)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Fix Modal Timing and Recovery Error Handling" \
  --body-file <(sed -n '/^## Issue #3:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: critical" \
  --label "bingo" \
  --label "enhancement"
```

Expected: Issue created with number

**Step 2: Capture and add dependency**

```bash
ISSUE_3=<number>
gh issue comment $ISSUE_3 --body "**Dependencies:** #$ISSUE_2"
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_3
```

---

## Task 6: Create Issue #4 - Implement PIN Persistence

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 214-283)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Implement PIN Persistence" \
  --body-file <(sed -n '/^## Issue #4:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: critical" \
  --label "bingo" \
  --label "enhancement"
```

**Step 2: Capture and add dependency**

```bash
ISSUE_4=<number>
gh issue comment $ISSUE_4 --body "**Dependencies:** #$ISSUE_2"
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_4
```

---

## Task 7: Create Issue #5 - Implement Offline Mode Support

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 285-350)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Implement Offline Mode Support" \
  --body-file <(sed -n '/^## Issue #5:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: high" \
  --label "bingo" \
  --label "enhancement"
```

**Step 2: Capture and add dependency**

```bash
ISSUE_5=<number>
gh issue comment $ISSUE_5 --body "**Dependencies:** #$ISSUE_2"
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_5
```

---

## Task 8: Create Issue #6 - Create Room Setup Modal Component

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 352-429)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Create Room Setup Modal Component" \
  --body-file <(sed -n '/^## Issue #6:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: high" \
  --label "bingo" \
  --label "enhancement"
```

**Step 2: Capture issue number (no dependencies)**

```bash
ISSUE_6=<number>
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_6
```

---

## Task 9: Create Issue #7 - Add PIN Display to Admin Panel

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 431-497)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Add PIN Display to Admin Panel" \
  --body-file <(sed -n '/^## Issue #7:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: high" \
  --label "bingo" \
  --label "enhancement"
```

**Step 2: Capture and add dependency**

```bash
ISSUE_7=<number>
gh issue comment $ISSUE_7 --body "**Dependencies:** #$ISSUE_4"
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_7
```

---

## Task 10: Create Issue #8 - Add Create New Game Button

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 499-567)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Add Create New Game Button" \
  --body-file <(sed -n '/^## Issue #8:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: medium" \
  --label "bingo" \
  --label "enhancement"
```

**Step 2: Capture and add dependencies**

```bash
ISSUE_8=<number>
gh issue comment $ISSUE_8 --body "**Dependencies:** #$ISSUE_3, #$ISSUE_5"
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_8
```

---

## Task 11: Create Issue #9 - Integrate Room Setup Modal

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 569-632)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Integrate Room Setup Modal" \
  --body-file <(sed -n '/^## Issue #9:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: high" \
  --label "bingo" \
  --label "enhancement"
```

**Step 2: Capture and add dependencies**

```bash
ISSUE_9=<number>
gh issue comment $ISSUE_9 --body "**Dependencies:** #$ISSUE_3, #$ISSUE_4, #$ISSUE_5, #$ISSUE_6"
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_9
```

---

## Task 12: Create Issue #10 - Testing and Documentation

**Files:**
- Read: `apps/bingo/docs/GITHUB_PROJECT_PLAN.md` (lines 634-724)

**Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Testing and Documentation" \
  --body-file <(sed -n '/^## Issue #10:/,/^---$/p' apps/bingo/docs/GITHUB_PROJECT_PLAN.md | sed '1d;$d') \
  --label "priority: medium" \
  --label "bingo" \
  --label "testing" \
  --label "documentation"
```

**Step 2: Capture and add dependencies**

```bash
ISSUE_10=<number>
gh issue comment $ISSUE_10 --body "**Dependencies:** All previous issues (#$ISSUE_1 through #$ISSUE_9)"
```

**Step 3: Add to project**

```bash
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$ISSUE_10
```

---

## Task 13: Create Epic/Parent Issue (Optional)

**Step 1: Create a parent epic issue**

Run:
```bash
gh issue create \
  --title "Epic: Simplified Room Creation Flow" \
  --body "This epic tracks the implementation of the simplified room creation flow for Bingo.

**Goal:** Eliminate manual PIN entry, add offline-first gameplay, fix session ID collisions

**Key Features:**
- Auto-generate 4-digit PINs using crypto.getRandomValues
- Short, typable session IDs (6 chars) for offline mode
- Immediate room setup modal on /play load
- Session recovery with error handling
- Multi-window BroadcastChannel sync (online & offline)

**Child Issues:**
- #$ISSUE_1 - Create Secure Generation Utilities
- #$ISSUE_2 - Update Play Page Session ID Strategy
- #$ISSUE_3 - Fix Modal Timing and Recovery Error Handling
- #$ISSUE_4 - Implement PIN Persistence
- #$ISSUE_5 - Implement Offline Mode Support
- #$ISSUE_6 - Create Room Setup Modal Component
- #$ISSUE_7 - Add PIN Display to Admin Panel
- #$ISSUE_8 - Add Create New Game Button
- #$ISSUE_9 - Integrate Room Setup Modal
- #$ISSUE_10 - Testing and Documentation

**Documentation:** See \`apps/bingo/docs/GITHUB_PROJECT_PLAN.md\` for detailed implementation plan." \
  --label "epic" \
  --label "bingo" \
  --label "enhancement"
```

**Step 2: Add epic to project**

```bash
EPIC_ISSUE=<number>
gh project item-add 1 --owner julianken --url https://github.com/julianken/joolie-boolie-platform/issues/$EPIC_ISSUE
```

---

## Task 14: Verification

**Step 1: List all created issues**

Run:
```bash
gh issue list --label "bingo" --limit 15
```

Expected: See all 10 issues (plus epic if created)

**Step 2: Verify project has all items**

Run:
```bash
gh project item-list 1 --owner julianken --limit 50 | grep -i "room\|PIN\|modal\|offline\|testing"
```

Expected: See all related issues in the project

**Step 3: Check issue dependencies are documented**

Manually verify:
- Issue #2 has comment referencing #1
- Issue #3 has comment referencing #2
- Issue #4 has comment referencing #2
- Issue #5 has comment referencing #2
- Issue #7 has comment referencing #4
- Issue #8 has comment referencing #3, #5
- Issue #9 has comment referencing #3, #4, #5, #6
- Issue #10 has comment referencing all previous

**Step 4: Verify labels are correct**

Run:
```bash
gh issue view $ISSUE_1 --json labels
gh issue view $ISSUE_2 --json labels
# etc.
```

Expected: Each issue has correct priority and category labels

---

## Automated Script Alternative

**Instead of manual execution, create a script:**

**File:** `scripts/create-github-issues.sh`

```bash
#!/bin/bash
set -e

# Repository details
OWNER="julianken"
REPO="joolie-boolie-platform"
PROJECT_NUMBER=1
SOURCE_FILE="apps/bingo/docs/GITHUB_PROJECT_PLAN.md"

# Function to extract issue content
extract_issue() {
  local issue_num=$1
  sed -n "/^## Issue #${issue_num}:/,/^---$/p" "$SOURCE_FILE" | sed '1d;$d'
}

# Function to create issue and add to project
create_issue() {
  local title="$1"
  local issue_num=$2
  local priority="$3"
  shift 3
  local labels=("$@")

  echo "Creating Issue #${issue_num}: ${title}"

  # Build label arguments
  local label_args=""
  for label in "${labels[@]}"; do
    label_args="$label_args --label \"$label\""
  done

  # Create issue
  local issue_url=$(gh issue create \
    --title "$title" \
    --body "$(extract_issue $issue_num)" \
    --label "priority: $priority" \
    --label "bingo" \
    --label "enhancement" \
    --json url \
    --jq '.url')

  echo "Created: $issue_url"

  # Add to project
  gh project item-add $PROJECT_NUMBER --owner $OWNER --url "$issue_url"

  # Extract issue number
  local issue_number=$(echo "$issue_url" | grep -oE '[0-9]+$')
  echo "$issue_number"
}

# Create all issues
echo "Creating issues from $SOURCE_FILE..."

ISSUE_1=$(create_issue "Create Secure Generation Utilities" 1 "critical")
ISSUE_2=$(create_issue "Update Play Page Session ID Strategy" 2 "critical")
gh issue comment $ISSUE_2 --body "**Dependencies:** #$ISSUE_1"

ISSUE_3=$(create_issue "Fix Modal Timing and Recovery Error Handling" 3 "critical")
gh issue comment $ISSUE_3 --body "**Dependencies:** #$ISSUE_2"

ISSUE_4=$(create_issue "Implement PIN Persistence" 4 "critical")
gh issue comment $ISSUE_4 --body "**Dependencies:** #$ISSUE_2"

ISSUE_5=$(create_issue "Implement Offline Mode Support" 5 "high")
gh issue comment $ISSUE_5 --body "**Dependencies:** #$ISSUE_2"

ISSUE_6=$(create_issue "Create Room Setup Modal Component" 6 "high")

ISSUE_7=$(create_issue "Add PIN Display to Admin Panel" 7 "high")
gh issue comment $ISSUE_7 --body "**Dependencies:** #$ISSUE_4"

ISSUE_8=$(create_issue "Add Create New Game Button" 8 "medium")
gh issue comment $ISSUE_8 --body "**Dependencies:** #$ISSUE_3, #$ISSUE_5"

ISSUE_9=$(create_issue "Integrate Room Setup Modal" 9 "high")
gh issue comment $ISSUE_9 --body "**Dependencies:** #$ISSUE_3, #$ISSUE_4, #$ISSUE_5, #$ISSUE_6"

ISSUE_10=$(create_issue "Testing and Documentation" 10 "medium")
gh issue comment $ISSUE_10 --body "**Dependencies:** All previous issues (#$ISSUE_1 through #$ISSUE_9)"

echo ""
echo "✅ All issues created successfully!"
echo "Issue numbers: #$ISSUE_1, #$ISSUE_2, #$ISSUE_3, #$ISSUE_4, #$ISSUE_5, #$ISSUE_6, #$ISSUE_7, #$ISSUE_8, #$ISSUE_9, #$ISSUE_10"
echo ""
echo "View project: https://github.com/users/$OWNER/projects/$PROJECT_NUMBER"
```

**Step 1: Make script executable**

Run: `chmod +x scripts/create-github-issues.sh`

**Step 2: Run script**

Run: `./scripts/create-github-issues.sh`

Expected: All 10 issues created and added to project

---

## Rollback Plan

If issues are created incorrectly:

**Step 1: List recently created issues**

```bash
gh issue list --label "bingo" --state all --limit 20 --json number,title,createdAt
```

**Step 2: Close incorrect issues**

```bash
gh issue close <issue_number> --reason "not planned"
```

**Step 3: Remove from project**

```bash
gh project item-delete <item_id> --owner julianken
```

---

## Success Criteria

- [ ] All 10 issues created in repository
- [ ] All issues have correct labels (priority, bingo, enhancement)
- [ ] All issues added to GitHub Project #1
- [ ] Dependencies documented in issue comments
- [ ] Epic issue created (optional) linking all child issues
- [ ] Issues can be viewed at https://github.com/users/julianken/projects/1
- [ ] Issue content matches GITHUB_PROJECT_PLAN.md exactly

---

## Notes

**GitHub CLI Quirks:**
- `gh issue create` with `--body-file` works best for long content
- Use process substitution `<(command)` to avoid temp files
- Project item-add requires full issue URL, not just number
- Labels must exist in repository before use

**Label Creation (if needed):**
```bash
gh label create "priority: critical" --color "d73a4a"
gh label create "priority: high" --color "ff6b6b"
gh label create "priority: medium" --color "fbca04"
```

**Issue Number Tracking:**
Store issue numbers as you create them for dependency linking.
