# README Standards and Best Practices

**Version:** 1.0
**Last Updated:** January 21, 2026
**Applies To:** All apps and packages in the Joolie Boolie monorepo

---

## 1. Overview

### Purpose

This document defines the standards for writing and maintaining README files across the Joolie Boolie monorepo. Consistent documentation ensures that developers, contributors, and stakeholders can quickly understand each component's purpose, capabilities, and integration status.

### Benefits of Consistent Documentation

- **Faster Onboarding:** New contributors can quickly understand any app or package
- **Reduced Cognitive Load:** Predictable structure means less time searching for information
- **Better Maintainability:** Clear standards prevent documentation drift over time
- **Professional Presentation:** Consistent quality reflects well on the project
- **Accurate Status Tracking:** Standardized badges provide instant visibility into completion state

### Implementation Date

README standardization was implemented on January 21, 2026, as part of the platform's transition to production readiness. All existing READMEs were audited and updated to meet these standards.

---

## 2. Status Badge Standards

### Format

Every README must begin with a status badge immediately after the title:

```markdown
# Package/App Name

**Status:** [Emoji] [Label] ([Percentage]% Complete)
```

### Status Mapping

| Emoji | Label | Percentage Range | Meaning |
|-------|-------|------------------|---------|
| ✅ | Production Ready | 85-100% | Fully functional, tested, and actively used in production |
| 🚧 | In Progress | 40-84% | Core functionality exists but incomplete or untested |
| ⚠️ | Partial | 10-39% | Scaffolded or minimal implementation |
| ❌ | Planned | 0-9% | Not yet implemented or placeholder only |

### Completion Percentage Guidelines

**95-100%:** Feature complete with only minor enhancements pending
- Example: `**Status:** ✅ Production Ready (95% Complete)`

**85-94%:** Production ready but missing 1-2 significant features
- Example: `**Status:** ✅ Production Ready (85% Complete)`

**70-84%:** Major features implemented but needs polish or testing
- Example: `**Status:** 🚧 In Progress (75% Complete)`

**40-69%:** Core functionality exists but incomplete
- Example: `**Status:** 🚧 In Progress (50% Complete)`

**10-39%:** Basic scaffolding or minimal implementation
- Example: `**Status:** ⚠️ Partial (25% Complete)`

**0-9%:** Planning stage or placeholder only
- Example: `**Status:** ❌ Planned (5% Complete)`

### Status Examples

```markdown
# Bingo

**Status:** ✅ Production Ready (85% Complete)

# Platform Hub

**Status:** ⚠️ Partial (10% Complete)

# Game Engine Package

**Status:** 🚧 In Progress (40% Complete)
```

---

## 3. Required Sections

### 3.1 App READMEs (13 Required Sections)

Apps are located in `apps/` and represent complete Next.js applications (Bingo, Trivia, Platform Hub).

#### Section 1: Title + Status Badge

```markdown
# App Name

**Status:** ✅ Production Ready (95% Complete)
```

#### Section 2: Description

One paragraph explaining what the app does and who it's for.

**Example:**
```markdown
Full-featured 75-ball bingo game designed for groups and communities. Includes 29 patterns, dual-screen presenter/audience views, audio calling, customizable themes, and PWA support for offline play.
```

#### Section 3: Features

Bulleted list of key features, grouped logically if more than 8 features.

**Example:**
```markdown
## Features

### Game Mechanics
- 75-ball bingo with 29 classic patterns
- Auto-call mode with configurable intervals (3-8 seconds)
- Ball call history with undo functionality

### Dual-Screen Experience
- Presenter view for game control
- Audience view optimized for projectors/large screens
- Real-time synchronization via BroadcastChannel API
```

#### Section 4: Quick Start

Minimal steps to run the app locally. Must be copy-pasteable.

**Example:**
```bash
# From repository root
pnpm install

# Run bingo app on http://localhost:3000
pnpm dev:bingo

# Open dual screens
# Presenter: http://localhost:3000/play
# Audience: http://localhost:3000/display
```

