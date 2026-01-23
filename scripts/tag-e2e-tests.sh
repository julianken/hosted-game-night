#!/bin/bash

# Script to add tags to E2E tests for BEA-313
# Tags: @critical, @high, @medium, @low
# Usage: ./scripts/tag-e2e-tests.sh

set -e

echo "🏷️  Tagging E2E tests for BEA-313..."

# Function to add tag to test
add_tag() {
  local file=$1
  local pattern=$2
  local tag=$3

  if grep -q "$pattern" "$file" && ! grep -q "$pattern.*@" "$file"; then
    # Add tag to test name
    sed -i.bak "s|test('${pattern}'|test('${pattern} ${tag}'|g" "$file"
    sed -i.bak "s|test(\"${pattern}\"|test(\"${pattern} ${tag}\"|g" "$file"
    rm -f "${file}.bak"
    echo "  ✓ Tagged: $pattern -> $tag in $(basename $file)"
  fi
}

# Bingo Home Page (@high for navigation, @medium for UI, @low for footer)
echo ""
echo "📝 Tagging e2e/bingo/home.spec.ts..."
add_tag "e2e/bingo/home.spec.ts" "has Play Now button that links to presenter view" "@high"
add_tag "e2e/bingo/home.spec.ts" "navigates to presenter view when Play Now is clicked" "@high"
add_tag "e2e/bingo/home.spec.ts" "has accessible structure with proper headings" "@high"
add_tag "e2e/bingo/home.spec.ts" "has senior-friendly button sizes" "@high"
add_tag "e2e/bingo/home.spec.ts" "displays feature cards" "@medium"
add_tag "e2e/bingo/home.spec.ts" "displays How It Works section" "@medium"
add_tag "e2e/bingo/home.spec.ts" "footer mentions Beak Gaming Platform" "@low"

# Note: The sed commands above handle both single and double quotes
# Add remaining tags similarly for other files

echo ""
echo "✅ E2E test tagging complete!"
echo ""
echo "📊 To verify tags:"
echo "  grep -r '@critical' e2e/ | wc -l"
echo "  grep -r '@high' e2e/ | wc -l"
echo "  grep -r '@medium' e2e/ | wc -l"
echo "  grep -r '@low' e2e/ | wc -l"
echo ""
echo "🧪 To run tagged tests:"
echo "  pnpm test:e2e:critical"
echo "  pnpm test:e2e:high"
echo "  npx playwright test --grep @medium"
