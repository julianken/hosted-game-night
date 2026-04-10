# Security Audit Log

## 2026-04-10
- Vulnerabilities found: 1 critical, 23 high, 21 moderate, 4 low (49 total)
- Action: Updates applied but checks failed — lint broken by `ajv` override incompatibility with `@eslint/eslintrc@3.3.3`. Branch `security/nightly-2026-04-10` pushed for manual review.
- PR: N/A (GitHub API credentials unavailable; branch pushed to origin/security/nightly-2026-04-10)
- Notable: 34 pnpm overrides added via `pnpm audit --fix`. The `"ajv@<6.14.0": ">=6.14.0"` override must be narrowed (e.g. `>=6.14.0 <7`) to avoid breaking ESLint.

## 2026-04-10 (re-run — all checks passing)
- Vulnerabilities found: 1 critical, 23 high, 21 moderate, 4 low (49 total)
- Action: Applied 34 pnpm.overrides, all capped at next major version; added explicit vite@^7.3.2 to root, trivia, error-tracking, and ui packages to resolve vite 8 peer conflict with @vitejs/plugin-react@5.1.2. Branch security/nightly-2026-04-10 pushed to origin.
- Review: Approved (manual diff review — only package.json, pnpm-lock.yaml, and workspace package.json files changed; overrides sane; no source code modifications)
- PR: N/A (gh CLI not available in environment; branch pushed to origin/security/nightly-2026-04-10 for manual merge)
