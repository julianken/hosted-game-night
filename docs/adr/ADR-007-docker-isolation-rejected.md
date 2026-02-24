# ADR-007: Docker Isolation Rejected for E2E Test Environments

## Status

Rejected

## Context

When implementing parallel E2E testing across git worktrees (see ADR-001), Docker-based environment isolation was evaluated. The Docker design involved per-worktree containers for all three Next.js apps, port allocation via `WORKTREE_INDEX`, and optionally a local PostgreSQL/Supabase stack.

A full analysis was conducted and is archived at `docs/archive/decision-funnels/e2e-docker-isolation-architecture.md`.

## Decision

Docker isolation was rejected. The project uses hash-based port isolation with direct process execution instead (ADR-001).

**Rationale:**

1. **Complexity without proportional benefit.** The project is developed by AI agents, not a team with conflicting local environments. The primary isolation need is port-level, not full container isolation.

2. **Resource overhead is prohibitive.** Each Docker-isolated worktree would require ~1.5GB RAM for three Next.js dev servers plus ~2GB for a local Supabase stack. Three parallel worktrees would need 10-12GB just for E2E infrastructure.

3. **Docker build time adds significant delay.** First-run builds take 5-10 minutes. Container startup adds 60-90 seconds vs. ~30 seconds for native `next start`.

4. **Database isolation is unnecessary at current scale.** E2E tests use `E2E_TESTING=true` to bypass Supabase for auth (ADR-002). Game state is in localStorage (browser-isolated per test context).

5. **Hash-based port isolation solves the actual problem.** Port conflicts -- the original trigger -- are fully resolved by SHA-256-based port assignment (ADR-001).

6. **No Docker dependency in dev workflow.** Agents can run E2E tests without Docker installed, daemon running, or container permissions configured.

## Consequences

**Positive:**
- No Docker installation required for development or E2E testing.
- Infrastructure setup is a single script (`scripts/setup-worktree-e2e.sh`).
- Server startup takes ~30 seconds vs. 60-90 seconds with Docker.
- Zero RAM overhead from container layers.

**Negative:**
- No database-level isolation across parallel worktrees (mitigated by `E2E_TESTING=true` bypass).
- If Docker-based CI is adopted later, tooling must be built from scratch.

**Reference:**
- `docs/archive/decision-funnels/e2e-docker-isolation-architecture.md` -- full Docker architecture analysis
- `docs/archive/decision-funnels/e2e-test-isolation-strategy.md` -- decision rationale
- `e2e/utils/port-isolation.ts` -- the accepted alternative implementation
