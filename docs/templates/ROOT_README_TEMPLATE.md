<!--
┌──────────────────────────────────────────────────────────────────────────────┐
│                       ROOT README TEMPLATE                                   │
│                                                                              │
│ PURPOSE: Reference template for monorepo root README.md                     │
│                                                                              │
│ WHEN TO USE:                                                                │
│   - Creating a new monorepo from scratch                                    │
│   - Reference for what sections to include in root README                   │
│   - Standardizing root README structure                                     │
│                                                                              │
│ NOTE: This is more of a REFERENCE than a fill-in template                   │
│       The root README is unique to each project and requires                │
│       custom content. Use this as a guide for structure and sections.       │
│                                                                              │
│ INSTRUCTIONS:                                                                │
│   1. Review the structure and sections below                                │
│   2. Adapt the content to your specific monorepo                            │
│   3. Replace placeholders with your project details                         │
│   4. Keep the general structure but customize all content                   │
│   5. This is a living document - update as the project evolves              │
│                                                                              │
│ KEY SECTIONS TO INCLUDE:                                                     │
│   1. Project Title & Description                                            │
│   2. Current Status Table (apps & packages with completion %)              │
│   3. Features (high-level, organized by app)                                │
│   4. Tech Stack                                                              │
│   5. Project Structure (with links to READMEs)                              │
│   6. Getting Started (installation, dev commands, URLs)                     │
│   7. Environment Variables                                                   │
│   8. Deployment Instructions (if applicable)                                │
│   9. Performance Monitoring (if applicable)                                 │
│  10. Keyboard Shortcuts (if applicable)                                     │
│  11. Design Principles                                                       │
│  12. Documentation Links                                                     │
│  13. Contributing                                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
-->

# [PROJECT_NAME]

<!--
  PROJECT DESCRIPTION:
  - Write 1-2 sentences about what the project is
  - Mention the target audience or use case
  - Keep it high-level and accessible
-->
[High-level description of the monorepo and its purpose]

## Current Status

<!--
  STATUS TABLE INSTRUCTIONS:
  - Create a table showing ALL apps and packages
  - Include status emoji (✅ complete, 🚧 in progress, ⚠️ partial)
  - Show completion percentage
  - Add brief description
  - Link to each README
  - Keep this table updated regularly
  - Order by importance or logical grouping
-->

| App/Package | Status | Completion | Description |
|-------------|--------|------------|-------------|
| **[App Name](./apps/[app]/README.md)** | ✅ Production Ready | 85% | [Brief description] |
| **[App Name](./apps/[app]/README.md)** | 🚧 Scaffolded | 10% | [Brief description] |
| **[@org/package](./packages/[package]/README.md)** | ✅ Complete | 100% | [Brief description] |
| **[@org/package](./packages/[package]/README.md)** | ⚠️ Partial | 40% | [Brief description] |

## Features

<!--
  FEATURES INSTRUCTIONS:
  - Organize features by app/package
  - Keep descriptions brief (1-2 lines each)
  - Use bullet points
  - Highlight key differentiators
  - This is a high-level overview, details go in app READMEs
-->

### [App Name 1]
- [Key feature 1]
- [Key feature 2]
- [Key feature 3]

### [App Name 2]
- [Key feature 1]
- [Key feature 2]
- [Key feature 3]

### [App Name 3]
- [Key feature 1]
- [Key feature 2]

## Tech Stack

<!--
  TECH STACK INSTRUCTIONS:
  - List the common technologies used across the monorepo
  - Group by category
  - Include version numbers for major dependencies
  - Keep this high-level, app-specific tech goes in app READMEs
-->

- **Monorepo:** [Tool name + version]
- **Framework:** [Framework name + version]
- **Frontend:** [Libraries + versions]
- **State:** [State management libraries]
- **Database:** [Database solution]
- **Testing:** [Test frameworks]
- **PWA:** [PWA solution]
- **Hosting:** [Hosting platform]

## Project Structure

<!--
  PROJECT STRUCTURE INSTRUCTIONS:
  - Show the high-level directory structure
  - Link to README for each app/package
  - Use ASCII tree format
  - Include brief inline comments
  - Keep this up to date as structure changes
