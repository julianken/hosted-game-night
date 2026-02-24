# Linear Integration Guide

## Overview

This guide explains how the Joolie Boolie integrates with Linear for product management and issue tracking.

## Integration Methods

### 1. Linear MCP Server (Claude Code)

The official Linear MCP server enables AI-assisted development workflows.

#### Setup

```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

After adding the server, run `/mcp` in a Claude Code session to complete OAuth authentication.

#### Features

- 21+ specialized tools for Linear project management
- Create, update, and find issues, projects, and comments
- OAuth 2.1 authentication with dynamic client registration
- HTTP (streamable) and SSE transport support

#### Endpoints

- **HTTP (recommended):** `https://mcp.linear.app/mcp`
- **SSE:** `https://mcp.linear.app/sse`

#### Troubleshooting

If you experience connection errors:
```bash
rm -rf ~/.mcp-auth
```

WSL users on Windows may need to specify the SSE transport endpoint.

### 2. Linear API (GraphQL)

For custom integrations in apps via Next.js API routes (BFF pattern).

#### Installation

```bash
pnpm add @linear/sdk
```

#### Authentication

```typescript
import { LinearClient } from '@linear/sdk'

// Personal API Key (for scripts)
const client = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY
})

// OAuth2 (for multi-user applications)
const client = new LinearClient({
  accessToken: accessToken
})
```

#### API Endpoint

```
POST https://api.linear.app/graphql
```

#### Example: Fetch Teams

```graphql
query Teams {
  teams {
    nodes {
      id
      name
    }
  }
}
```

#### Example: Fetch Team Issues

```graphql
query Team {
  team(id: "team-id") {
    id
    name
    issues {
      nodes {
        id
        title
        description
        assignee {
          id
          name
        }
        createdAt
      }
    }
  }
}
```

#### Example: Update Issue

```graphql
mutation IssueUpdate {
  issueUpdate(
    id: "BLA-123",
    input: {
      title: "New Issue Title"
      stateId: "state-id"
    }
  ) {
    success
    issue {
      id
      title
      state {
        id
        name
      }
    }
  }
}
```

## Linear Organizational Structure

### Hierarchy

```
Workspace (organization-level)
└── Teams (functional groups)
    ├── Issues (basic unit of work)
    ├── Projects (time-bound deliverables)
    ├── Cycles (recurring scheduling periods)
    └── Views (dynamic issue groupings)
```

### Core Concepts

**Workspace:** Contains all issues, teams, and other concepts for the organization.

**Teams:** Functional groups (e.g., Engineering, Product, Design) with independent settings for Cycles, Triage, and Workflows.

**Issues:** Fundamental building block with team-specific identifiers (e.g., "ENG-123"). Requires only title and status.

**Projects:** Group issues toward specific deliverables, can span multiple teams.

**Milestones:** Organize issues within projects to represent meaningful stages.

**Cycles:** Automated and repeating scheduling periods.

**Initiatives:** High-level planning across multiple projects.

## Monorepo Organization Strategy

### Recommended Structure for Joolie Boolie

Given our Turborepo monorepo with multiple apps (Bingo, Trivia, Platform Hub) and shared packages, here's the recommended Linear organization:

#### Team Structure

Create teams aligned with your monorepo structure:

1. **Platform Team** - Platform Hub, shared infrastructure
2. **Bingo Team** - Bingo app
3. **Trivia Team** - Trivia app
4. **Packages Team** - Shared packages (sync, ui, theme, auth, database, game-engine)
5. **DevOps Team** - CI/CD, deployment, infrastructure

Alternatively, for smaller teams, use a single team with labels:

**Joolie Boolie** (single team)
- Use labels to differentiate: `app:bingo`, `app:trivia`, `app:hub`, `pkg:sync`, `pkg:ui`, etc.

#### Label Taxonomy

Create a consistent label structure:

**Type Labels** (workspace-level - available to all teams)
- `bug` - Bug fixes
- `feature` - New functionality
- `enhancement` - Improvements to existing features
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Testing
- `chore` - Maintenance tasks

**Area Labels** (team-level)
- `app:bingo` - Bingo application
- `app:trivia` - Trivia application
- `app:hub` - Platform Hub
- `pkg:sync` - Sync package
- `pkg:ui` - UI package
- `pkg:theme` - Theme package
- `pkg:auth` - Auth package
- `pkg:database` - Database package
- `pkg:game-engine` - Game engine package
- `pkg:testing` - Testing package

**Priority Labels** (workspace-level)
- `priority:critical` - Critical issues
- `priority:high` - High priority
- `priority:medium` - Medium priority
- `priority:low` - Low priority

**Complexity Labels** (workspace-level)
- `effort:xs` - Extra small (single-line or config change)
- `effort:s` - Small (isolated change, few files)
- `effort:m` - Medium (multiple files, moderate scope)
- `effort:l` - Large (cross-package or significant scope)
- `effort:xl` - Extra large (multi-session, high dependencies)