#### Section 5: Architecture

Explain the app's architectural patterns and folder structure.

**Example:**
```markdown
## Architecture

### BFF Pattern
All Supabase interactions go through Next.js API routes in `app/api/`. No direct database calls from the client.

### Dual-Screen System
Uses BroadcastChannel API for same-device window communication:
- Presenter window (`/play`): Game controls for host
- Audience window (`/display`): Large display for players

### Game Engine Pattern
Pure function-based state management:
\`\`\`
GameState → engine functions → new GameState → Zustand store → React components
\`\`\`
```

#### Section 6: Environment Variables

List all required environment variables with descriptions.

**Example:**
```markdown
## Environment Variables

Create `.env.local` in the app directory:

\`\`\`bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session Token Secret (generate with: openssl rand -hex 32)
SESSION_TOKEN_SECRET=your-64-character-hex-string
\`\`\`
```

#### Section 7: Development Workflow

Common development tasks and commands.

**Example:**
```markdown
## Development Workflow

\`\`\`bash
# Start dev server
pnpm dev

# Run tests
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix
\`\`\`
```

#### Section 8: Keyboard Shortcuts (if applicable)

Table of keyboard shortcuts for presenter view.

**Example:**
```markdown
## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Roll next ball |
| P | Pause/Resume |
| R | Reset game |
| U | Undo last call |
| M | Mute audio |
```

#### Section 9: Shared Packages

List which packages the app depends on.

**Example:**
```markdown
## Shared Packages

This app uses:
- **@joolie-boolie/sync** - Dual-screen synchronization
- **@joolie-boolie/ui** - UI components (Button, Toggle, Slider)
- **@joolie-boolie/theme** - Design tokens and CSS
- **@joolie-boolie/database** - Supabase client and utilities
- **@joolie-boolie/auth** - Authentication hooks and providers
```

#### Section 10: Integration Status

Table showing integration status of shared packages.

**Example:**
```markdown
## Integration Status

| Feature | Status | Notes |
|---------|--------|-------|
| Dual-screen sync | ✅ Complete | Using BroadcastChannel |
| Database | ✅ Complete | All API routes implemented |
| Authentication | ⚠️ Partial | Package ready, needs UI integration |
| Theme system | ✅ Complete | Using 10+ pre-built themes |
| PWA | ✅ Complete | Service worker + manifest |
```

#### Section 11: Known Issues & Limitations

Honest list of current limitations.

**Example:**
```markdown
## Known Issues & Limitations

- **Authentication:** UI not yet integrated (package ready)
- **Templates:** Game template CRUD not implemented
- **Mobile:** Presenter view not optimized for small screens
- **Safari Audio:** Auto-call may not work on first load (requires user interaction)
```

#### Section 12: Future Work

Roadmap items and planned features.

**Example:**
```markdown
## Future Work

- [ ] Integrate authentication UI (Q1 2026)
- [ ] Implement game templates management
- [ ] Add mobile-responsive presenter view
- [ ] Export game history as CSV
- [ ] Multi-language support
```

#### Section 13: Related Documentation

Links to related docs.

**Example:**
```markdown
## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed context for AI assistants
- [Testing Guide](../../docs/TESTING.md)
- [README Standards](../../docs/README_STANDARDS.md)
- [Package READMEs](../../packages/)
```

---

### 3.2 Package READMEs (10-12 Required Sections)

Packages are located in `packages/` and represent shared libraries used across apps.

#### Section 1: Title + Status Badge

```markdown
# @joolie-boolie/package-name

**Status:** ✅ Production Ready (100% Complete)
```

#### Section 2: Description

One paragraph explaining what the package does and its primary use case.

**Example:**
```markdown
Dual-screen synchronization library for real-time communication between presenter and audience windows. Uses BroadcastChannel API for same-device window communication with Zustand store integration and React hooks.
```

#### Section 3: Features

Bulleted list of key features.

