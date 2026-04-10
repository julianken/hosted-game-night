# Security Audit Log

## 2026-04-10
- Vulnerabilities found: 1 critical, 23 high, 21 moderate, 4 low (49 total)
- Action: Updates applied but checks failed — lint broken by `ajv` override incompatibility with `@eslint/eslintrc@3.3.3`. Branch `security/nightly-2026-04-10` pushed for manual review.
- PR: N/A (GitHub API credentials unavailable; branch pushed to origin/security/nightly-2026-04-10)
- Notable: 34 pnpm overrides added via `pnpm audit --fix`. The `"ajv@<6.14.0": ">=6.14.0"` override must be narrowed (e.g. `>=6.14.0 <7`) to avoid breaking ESLint.
