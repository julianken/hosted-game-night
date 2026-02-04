# Task Completion Checklist

When completing a task, ensure the following before committing:

## 1. Code Quality
- [ ] Code follows project conventions (see code_conventions.md)
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm lint`
- [ ] No security vulnerabilities (OWASP top 10)

## 2. Testing
- [ ] Unit tests pass: `pnpm test:run`
- [ ] E2E tests pass locally: `pnpm test:e2e`
- [ ] Check E2E summary: `pnpm test:e2e:summary`

**Note**: GitHub Actions are disabled. All tests MUST pass locally before committing.

## 3. Pre-Commit Hooks
Husky + lint-staged automatically runs:
- `pnpm lint` on changed files
- `pnpm typecheck` on changed packages
- `pnpm test:run` on changed packages

Bypass with `--no-verify` only when necessary.

## 4. Git Commit
- Use conventional commit format
- Reference Linear issue (BEA-###) in commit message
- Keep commits focused and atomic

## 5. Pull Requests
- MUST use template at `.github/PULL_REQUEST_TEMPLATE.md`
- Include Five-Level Explanation
- Link to Linear issue

## 6. Do NOT
- Include time/effort estimates
- Use GitHub Issues (use Linear instead)
- Create unnecessary documentation files
- Over-engineer or add unrequested features