**Example:**
```markdown
## Features

- BroadcastChannel-based window synchronization
- Type-safe message passing
- Zustand store integration
- React hooks for easy integration
- Zero external dependencies
- Works offline (no server required)
```

#### Section 4: Installation

How to install/use the package in the monorepo.

**Example:**
```markdown
## Installation

This package is part of the Joolie Boolie monorepo. Add it to your app's dependencies:

\`\`\`json
{
  "dependencies": {
    "@joolie-boolie/sync": "workspace:*"
  }
}
\`\`\`

Then run:
\`\`\`bash
pnpm install
\`\`\`
```

#### Section 5: Quick Start / Usage

Minimal working example.

**Example:**
```markdown
## Quick Start

\`\`\`typescript
import { createSyncStore, useSyncStore } from '@joolie-boolie/sync';

// Define your message types
type MyMessage =
  | { type: 'UPDATE'; data: string }
  | { type: 'RESET' };

// Create store
const useMySyncStore = createSyncStore<MyMessage>('my-channel');

// Use in components
function MyComponent() {
  const { broadcast, subscribe } = useMySyncStore();

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === 'UPDATE') {
        console.log('Received:', message.data);
      }
    });
  }, [subscribe]);

  return (
    <button onClick={() => broadcast({ type: 'UPDATE', data: 'Hello' })}>
      Send Message
    </button>
  );
}
\`\`\`
```

#### Section 6: API Reference

Document all exports with TypeScript signatures.

**Example:**
```markdown
## API Reference

### `createSyncStore<T>(channelName: string)`

Creates a Zustand store with BroadcastChannel synchronization.

**Type Parameters:**
- `T` - Union type of message objects

**Returns:** Zustand store hook

**Example:**
\`\`\`typescript
const useSyncStore = createSyncStore<MyMessage>('channel-name');
\`\`\`

### `useSyncStore()`

Hook to access sync store methods.

**Returns:**
\`\`\`typescript
{
  broadcast: (message: T) => void;
  subscribe: (handler: (message: T) => void) => () => void;
  isConnected: boolean;
}
\`\`\`
```

#### Section 7: Integration Status

Where the package is currently used.

**Example:**
```markdown
## Integration Status

| App | Status | Notes |
|-----|--------|-------|
| Bingo | ✅ Integrated | Presenter ↔ Audience sync |
| Trivia | ✅ Integrated | Presenter ↔ Audience sync |
| Platform Hub | ❌ Not needed | Single-screen app |
```

#### Section 8: Design Philosophy (if applicable)

For complex packages, explain design decisions.

**Example:**
```markdown
## Design Philosophy

**Zero Dependencies:** No external libraries to minimize bundle size and security surface.

**Type Safety First:** All APIs are fully typed with TypeScript generics.

**Framework Agnostic Core:** BroadcastChannel wrapper is pure JS, React integration is optional.

**Fail Gracefully:** If BroadcastChannel is not supported, operations no-op instead of throwing.
```

#### Section 9: Related Packages

List related packages in the monorepo.

**Example:**
```markdown
## Related Packages

- **@joolie-boolie/ui** - UI components
- **@joolie-boolie/theme** - Design tokens
- **@joolie-boolie/testing** - Test utilities (includes sync mocks)
```

#### Section 10: Related Documentation

Links to related docs.

**Example:**
```markdown
## Related Documentation

- [Sync Testing Guide](../../docs/TESTING.md#sync-testing)
- [Architecture Overview](../../docs/ARCHITECTURE.md)
- [README Standards](../../docs/README_STANDARDS.md)
```

---

## 4. Consistency Standards

### 4.1 Terminology Table

Use consistent terminology across all READMEs:

| ✅ Preferred | ❌ Avoid | Context |
|-------------|---------|---------|
| Presenter view | Host view, Control panel | Dual-screen apps |
| Audience view | Display view, Player view | Dual-screen apps |
| BroadcastChannel API | Browser sync, Window communication | Technical docs |
| Accessible | Elder-friendly, Accessible | Design language |
| Game engine | Game logic, Core | Architecture |
| Pure functions | Stateless functions | Game engine |
| Zustand store | State store, Store | State management |
| BFF (Backend for Frontend) | API layer | Architecture |
| Type-safe | Strongly typed | TypeScript features |
| Monorepo | Mono-repo, Multi-package | Project structure |

