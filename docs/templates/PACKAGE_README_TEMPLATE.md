<!--
┌──────────────────────────────────────────────────────────────────────────────┐
│                      PACKAGE README TEMPLATE                                 │
│                                                                              │
│ PURPOSE: Template for package READMEs (packages/database, packages/ui, etc.)│
│                                                                              │
│ WHEN TO USE:                                                                │
│   - Creating a new shared package in the packages/ directory                │
│   - Standardizing existing package READMEs                                  │
│                                                                              │
│ INSTRUCTIONS:                                                                │
│   1. Copy this entire file to your package directory as README.md           │
│   2. Replace ALL placeholders in [BRACKETS] with actual values              │
│   3. Remove sections marked as (OPTIONAL) if not applicable                 │
│   4. Delete this instruction block before committing                        │
│                                                                              │
│ PLACEHOLDERS TO REPLACE:                                                     │
│   [PACKAGE_NAME]       - NPM package name without @ (e.g., "database")      │
│   [@joolie-boolie/FULL]  - Full package name (e.g., "@joolie-boolie/database") │
│   [STATUS]             - Current status (e.g., "✅ Complete (98%)")         │
│   [DESCRIPTION]        - 1-2 sentence description of package purpose        │
│   [EXPORT_NAME]        - Replace with actual export names                   │
│   [FEATURE_NAME]       - Replace with actual feature names                  │
│   [TYPE_NAME]          - Replace with actual type names                     │
│   [FUNCTION_NAME]      - Replace with actual function names                 │
│   [CONSTANT_NAME]      - Replace with actual constant names                 │
│                                                                              │
│ REQUIRED SECTIONS (Do not delete):                                          │
│   1. Title & Status Badge                                                   │
│   2. Features                                                                │
│   3. Installation                                                            │
│   4. Quick Start                                                             │
│   5. API Reference                                                           │
│   6. Environment Variables (if applicable)                                  │
│   7. Usage in Apps                                                           │
│   8. Integration Status                                                      │
│   9. Remaining Work (if not 100%)                                            │
│  10. Related Packages                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
-->

# [@joolie-boolie/FULL]

**Status:** [STATUS]

<!--
  DESCRIPTION INSTRUCTIONS:
  - Write 1-2 sentences describing what this package does
  - Explain the problem it solves
  - Mention key capabilities or use cases
  - Example: "Comprehensive type-safe database utilities for the Joolie Boolie.
    Provides Supabase client wrappers, CRUD helpers, React hooks, pagination, filtering,
    and table-specific utilities."
-->
[DESCRIPTION]

## Features

<!--
  FEATURES INSTRUCTIONS:
  - List ALL major features with checkboxes (✅ complete, 🚧 in progress)
  - Group by category if needed
  - Be specific about capabilities
  - Mention export count if high (e.g., "150+ exports")
  - Order by importance/usage frequency
-->

- ✅ [Feature description]
- ✅ [Feature description]
- ✅ [Feature description]
- ✅ [Export count] (e.g., "150+ exports")

## Installation

```json
{
  "dependencies": {
    "[@joolie-boolie/FULL]": "workspace:*"
  }
}
```

<!--
  INSTALLATION INSTRUCTIONS:
  - Keep the workspace:* protocol for monorepo packages
  - Add any peer dependencies if required
  - Mention any post-install steps if needed
-->

## Quick Start

<!--
  QUICK START INSTRUCTIONS:
  - Provide 3-5 practical code examples
  - Show the most common use cases
  - Progress from simple to more complex
  - Include import statements
  - Add brief comments explaining what each example does
  - Use TypeScript with type annotations
-->

### 1. [Common Use Case 1]

```typescript
import { [EXPORT_NAME] } from '[@joolie-boolie/FULL]';

// [Brief description of what this example demonstrates]
const example = [EXPORT_NAME]();
```

### 2. [Common Use Case 2]

```typescript
import { [EXPORT_NAME] } from '[@joolie-boolie/FULL]';

// [Brief description of what this example demonstrates]
const result = await [EXPORT_NAME]({
  // parameters
});
```

### 3. [Common Use Case 3]

```typescript
import { [EXPORT_NAME] } from '[@joolie-boolie/FULL]';

// [Brief description of what this example demonstrates]
function Component() {
  const { data, isLoading } = [EXPORT_NAME]();

  if (isLoading) return <div>Loading...</div>;
  return <div>{data}</div>;
}
```

