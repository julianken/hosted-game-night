# OAuth Planning Archive - January 22, 2026

This directory contains OAuth integration planning documents that have been superseded by simplified, agent-validated plans.

## Why These Were Archived

During January 2026, four specialized agents (Architect, Code Reviewer, Code Simplifier, Code Explorer) independently analyzed the OAuth integration initiative. **All four agents reached consensus:** The original plan was significantly over-engineered and should be simplified by leveraging Supabase's native OAuth 2.1 server capabilities.

**Key Finding:** Supabase provides a complete OAuth 2.1 Authorization Server. The assumption that we needed to build one from scratch was incorrect.

**Result:** Reduced from 154-190 issues across 8 projects → 12-15 issues across 2 projects (~92% reduction)

## Archived Files

| File | Original Location | Lines | Reason for Archival |
|------|-------------------|-------|---------------------|
| `github_project_status.md` | `docs/` | 132 | GitHub project tracking with outdated completion metrics. Superseded by Master Plan Section 3 and trivia-session-integration-tasks.md |
| `INITIATIVE_1_OAUTH_SERVER.md` | `docs/` | 613 | Original OAuth plan (50 issues, custom OAuth server, Redis, oauth-client package). Superseded by INITIATIVE_1_REVISED_OAUTH.md (12-15 issues) |
| `INITIATIVE_1_PLATFORM_HUB.md` | `docs/` | 48 | Stub document with minimal content. Superseded by Master Plan Section 3.3 |
| `LINEAR_PROJECTS_MANUAL_CREATION.md` | `docs/` | 409 | Original Linear plan (8 projects, 154-190 issues). Superseded by LINEAR_REVISED_PROJECT_STRUCTURE.md (2 projects, 12-15 issues) |

## What's Wrong with Original Plans

### 1. Over-Engineering (92% unnecessary work)

**Original Plan Assumed:**
- Build custom OAuth 2.1 authorization server from scratch (29 issues)
- Create `@beak-gaming/oauth-client` package (12-15 issues)
- Deploy Redis cluster for session storage
- Implement custom PKCE validation logic
- Build custom JWT signing/verification
- Create token introspection endpoint
- Build OAuth metadata discovery endpoint
- Implement refresh token rotation manually

**Reality:**
- ✅ Supabase provides all of this built-in
- ✅ Authorization endpoint: `/auth/v1/oauth/authorize`
- ✅ Token endpoint: `/auth/v1/oauth/token`
- ✅ PKCE validation: Native S256 support
- ✅ JWT signing: Automatic with JWKS endpoint
- ✅ Token rotation: Automatic refresh token rotation
- ✅ OIDC discovery: `/.well-known/openid-configuration`

**What We Actually Need to Build:**
- Consent UI in Platform Hub (3-4 issues)
- OAuth client integration in Bingo (3 issues)
- OAuth client integration in Trivia (3 issues)

### 2. Time Estimates (Violates AI Development Model)

**Original Plans Included:**
- "Week 1-2", "Phase 1: 3 weeks", "Estimated Effort: 3-4 days"
- Violates CLAUDE.md directive: Never include time estimates for AI agent development
- AI agents don't work on schedules; they work on dependencies

### 3. Duplicate/Conflicting Information

**Multiple Plans for Same Work:**
- INITIATIVE_1_OAUTH_SERVER.md: 50 issues, detailed OAuth server implementation
- LINEAR_PROJECTS_MANUAL_CREATION.md: 154-190 issues across 8 projects
- INITIATIVE_1_REVISED_OAUTH.md: 12-15 issues (simplified, current)

Having multiple plans with different issue counts created confusion about scope.

### 4. Security Risks

**Custom OAuth Implementation Risks:**
- Building custom OAuth server requires deep cryptographic expertise
- Custom PKCE implementation risk (easy to get S256 hashing wrong)
- Custom JWT signing/verification (key management, algorithm choices)
- Refresh token rotation logic (race conditions, replay attacks)
- 400+ lines of custom crypto code = high maintenance burden

**Supabase Native Benefits:**
- Production-tested by thousands of apps
- Security updates handled by Supabase team
- Compliance certifications maintained
- Professional security audits

## Current Documentation Structure

The project now maintains these OAuth-related documents:

**Primary References:**
- `/docs/MASTER_PLAN.md` - Comprehensive single source of truth (Section 4: Remaining Work to MVP includes OAuth)
- `/docs/INITIATIVE_1_REVISED_OAUTH.md` - Current OAuth plan (12-15 issues, Phase 1 complete)
- `/docs/LINEAR_REVISED_PROJECT_STRUCTURE.md` - Current Linear structure (2 projects)

**Validation Evidence:**
- `/docs/AGENT_VALIDATION_SUMMARY.md` - Findings from 4 specialized agents showing 92% reduction

**Supplementary:**
- `/docs/trivia-session-integration-tasks.md` - Active task tracker for Trivia API routes
- `/docs/linear-integration.md` - Linear MCP + API setup guide

## Agent Validation Summary