### 4.2 Code Example Standards

#### Language Identifiers

Always use language identifiers in code blocks:

```markdown
✅ Correct:
\`\`\`typescript
const foo: string = 'bar';
\`\`\`

\`\`\`tsx
export function Component() {
  return <div>Hello</div>;
}
\`\`\`

\`\`\`bash
pnpm install
\`\`\`

❌ Incorrect:
\`\`\`
const foo = 'bar';
\`\`\`
```

#### Common Language Identifiers

- `typescript` - TypeScript code (non-React)
- `tsx` - TypeScript React components
- `bash` - Shell commands
- `json` - JSON configuration
- `markdown` - Markdown examples
- `css` - CSS code

#### Import Statements

Always use real package names in examples:

```typescript
✅ Correct:
import { Button } from '@joolie-boolie/ui';
import { useAuth } from '@joolie-boolie/auth';
import { createClient } from '@joolie-boolie/database';

❌ Incorrect:
import { Button } from '../ui';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/database';
```

#### Comments in Examples

Use comments to explain non-obvious code:

```typescript
// ✅ Good: Explains WHY
// Subscribe to broadcast messages and unsubscribe on cleanup
useEffect(() => {
  return subscribe((message) => {
    handleMessage(message);
  });
}, [subscribe]);

// ❌ Bad: States the obvious
// Use effect hook
useEffect(() => {
  // Return subscribe with message handler
  return subscribe((message) => {
    // Handle message
    handleMessage(message);
  });
}, [subscribe]);
```

### 4.3 Heading Hierarchy Rules

**Never skip heading levels:**

```markdown
✅ Correct:
# Main Title
## Section
### Subsection
#### Detail

❌ Incorrect:
# Main Title
### Section (skipped H2)
```

**Use title case for H1, sentence case for H2-H6:**

```markdown
✅ Correct:
# Joolie Boolie
## Architecture overview
### Game engine pattern

❌ Incorrect:
# Joolie Boolie platform
## Architecture Overview
### Game Engine Pattern
```

