#!/bin/bash
set -e

# Repository details
OWNER="julianken"
REPO="beak-gaming-platform"
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
  local extra_labels="${4:-}"

  echo "Creating Issue #${issue_num}: ${title}"

  # Create issue with body from file
  local temp_body=$(mktemp)
  extract_issue "$issue_num" > "$temp_body"

  # Create issue with labels
  if [ -n "$extra_labels" ]; then
    local issue_url=$(gh issue create \
      --title "$title" \
      --body-file "$temp_body" \
      --label "priority:${priority}" \
      --label "bingo" \
      --label "enhancement" \
      --label "$extra_labels")
  else
    local issue_url=$(gh issue create \
      --title "$title" \
      --body-file "$temp_body" \
      --label "priority:${priority}" \
      --label "bingo" \
      --label "enhancement")
  fi

  rm "$temp_body"

  echo "Created: $issue_url"

  # Add to project
  gh project item-add $PROJECT_NUMBER --owner $OWNER --url "$issue_url"

  # Extract issue number from URL
  local issue_number=$(echo "$issue_url" | grep -oE '[0-9]+$')
  echo "$issue_number"
}

# Check prerequisites
echo "Checking prerequisites..."
if ! gh auth status > /dev/null 2>&1; then
  echo "ERROR: GitHub CLI not authenticated. Run 'gh auth login' first."
  exit 1
fi

if [ ! -f "$SOURCE_FILE" ]; then
  echo "ERROR: Source file not found: $SOURCE_FILE"
  exit 1
fi

echo "✓ Prerequisites OK"
echo ""

# Create all issues
echo "Creating issues from $SOURCE_FILE..."
echo ""

ISSUE_1=$(create_issue "Create Secure Generation Utilities" 1 "critical")
sleep 1

ISSUE_2=$(create_issue "Update Play Page Session ID Strategy" 2 "critical")
gh issue comment $ISSUE_2 --body "**Dependencies:** #$ISSUE_1"
sleep 1

ISSUE_3=$(create_issue "Fix Modal Timing and Recovery Error Handling" 3 "critical")
gh issue comment $ISSUE_3 --body "**Dependencies:** #$ISSUE_2"
sleep 1

ISSUE_4=$(create_issue "Implement PIN Persistence" 4 "critical")
gh issue comment $ISSUE_4 --body "**Dependencies:** #$ISSUE_2"
sleep 1

ISSUE_5=$(create_issue "Implement Offline Mode Support" 5 "high")
gh issue comment $ISSUE_5 --body "**Dependencies:** #$ISSUE_2"
sleep 1

ISSUE_6=$(create_issue "Create Room Setup Modal Component" 6 "high")
sleep 1

ISSUE_7=$(create_issue "Add PIN Display to Admin Panel" 7 "high")
gh issue comment $ISSUE_7 --body "**Dependencies:** #$ISSUE_4"
sleep 1

ISSUE_8=$(create_issue "Add Create New Game Button" 8 "medium")
gh issue comment $ISSUE_8 --body "**Dependencies:** #$ISSUE_3, #$ISSUE_5"
sleep 1

ISSUE_9=$(create_issue "Integrate Room Setup Modal" 9 "high")
gh issue comment $ISSUE_9 --body "**Dependencies:** #$ISSUE_3, #$ISSUE_4, #$ISSUE_5, #$ISSUE_6"
sleep 1

ISSUE_10=$(create_issue "Testing and Documentation" 10 "medium" "testing")
gh issue comment $ISSUE_10 --body "**Dependencies:** All previous issues (#$ISSUE_1 through #$ISSUE_9)"
sleep 1

echo ""
echo "✅ All issues created successfully!"
echo ""
echo "Issue numbers:"
echo "  #$ISSUE_1 - Create Secure Generation Utilities"
echo "  #$ISSUE_2 - Update Play Page Session ID Strategy"
echo "  #$ISSUE_3 - Fix Modal Timing and Recovery Error Handling"
echo "  #$ISSUE_4 - Implement PIN Persistence"
echo "  #$ISSUE_5 - Implement Offline Mode Support"
echo "  #$ISSUE_6 - Create Room Setup Modal Component"
echo "  #$ISSUE_7 - Add PIN Display to Admin Panel"
echo "  #$ISSUE_8 - Add Create New Game Button"
echo "  #$ISSUE_9 - Integrate Room Setup Modal"
echo "  #$ISSUE_10 - Testing and Documentation"
echo ""
echo "View project: https://github.com/users/$OWNER/projects/$PROJECT_NUMBER"