-->

```
[project-name]/
├── apps/
│   ├── [app-1]/           # [Brief description] (port XXXX) - See README: apps/[app-1]/README.md
│   ├── [app-2]/           # [Brief description] (port XXXX) - See README: apps/[app-2]/README.md
│   └── [app-3]/           # [Brief description] (port XXXX) - See README: apps/[app-3]/README.md
├── packages/
│   ├── [package-1]/       # [Brief description] - See README: packages/[package-1]/README.md
│   ├── [package-2]/       # [Brief description] - See README: packages/[package-2]/README.md
│   └── [package-3]/       # [Brief description] - See README: packages/[package-3]/README.md
└── [other-dirs]/          # [Brief description]
```

**Quick Links:**
- **Apps:** [[App 1]](./apps/[app-1]/README.md) • [[App 2]](./apps/[app-2]/README.md) • [[App 3]](./apps/[app-3]/README.md)
- **Packages:** [[package-1]](./packages/[package-1]/README.md) • [[package-2]](./packages/[package-2]/README.md) • [[package-3]](./packages/[package-3]/README.md)

## Getting Started

### Prerequisites

<!--
  PREREQUISITES INSTRUCTIONS:
  - List required software and versions
  - Include any accounts/services needed
  - Be specific about versions
-->

- Node.js 18+ (or specify minimum version)
- [Package manager] [version]+
- [External service] account (for [purpose])

### Installation

```bash
# Clone the repository
git clone https://github.com/[org]/[project-name].git
cd [project-name]

# Install dependencies
[install command]

# Set up environment variables
cp .env.example .env.local
cp apps/[app]/.env.example apps/[app]/.env.local
# ... repeat for each app

# Edit each .env.local with your [service] credentials
```

### Development

```bash
[command]              # Run all apps
[command]:[app1]       # Run [app1] only (port XXXX)
[command]:[app2]       # Run [app2] only (port XXXX)
[command]:[app3]       # Run [app3] only (port XXXX)
```

### Open the Apps

<!--
  APP URLs INSTRUCTIONS:
  - Create a table with app names, ports, and key routes
  - Include both presenter and audience views if applicable
  - Use consistent formatting
-->

| App | Presenter View | Audience View |
|-----|----------------|---------------|
| [App 1] | http://localhost:XXXX/[route] | http://localhost:XXXX/[route] |
| [App 2] | http://localhost:XXXX/[route] | http://localhost:XXXX/[route] |
| [App 3] | http://localhost:XXXX | - |

### Testing

```bash
[command]             # Run all tests in watch mode
[command]             # Single run
[command]             # With coverage report
```

### Building

```bash
[command]            # Build all apps and packages
[command]            # Lint all apps and packages
[command]            # Type check all apps and packages
[command]            # Clean all build artifacts
```

## Environment Variables

<!--
  ENVIRONMENT VARIABLES INSTRUCTIONS:
  - List variables required across ALL apps
  - Use tables for organization
  - Separate required and optional variables
  - Include brief descriptions
-->

### Required for All Apps

| Variable | Description |
|----------|-------------|
| `[VARIABLE_NAME]` | [Brief description] |
| `[VARIABLE_NAME]` | [Brief description] |
| `[VARIABLE_NAME]` | [Brief description] |

### Optional (for CI/CD)

| Variable | Description |
|----------|-------------|
| `[VARIABLE_NAME]` | [Brief description] |
| `[VARIABLE_NAME]` | [Brief description] |

---

## Deployment to [Platform] (OPTIONAL)

<!--
  DEPLOYMENT INSTRUCTIONS:
  - Only include if you have deployment setup
  - Provide step-by-step instructions
  - Include prerequisites
  - Show environment variable configuration
  - Include troubleshooting section
  - Delete this entire section if not applicable
-->

This monorepo is configured for deployment to [Platform] with each app deployed as a separate project.

### Quick Start

1. **Connect Repository:** [Instructions]
2. **Create Projects:** [Instructions]
3. **Configure:** [Instructions]
4. **Deploy:** [Instructions]

### Step-by-Step Deployment

#### 1. Prerequisites