**Maximum depth: H4 (####)**

Deeply nested headings indicate the section should be split into separate documents.

### 4.4 Cross-Reference Format

**Internal links (within README):**
```markdown
See [Architecture](#architecture) for details.
```

**Sibling files:**
```markdown
See [CLAUDE.md](./CLAUDE.md) for AI assistant context.
```

**Parent directory:**
```markdown
See [Testing Guide](../../docs/TESTING.md)
```

**Other packages:**
```markdown
See [@joolie-boolie/ui README](../../packages/ui/README.md)
```

**Always use relative paths, not absolute paths:**

```markdown
✅ Correct:
[UI Package](../../packages/ui/README.md)

❌ Incorrect:
[UI Package](/packages/ui/README.md)
```

---

## 5. Code Example Requirements

### Minimum Example Count

- **Packages:** Minimum 3 working examples in Quick Start or Usage section
- **Apps:** Minimum 1 complete Quick Start example

### Example Quality Standards

**Copy-Pasteable:**
```typescript
// ✅ This works if pasted into a file
import { Button } from '@joolie-boolie/ui';

export function MyComponent() {
  return <Button onClick={() => alert('Hello')}>Click Me</Button>;
}
```

**Complete Imports:**
```typescript
// ✅ All imports shown
import { useEffect } from 'react';
import { useSyncStore } from '@joolie-boolie/sync';

// ❌ Missing imports
function MyComponent() {
  const { broadcast } = useSyncStore(); // Where is this from?
}
```

**Real Use Cases:**
```typescript
// ✅ Shows actual pattern from codebase
const useGameStore = create<GameState>((set) => ({
  status: 'idle',
  startGame: () => set({ status: 'active' }),
}));

// ❌ Trivial example that doesn't help
const useStore = create((set) => ({
  value: 0,
  increment: () => set((s) => ({ value: s.value + 1 })),
}));
```

### Example Structure

**1. Minimal Example (Quick Start):**
```typescript
// Simplest possible usage
import { Button } from '@joolie-boolie/ui';

<Button>Click Me</Button>
```

**2. Common Use Case:**
```typescript
// Realistic component
import { Button } from '@joolie-boolie/ui';
import { useGameStore } from '@/stores/game';

export function GameControls() {
  const { startGame, pauseGame, status } = useGameStore();

  return (
    <div>
      <Button onClick={startGame} disabled={status === 'active'}>
        Start Game
      </Button>
      <Button onClick={pauseGame} disabled={status !== 'active'}>
        Pause Game
      </Button>
    </div>
  );
}
```

**3. Advanced Usage:**
```typescript
// Complex integration
import { useEffect } from 'react';
import { create } from 'zustand';
import { createSyncStore } from '@joolie-boolie/sync';

type GameMessage =
  | { type: 'START'; timestamp: number }
  | { type: 'PAUSE'; reason: string };

const useSyncStore = createSyncStore<GameMessage>('game-sync');

export function useGameSync() {
  const { broadcast, subscribe } = useSyncStore();

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'START') {
        console.log('Game started at', message.timestamp);
      }
    });
    return unsubscribe;
  }, [subscribe]);

  return { broadcast };
}
```

---

## 6. Success Criteria Checklist

Use this checklist when creating or updating READMEs:

### Required Elements
- [ ] Status badge present in format: `**Status:** [Emoji] [Label] ([Percentage]% Complete)`
- [ ] Status percentage is realistic and matches implementation state
- [ ] Description clearly states purpose in 1-2 sentences
- [ ] All required sections are present (13 for apps, 10-12 for packages)

### Code Quality
- [ ] Minimum 3 working examples for packages (1 for apps)
- [ ] All code blocks have language identifiers (```typescript, ```tsx, ```bash)
- [ ] Examples use real package names (e.g., `@joolie-boolie/ui`, not `../ui`)
- [ ] Examples are copy-pasteable and complete

### Consistency
- [ ] Uses standard terminology from Section 4.1
- [ ] Heading hierarchy is correct (no skipped levels)
- [ ] Cross-references use relative paths
- [ ] No generic boilerplate (e.g., "Getting Started", "Contributing")

### Accuracy
- [ ] Integration Status table is current
- [ ] Known Issues are honest and up-to-date
- [ ] Environment variables are documented
- [ ] Related Documentation links are valid

---

## 7. CLAUDE.md Coordination

### What to Extract to README

Move these sections from CLAUDE.md to README:

**Always Extract:**
- Package/app description and purpose
- Status badges and completion percentages
- Public API documentation
- Usage examples for external consumers
- Installation instructions
- Integration status with other packages

**Often Extract:**
- High-level architecture explanations
- Environment variable documentation
- Keyboard shortcuts
- Known limitations visible to users

### What to Keep in CLAUDE.md

Keep these sections in CLAUDE.md only:

**Always Keep:**
- AI assistant-specific instructions
- Detailed implementation context
- Internal code patterns and conventions
- Testing strategies and internal APIs
- Historical decisions and rationale
- Monorepo-wide coordination instructions

**Often Keep:**
- Game mechanics details (e.g., 15 sample trivia questions)
- Detailed state machine diagrams
- Internal folder structure explanations
- Development workflow nuances
- Package version coordination

### Cross-Referencing Pattern

**In README:**
```markdown
## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed context for AI assistants
- [Testing Guide](../../docs/TESTING.md)
```

**In CLAUDE.md:**
```markdown
# CLAUDE.md

> **Note:** For public API documentation, see [README.md](./README.md).

## Internal Context

[AI-specific instructions here]
```

### Coordination Guidelines

1. **No Duplication:** Don't copy the same content to both files
2. **README is Public:** Write README for external developers
3. **CLAUDE.md is Internal:** Write CLAUDE.md for AI assistants and core team
4. **Link Bidirectionally:** Both files should reference each other
5. **Update Together:** When making significant changes, review both files

---

## 8. Verification Commands

### 8.1 Check for Boilerplate

Find READMEs with generic or boilerplate content:

```bash
# From repository root

# Check for generic "Getting Started" sections
grep -r "## Getting Started" apps/*/README.md packages/*/README.md

# Check for "Contributing" sections (we use PR template instead)
grep -r "## Contributing" apps/*/README.md packages/*/README.md

# Check for missing status badges
for file in apps/*/README.md packages/*/README.md; do
  if ! grep -q "^\*\*Status:\*\*" "$file"; then
    echo "Missing status badge: $file"
  fi
done

# Check for incorrect heading hierarchy (H1 followed by H3)
for file in apps/*/README.md packages/*/README.md; do
  if awk '/^# / { h1=NR } /^### / { if (NR == h1+2) print FILENAME": Line "NR" - H3 after H1 (missing H2)" }' "$file" | grep .; then
    echo "Heading hierarchy issue in $file"
  fi
done
```

### 8.2 Check for Status Badges

Verify all READMEs have status badges:

```bash
# List all READMEs without status badges
for file in apps/*/README.md packages/*/README.md; do
  if ! grep -q "^\*\*Status:\*\*" "$file"; then
    echo "❌ Missing: $file"
  else
    echo "✅ Present: $file"
  fi
done
```

### 8.3 Check Code Block Language Identifiers

Find code blocks without language identifiers:

```bash
# Check for code blocks without language identifiers
for file in apps/*/README.md packages/*/README.md; do
  # Look for ``` without a language identifier
  if grep -n "^\`\`\`$" "$file" > /dev/null; then
    echo "⚠️  $file has code blocks without language identifiers:"
    grep -n "^\`\`\`$" "$file"
  fi
done
```

### 8.4 Link Verification

Check for broken internal links:

```bash
# Basic link check (manual verification required)
for file in apps/*/README.md packages/*/README.md; do
  echo "Checking links in $file"

  # Extract markdown links
  grep -o '\[.*\](\..*\.md)' "$file" | while read -r link; do
    # Extract path from [text](path)
    path=$(echo "$link" | sed 's/.*](\(.*\))/\1/')

    # Convert to absolute path
    dir=$(dirname "$file")
    target="$dir/$path"

    if [ ! -f "$target" ]; then
      echo "  ❌ Broken link: $link"
    fi
  done
done
```

### 8.5 Comprehensive Verification Script

Create a verification script:

```bash
#!/bin/bash
# verify-readmes.sh

echo "=== README Verification ==="
echo

errors=0

# Check 1: Status badges
echo "Checking for status badges..."
for file in apps/*/README.md packages/*/README.md; do
  if ! grep -q "^\*\*Status:\*\*" "$file"; then
    echo "❌ Missing status badge: $file"
    ((errors++))
  fi
done
echo

# Check 2: Code block language identifiers
echo "Checking for code block language identifiers..."
for file in apps/*/README.md packages/*/README.md; do
  if grep -n "^\`\`\`$" "$file" > /dev/null; then
    echo "❌ Code blocks without language identifiers in: $file"
    ((errors++))
  fi
done
echo

# Check 3: Boilerplate sections
echo "Checking for boilerplate sections..."
if grep -r "## Contributing" apps/*/README.md packages/*/README.md > /dev/null; then
  echo "⚠️  Found 'Contributing' sections (should use PR template instead)"
  grep -r "## Contributing" apps/*/README.md packages/*/README.md
fi
echo

# Summary
echo "=== Summary ==="
if [ $errors -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "❌ Found $errors issue(s)"
  exit 1
fi
```

Make it executable:
```bash
chmod +x verify-readmes.sh
```

Run from repository root:
```bash
./verify-readmes.sh
```

---

## 9. README Maintenance Workflow

### When Creating a New Package

1. Copy template from this document (Section 3.2)
2. Fill in all required sections
3. Add status badge based on implementation state
4. Include minimum 3 code examples
5. Run verification script
6. Link to CLAUDE.md if it exists

### When Creating a New App

1. Copy template from this document (Section 3.1)
2. Fill in all required sections
3. Add status badge based on implementation state
4. Document all environment variables
5. Document keyboard shortcuts if applicable
6. Run verification script
7. Link to CLAUDE.md

### When Updating Existing READMEs

1. Check status badge accuracy
2. Update Integration Status table
3. Update Known Issues & Limitations
4. Verify all code examples still work
5. Check for new features to document
6. Run verification script

### Quarterly README Audit

Schedule quarterly audits to ensure READMEs stay current:

```bash
# Create audit checklist
# Q1 2026 README Audit Checklist

## All READMEs
- [ ] Status badges reflect current state
- [ ] Integration status tables are accurate
- [ ] Known issues are current
- [ ] Code examples work with latest versions
- [ ] Links are valid

## App READMEs
- [ ] Environment variables are complete
- [ ] Keyboard shortcuts are documented
- [ ] Architecture section matches implementation

## Package READMEs
- [ ] API reference matches exports
- [ ] Examples use latest API patterns
- [ ] Integration status is accurate
```

---

## 10. Examples and Templates

### 10.1 Complete App README Template

```markdown
# App Name

**Status:** ✅ Production Ready (95% Complete)

One paragraph description of what this app does and who it's for.

## Features

### Category 1
- Feature 1
- Feature 2

### Category 2
- Feature 3
- Feature 4

## Quick Start

\`\`\`bash
# From repository root
pnpm install
pnpm dev:appname

# Open in browser
# Presenter: http://localhost:3000/play
# Audience: http://localhost:3000/display
\`\`\`

## Architecture

### BFF Pattern
Description of API routes pattern.

### Dual-Screen System
Description of sync system.

### State Management
Description of Zustand/engine pattern.

## Environment Variables

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Session Token
SESSION_TOKEN_SECRET=
\`\`\`

## Development Workflow

\`\`\`bash
pnpm dev
pnpm test
pnpm lint
\`\`\`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Action |

## Shared Packages

This app uses:
- **@joolie-boolie/package1** - Description
- **@joolie-boolie/package2** - Description

## Integration Status

| Feature | Status | Notes |
|---------|--------|-------|
| Feature 1 | ✅ Complete | Notes |
| Feature 2 | ⚠️ Partial | Notes |

## Known Issues & Limitations

- Issue 1
- Issue 2

## Future Work

- [ ] Item 1
- [ ] Item 2

## Related Documentation

- [CLAUDE.md](./CLAUDE.md)
- [Package READMEs](../../packages/)
```

### 10.2 Complete Package README Template

```markdown
# @joolie-boolie/package-name

**Status:** ✅ Production Ready (100% Complete)

One paragraph description of what this package does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`json
{
  "dependencies": {
    "@joolie-boolie/package-name": "workspace:*"
  }
}
\`\`\`

\`\`\`bash
pnpm install
\`\`\`

## Quick Start

\`\`\`typescript
import { Thing } from '@joolie-boolie/package-name';

// Minimal example
const thing = new Thing();
\`\`\`

## Usage

### Example 1: Basic Usage

\`\`\`typescript
// Complete working example
\`\`\`

### Example 2: Common Pattern

\`\`\`typescript
// Complete working example
\`\`\`

### Example 3: Advanced

\`\`\`typescript
// Complete working example
\`\`\`

## API Reference

### \`functionName(param: Type): ReturnType\`

Description of function.

**Parameters:**
- \`param\` - Description

**Returns:** Description

**Example:**
\`\`\`typescript
const result = functionName('value');
\`\`\`

## Integration Status

| App | Status | Notes |
|-----|--------|-------|
| App 1 | ✅ Integrated | Notes |
| App 2 | ❌ Not needed | Reason |

## Design Philosophy

Explanation of key design decisions.

## Related Packages

- **@joolie-boolie/related1** - Description
- **@joolie-boolie/related2** - Description

## Related Documentation

- [Documentation 1](../../docs/DOC.md)
- [Documentation 2](../../docs/DOC2.md)
```

---

## 11. FAQ

### Q: Should I include installation instructions for monorepo packages?

**A:** Yes, but make it clear it's a workspace package. Show the `package.json` entry with `workspace:*` protocol.

### Q: How detailed should API Reference sections be?

**A:** Include TypeScript signatures, parameter descriptions, return types, and at least one example per function. For complex APIs, link to separate API documentation.

### Q: When should I split a README into multiple documents?

**A:** If your README exceeds 500 lines or needs more than 4 heading levels (####), split it. Create a `/docs` folder in the package/app and link to detailed guides.

### Q: Should READMEs include commit history or changelog?

**A:** No. Git history serves this purpose. Keep READMEs focused on current state.

### Q: How do I handle screenshots and diagrams?

**A:** Store images in `/docs/images/` or `/.github/images/`. Use relative paths in READMEs. Always include alt text for accessibility.

### Q: What if my package has no React integration?

**A:** Omit React-specific examples. Focus on pure TypeScript/JavaScript usage. The Design Philosophy section can explain why it's framework-agnostic.

### Q: Should I document internal functions in the README?

**A:** No. README API Reference should only cover public exports. Document internal functions with JSDoc comments in the code.

---

## 12. Enforcement

### Pull Request Reviews

Reviewers should check:
- Status badge is present and accurate
- Required sections are complete
- Code examples have language identifiers
- Cross-references use relative paths
- No boilerplate content

### Automated Checks

Consider adding to CI pipeline:
```yaml
# .github/workflows/docs-lint.yml
name: Documentation Lint
on: [pull_request]
jobs:
  lint-readmes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check README standards
        run: ./scripts/verify-readmes.sh
```

### README Review Checklist

Add to `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Documentation
- [ ] README updated (if adding/modifying features)
- [ ] Status badge is accurate
- [ ] Code examples have language identifiers
- [ ] No boilerplate content (Contributing, Getting Started)
- [ ] Cross-references use relative paths
```

---

## Appendix A: Status Badge Decision Tree

Use this decision tree to determine the correct status badge:

```
Is the code implemented?
├─ No → ❌ Planned (0-9%)
└─ Yes
   └─ Does it work in production?
      ├─ No
      │  └─ Is core functionality complete?
      │     ├─ No → ⚠️ Partial (10-39%)
      │     └─ Yes → 🚧 In Progress (40-84%)
      └─ Yes
         └─ Are all planned features done?
            ├─ Missing 2+ major features → ✅ Production Ready (85-94%)
            └─ Missing 0-1 minor feature → ✅ Production Ready (95-100%)
```

---

## Appendix B: Terminology Migration Guide

When updating old READMEs, replace these terms:

| Old Term | New Term | Search Command |
|----------|----------|----------------|
| Host view | Presenter view | `grep -r "Host view" apps/` |
| Control panel | Presenter view | `grep -r "Control panel" apps/` |
| Display view | Audience view | `grep -r "Display view" apps/` |
| Player view | Audience view | `grep -r "Player view" apps/` |
| Game logic | Game engine | `grep -r "Game logic" apps/` |
| State store | Zustand store | `grep -r "State store" apps/` |
| API layer | BFF | `grep -r "API layer" apps/` |

Run these commands from repository root to find instances that need updating.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-21 | Initial standards document |

---

## Acknowledgments

This standards document was created based on:
- Analysis of existing Joolie Boolie READMEs
- Best practices from the monorepo community
- Accessible design requirements
- Feedback from AI assistant integration (Claude Code)

For questions or suggestions about these standards, open an issue or PR in the repository.