### Architect Agent Verdict
**Modified Option A - Distributed APIs with Centralized Auth**
- Use Supabase Auth instead of custom OAuth server
- Enhance existing `@beak-gaming/auth` instead of creating new packages
- Platform Hub for user auth UI + consent screen

### Code Reviewer Agent Verdict
**HALT AND REDESIGN**
- Custom OAuth server requires cryptographic expertise (CRITICAL risk)
- Massive code duplication planned (400+ lines)
- Ignores existing patterns in database package
- No migration plan for existing users

### Code Simplifier Agent Verdict
**MAJOR OVER-ENGINEERING - Reduce to 8-12 issues**
- Fetched official Supabase docs proving OAuth 2.1 server exists
- 42 out of 50 issues are building what Supabase already provides
- Consensus recommendation: Use Supabase native OAuth

### Code Explorer Agent Verdict
**INFRASTRUCTURE IS MORE COMPLETE THAN DOCUMENTED**
- Validated 268 exports across database package
- Template CRUD exists for both Bingo and Trivia
- Session management complete with HMAC tokens and PIN security
- Platform Hub 35-40% complete (docs claimed 10%)

## Implementation Status

**Phase 1: OAuth Server Setup - ✅ COMPLETE (2026-01-21)**
- OAuth 2.1 server enabled in Supabase Dashboard
- Bingo client registered (Client ID: `0d87a03a-d90a-4ccc-a46b-85fdd8d53c21`)
- Trivia client registered (Client ID: `0cd92ba6-459b-4c07-ab9d-b9bf9dbb1936`)
- Environment variables configured
- OIDC discovery endpoint verified

**Phase 2: Consent UI - 🚧 PENDING (4 issues)**
- BEA-263: Create OAuth consent page UI
- BEA-264: Implement get authorization details API
- BEA-265: Implement consent approval handler
- BEA-266: Implement consent denial handler

**Phase 3: Bingo Integration - 🚧 PENDING (3 issues)**
- BEA-307: Add OAuth login to Bingo
- BEA-308: Handle OAuth callback in Bingo
- BEA-309: Protect Bingo /play route

**Phase 4: Trivia Integration - 🚧 PENDING (3 issues)**
- BEA-310: Add OAuth login to Trivia
- BEA-311: Handle OAuth callback in Trivia
- BEA-312: Protect Trivia /play route

## Comparison: Original vs. Revised

| Metric | Original Plan | Revised Plan | Improvement |
|--------|--------------|--------------|-------------|
| **Total Issues** | 154-190 | 12-15 | 92% reduction |
| **Projects** | 8 | 2 | 75% reduction |
| **OAuth Server Work** | 29 issues (custom) | 0 issues (use Supabase) | Eliminated |
| **Client Package** | 12-15 issues | 0 issues (use @supabase/supabase-js) | Eliminated |
| **Infrastructure** | Redis cluster | None (Supabase handles) | Eliminated |
| **Custom Endpoints** | 6+ | 1 (consent UI only) | 83% reduction |
| **Security Risk** | High (custom crypto) | Low (Supabase native) | Significant |
| **Maintenance Burden** | 400+ lines crypto code | ~100 lines UI code | 75% reduction |

## Lessons Learned

### 1. Validate Assumptions Before Planning
**Mistake:** Assumed Supabase couldn't be an OAuth server
**Reality:** Supabase has native OAuth 2.1 server support
**Lesson:** Check official docs BEFORE creating detailed plans

### 2. Use Specialized Agents for Validation
**Action:** Deployed 4 agents to analyze plan independently
**Result:** All 4 reached same conclusion (92% over-engineering)
**Lesson:** Agent validation catches issues humans miss

### 3. Avoid Time Estimates for AI Development
**Mistake:** Original plans had "Week 1-2", "3-4 days" estimates
**Reality:** AI agents work on dependencies, not time
**Lesson:** Focus on dependencies and complexity, not time

### 4. Prefer Platform Features Over Custom
**Mistake:** Planned to build OAuth server from scratch
**Reality:** Supabase provides production-ready OAuth
**Lesson:** Always check if platform provides feature before building

## Archive Policy

These documents are archived (not deleted) to preserve historical context and decision-making process. They demonstrate:
- How easy it is to over-engineer without validation
- The value of agent-driven architecture review
- The importance of checking platform capabilities first
- The cost of custom security code vs. managed solutions

**For current OAuth implementation details, refer to:**
- `/docs/INITIATIVE_1_REVISED_OAUTH.md`
- `/docs/MASTER_PLAN.md` (Section 4: Remaining Work to MVP)
- `/docs/LINEAR_REVISED_PROJECT_STRUCTURE.md`

## Archive Date

January 22, 2026 - During master plan consolidation and OAuth planning simplification

## References

- [Agent Validation Summary](../../AGENT_VALIDATION_SUMMARY.md)
- [Revised OAuth Plan](../../INITIATIVE_1_REVISED_OAUTH.md)
- [Master Plan](../../MASTER_PLAN.md)
- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/oauth-server)