**Feature Labels** (team-level)
- `feat:dual-screen` - Dual-screen synchronization
- `feat:audio` - Audio/TTS features
- `feat:pwa` - PWA functionality
- `feat:themes` - Theming system
- `feat:auth` - Authentication
- `feat:database` - Database operations

#### Project Organization

Use projects for major initiatives:

1. **V1.0 Launch** - Initial platform release
2. **Accessibility Improvements** - Accessible enhancements
3. **Mobile Optimization** - Touch and mobile experience
4. **New Game: Trivia** - Trivia game development
5. **New Game: Bingo** - Bingo game development
6. **Auth Integration** - Platform Hub authentication
7. **Performance Optimization** - Speed and performance

Within each project, use milestones:

**Example: V1.0 Launch**
- Milestone 1: Core Features
- Milestone 2: Testing & QA
- Milestone 3: Deployment
- Milestone 4: Documentation

#### Issue Naming Conventions

Follow this pattern for issue titles:

```
[Verb] [noun/feature] [context]
```

**Examples:**
- `Fix calendar loading bug in Bingo presenter view`
- `Add audio mute toggle to Trivia display`
- `Design onboarding flow for Platform Hub`
- `Refactor BroadcastSync class for better error handling`
- `Implement PWA offline support for Bingo`

#### Workflows

**Standard Workflow:**
1. Backlog
2. Todo
3. In Progress
4. In Review
5. Done
6. Canceled

**For Bugs:**
1. Triage
2. Todo
3. In Progress
4. In Review
5. Verified
6. Done

#### Views

Create custom views for visibility:

**Personal Views:**
- My Issues (assigned to me)
- My Reviews (PRs I need to review)
- Blocked (waiting on dependencies)

**Team Views:**
- Current Cycle
- Backlog (unscheduled)
- Bugs (type:bug, not done)
- High Priority (priority:critical OR priority:high)

**Workspace Views:**
- All Apps (app:bingo OR app:trivia OR app:hub)
- All Packages (pkg:*)
- Cross-Team Dependencies (issues with relations)

#### Cycles

Configure 2-week cycles:

- **Start:** Every other Monday
- **Duration:** Per cycle
- **Auto-archive:** Issues completed in previous cycles
- **Auto-rollover:** Incomplete issues move to next cycle

## Best Practices

### 1. Cross-Package Dependencies

When an issue affects multiple packages or apps, use:

- **Relates to** - For related but independent work
- **Blocks** - When completion depends on another issue
- **Duplicate** - For duplicate reports
- **Parent/Sub-issue** - For breaking down large tasks

### 2. Monorepo-Specific Patterns

**Pattern 1: Shared Package Changes**

When a package update affects multiple apps:

```
Parent Issue: [Update sync package to v2.0]
├── Sub-issue: Migrate Bingo to sync v2.0
├── Sub-issue: Migrate Trivia to sync v2.0
└── Sub-issue: Update sync package documentation
```

**Pattern 2: Feature Spanning Apps**

For features that need implementation across apps:

```
Parent Issue: [Implement dark mode support]
├── Sub-issue: Add dark mode tokens to theme package
├── Sub-issue: Implement dark mode in Bingo
├── Sub-issue: Implement dark mode in Trivia
└── Sub-issue: Add theme toggle to Platform Hub
```

### 3. Issue Creation from Claude Code

With the Linear MCP server, you can create issues directly:

```
"Create a Linear issue for fixing the audio mute bug in Bingo"
```

Claude Code will:
1. Determine the appropriate team
2. Apply relevant labels
3. Set priority based on context
4. Link to related issues

### 4. Linking PRs to Issues

When creating pull requests, reference Linear issues:

```markdown
Fixes BLA-123
Closes BLA-456
Related to BLA-789
```

This creates automatic links between code and issues.

### 5. Automation

Set up Linear automations:

- **PR Opened** → Move issue to "In Review"
- **PR Merged** → Move issue to "Done"
- **Issue Labeled "bug"** → Set priority to "High"
- **Issue Created with "pkg:*"** → Assign to Packages Team

## Environment Variables

If implementing API integration in apps:

```bash
# .env.local
LINEAR_API_KEY=lin_api_your_key_here
LINEAR_WEBHOOK_SECRET=your_webhook_secret
```

## Resources

- [Linear Documentation](https://linear.app/docs)
- [Linear API Reference](https://linear.app/developers)
- [Linear MCP Server Docs](https://linear.app/docs/mcp)
- [Linear TypeScript SDK](https://linear.app/developers/sdk)
- [Linear GraphQL Playground](https://linear.app/developers/graphql)

## Next Steps

1. Create Linear workspace for Joolie Boolie
2. Set up teams according to monorepo structure
3. Configure label taxonomy
4. Create initial projects for V1.0 work
5. Import existing GitHub issues (if applicable)
6. Set up PR automation
7. Configure cycles for work planning