- [Platform] account
- [Repository host] repository connected to [Platform]
- [External service] project with credentials

#### 2. Deploy [App 1]

[Detailed step-by-step instructions specific to your platform]

### Custom Domains (OPTIONAL)

[Instructions for setting up custom domains]

Recommended domain structure:
- `[domain]` - [Purpose]
- `[subdomain].[domain]` - [Purpose]
- `[subdomain].[domain]` - [Purpose]

### Deployment Architecture (OPTIONAL)

```
[ASCII diagram showing deployment architecture]
```

### Automatic Deployments (OPTIONAL)

[Explanation of automatic deployment setup]

### Troubleshooting (OPTIONAL)

#### [Common Issue 1]
[Solution]

#### [Common Issue 2]
[Solution]

---

## Keyboard Shortcuts (OPTIONAL)

<!--
  KEYBOARD SHORTCUTS INSTRUCTIONS:
  - Only include if apps have keyboard shortcuts
  - Organize by app
  - Use consistent table format
  - Delete this section if not applicable
-->

### [App 1] (Presenter View)

| Key | Action |
|-----|--------|
| [Key] | [Action] |
| [Key] | [Action] |

### [App 2] (Presenter View)

| Key | Action |
|-----|--------|
| [Key] | [Action] |
| [Key] | [Action] |

---

## Performance Monitoring (OPTIONAL)

<!--
  PERFORMANCE MONITORING INSTRUCTIONS:
  - Only include if you have performance monitoring setup
  - Document bundle analysis tools
  - Document Lighthouse CI setup
  - Include performance budgets
  - Show how to integrate with CI
  - Delete this section if not applicable
-->

[Description of performance monitoring capabilities]

### Bundle Analysis

```bash
# Analyze all apps
[command]

# Analyze specific app
[command]:[app]
```

### Lighthouse CI

```bash
# Run on all apps
[command]

# Run on specific app
[command]:[app]
```

### Performance Budgets

[Table or description of performance targets]

### CI Integration

```yaml
# Example CI configuration
```

---

## Design Principles

<!--
  DESIGN PRINCIPLES INSTRUCTIONS:
  - List high-level design principles for the entire project
  - Keep these relevant to all apps
  - Use bullet points
  - Be specific about accessibility requirements
-->

- **[Principle 1]:** [Description]
- **[Principle 2]:** [Description]
- **[Principle 3]:** [Description]
- **[Principle 4]:** [Description]

## Documentation

<!--
  DOCUMENTATION INSTRUCTIONS:
  - Organize documentation links by category
  - Use tables for clarity
  - Link to all major documentation files
  - Keep paths relative
-->

### App Documentation

Each app has comprehensive documentation in its directory:

| App | README | AI Context (CLAUDE.md) |
|-----|--------|------------------------|
| **[App 1]** | [apps/[app]/README.md](./apps/[app]/README.md) | [apps/[app]/CLAUDE.md](./apps/[app]/CLAUDE.md) |
| **[App 2]** | [apps/[app]/README.md](./apps/[app]/README.md) | [apps/[app]/CLAUDE.md](./apps/[app]/CLAUDE.md) |

### Package Documentation

Each shared package has API documentation:

| Package | README | Description |
|---------|--------|-------------|
| **[@org/package](./packages/[package]/README.md)** | [README](./packages/[package]/README.md) | [Brief description] |
| **[@org/package](./packages/[package]/README.md)** | [README](./packages/[package]/README.md) | [Brief description] |

### Other Documentation

- **[CLAUDE.md](./CLAUDE.md)** - AI assistant guidance and monorepo overview
- **[.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md)** - Pull request template (required for all PRs)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** (OPTIONAL) - Development workflow, code style, PR process

## Contributing

<!--
  CONTRIBUTING INSTRUCTIONS:
  - Link to CONTRIBUTING.md if you have one
  - Or provide brief guidelines here
  - Mention code style, PR process, etc.
-->

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, code style guidelines, and PR process.

## License (OPTIONAL)

<!--
  LICENSE INSTRUCTIONS:
  - Include if relevant
  - Link to LICENSE file if you have one
  - Or state the license type
  - Delete if not applicable
-->

[License information]
