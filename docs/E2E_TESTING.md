# E2E Testing Guide

> **⚠️ THIS DOCUMENT IS DEPRECATED**
>
> This file contained outdated commands and has been replaced.
>
> **Please use:** [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)
>
> The new guide contains:
> - Correct commands (`pnpm test:e2e` instead of `pnpm playwright test`)
> - Mandatory verification workflow (`pnpm test:e2e:summary`)
> - Complete troubleshooting guide
> - Integration with the subagent workflow
>
> **Old file preserved at:** `E2E_TESTING.md.deprecated` (for reference only)

---

## Quick Start (Redirect)

See the [E2E Testing Guide](./E2E_TESTING_GUIDE.md) for complete instructions.

### Commands (Correct)
```bash
# Run tests
pnpm test:e2e

# MANDATORY: Verify results
pnpm test:e2e:summary
```

**DO NOT USE:**
- ~~`pnpm playwright test`~~ (deprecated)
- ~~`npx playwright test`~~ (deprecated)
- ~~`pnpm exec playwright test`~~ (deprecated)