### 4. [Common Use Case 4]

```typescript
import { [EXPORT_NAME] } from '[@joolie-boolie/FULL]';

// [Brief description of what this example demonstrates]
const config = {
  // configuration options
};
```

## API Reference

<!--
  API REFERENCE INSTRUCTIONS:
  - Organize exports by category (Types, Functions, Constants, Hooks, etc.)
  - List ALL public exports
  - Include brief descriptions for each export
  - Use code blocks for function signatures
  - Provide examples for complex APIs
  - Link to TypeScript types where relevant

  SUGGESTED ORGANIZATION:
  1. Types (if type-only package)
  2. Core functions/utilities
  3. React hooks (if applicable)
  4. Constants
  5. Helper utilities
-->

### [Category 1: e.g., Client]

```typescript
import {
  [EXPORT_NAME],           // [Brief description]
  [EXPORT_NAME],           // [Brief description]
  [EXPORT_NAME],           // [Brief description]
} from '[@joolie-boolie/FULL]';
```

### [Category 2: e.g., Types]

<!--
  TYPES SECTION INSTRUCTIONS:
  - List all exported types and interfaces
  - Include brief descriptions
  - Show type signatures for complex types
  - Provide usage examples
-->

Full TypeScript support for [description]:

```typescript
import type {
  [TYPE_NAME],              // [Brief description]
  [TYPE_NAME],              // [Brief description]
  [TYPE_NAME],              // [Brief description]
} from '[@joolie-boolie/FULL]';
```

### [Category 3: e.g., Core Functions]

<!--
  FUNCTIONS SECTION INSTRUCTIONS:
  - List all exported functions
  - Group related functions together
  - Include brief descriptions
  - Show function signatures for key functions
  - Provide examples for complex functions
-->

```typescript
import {
  [FUNCTION_NAME],      // [Brief description]
  [FUNCTION_NAME],      // [Brief description]
  [FUNCTION_NAME],      // [Brief description]
} from '[@joolie-boolie/FULL]';
```

**Example:**
```typescript
// [Example showing how to use key functions]
const result = await [FUNCTION_NAME](param1, param2, {
  option1: value1,
  option2: value2,
});
```

### [Category 4: e.g., React Hooks] (OPTIONAL)

```typescript
import {
  // [Hook category description]
  [EXPORT_NAME],              // [Brief description]
  [EXPORT_NAME],              // [Brief description]

  // [Hook category description]
  [EXPORT_NAME],           // [Brief description]
  [EXPORT_NAME],           // [Brief description]
} from '[@joolie-boolie/FULL]';
```

### [Category 5: e.g., Constants] (OPTIONAL)

```typescript
import {
  [CONSTANT_NAME],         // [Brief description and value]
  [CONSTANT_NAME],         // [Brief description and value]
  [CONSTANT_NAME],         // [Brief description and value]
} from '[@joolie-boolie/FULL]';
```

### [Category 6: e.g., Helper Utilities] (OPTIONAL)

```typescript
import {
  [EXPORT_NAME],            // [Brief description]
  [EXPORT_NAME],           // [Brief description]
  [EXPORT_NAME],        // [Brief description]
  type [TYPE_NAME],         // [Brief description]
} from '[@joolie-boolie/FULL]';
```

**Example:**
```typescript
// [Example showing utility usage]
const filtered = applyFilter(query, [
  { field: 'user_id', operator: 'eq', value: userId },
]);
```

## Environment Variables (OPTIONAL)

<!--
  ENVIRONMENT VARIABLES INSTRUCTIONS:
  - Only include this section if the package requires environment variables
  - List all required and optional variables
  - Provide examples and generation instructions
  - Delete this section if not applicable
-->

Required environment variables:

```env
[VARIABLE_NAME]=[description]
[VARIABLE_NAME]=[description]
[VARIABLE_NAME]=[description]  # [Generation instruction if needed]
```

## Usage in Apps

<!--
  USAGE INSTRUCTIONS:
  - Show how to use the package in different contexts
  - Include examples for Client Components, Server Components, API Routes
  - Provide realistic, copy-paste ready examples
  - Adjust sections based on package type (some may only need one section)
-->

### Client Components

```tsx
import { [EXPORT_NAME], [EXPORT_NAME] } from '[@joolie-boolie/FULL]';

function ComponentName() {
  // [Brief description of what this component demonstrates]
  const { data, isLoading } = [EXPORT_NAME]();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {data?.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### Server Components (OPTIONAL)

```tsx
import { [EXPORT_NAME], [EXPORT_NAME] } from '[@joolie-boolie/FULL]';

async function ComponentName() {
  // [Brief description of what this component demonstrates]
  const data = await [EXPORT_NAME]();

  if (!data) return <div>Not found</div>;

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

### API Routes (OPTIONAL)

```tsx
// app/api/[route]/route.ts
import { [EXPORT_NAME], [EXPORT_NAME] } from '[@joolie-boolie/FULL]';
import { NextResponse } from 'next/server';

export async function GET() {
  // [Brief description of what this route does]
  const data = await [EXPORT_NAME]();

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  // [Brief description of what this route does]
  const body = await request.json();
  const result = await [EXPORT_NAME](body);

  return NextResponse.json({ result });
}
```

## Integration Status

<!--
  INTEGRATION STATUS INSTRUCTIONS:
  - Create a table showing which apps/packages use this package
  - Use ✅ for active, ⚠️ for partial, ❌ for not integrated
  - Include brief notes about usage
  - Keep this updated as integration progresses
-->

| App/Package | Status | Usage |
|-------------|--------|-------|
| `apps/[APP_NAME]` | ✅ Active | [Brief description of how it's used] |
| `apps/[APP_NAME]` | ⚠️ Partial | [Brief description of status] |
| `apps/[APP_NAME]` | ❌ N/A | [Brief explanation why not applicable] |
| `packages/[PACKAGE_NAME]` | ✅ Active | [Brief description of how it's used] |

## Remaining Work (X%) (OPTIONAL)

<!--
  REMAINING WORK INSTRUCTIONS:
  - Only include this section if package is not 100% complete
  - List specific tasks that need to be completed
  - Use checkboxes for tracking
  - Delete this section if package is 100% complete
-->

- [ ] [Specific task or feature to implement]
- [ ] [Specific task or feature to implement]
- [ ] [Specific task or feature to implement]

## Related Packages (OPTIONAL)

<!--
  RELATED PACKAGES INSTRUCTIONS:
  - List packages that are commonly used alongside this one
  - Include brief descriptions of why they're related
  - Use bullet points with package names
  - Delete this section if there are no closely related packages
-->

- `[@joolie-boolie/PACKAGE_NAME]` - [Brief description of relationship]
- `[external-package-name]` - [Brief description of relationship]

## Design Philosophy (OPTIONAL)

<!--
  DESIGN PHILOSOPHY INSTRUCTIONS:
  - Include this section for foundational packages (types, theme, etc.)
  - Explain key design decisions and principles
  - Use numbered headings for different principles
  - Include code examples to illustrate principles
  - Delete this section for utility packages
-->

### 1. [Principle Name]
[Explanation of the principle and why it's important]

### 2. [Principle Name]
[Explanation of the principle and why it's important]

```typescript
// Example illustrating the principle
```

### 3. [Principle Name]
[Explanation of the principle and why it's important]

## Related Documentation (OPTIONAL)

<!--
  RELATED DOCUMENTATION INSTRUCTIONS:
  - Link to other relevant documentation files
  - Use absolute paths from repo root
  - Include brief descriptions
  - Only include if there are relevant related docs
-->

- **[Doc Name]**: `/Users/j/repos/joolie-boolie-platform/[path]/README.md` - [Brief description]
- **Main CLAUDE.md**: `/Users/j/repos/joolie-boolie-platform/CLAUDE.md` - [Brief description]

## Development (OPTIONAL)

<!--
  DEVELOPMENT INSTRUCTIONS:
  - Include this section if the package has special dev considerations
  - Explain how to add new features or types
  - Provide examples of the development workflow
  - Delete this section if there's nothing special about development
-->

### Adding New [Exports/Types/Features]

1. [Step-by-step instructions]
2. [Example code]
3. [Additional notes]

### Testing [Type/Feature] Exports

```bash
# [Commands for testing or verifying]
pnpm typecheck
pnpm build
```
