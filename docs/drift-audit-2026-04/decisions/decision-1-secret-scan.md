# Decision 1: Secret Scan Strategy (H.0 URGENT)

## TL;DR (3 sentences)

Run `trufflehog git file://. --branch HEAD --results=verified,unknown --json` over the full history (~762 commits on main; ~1401 across all refs) as the primary scanner, with `gitleaks detect --no-banner --redact --log-opts="--all"` as a cross-check for anything TruffleHog misses; triage both outputs against the live inventory in `.secrets/observability-accounts.json` and treat any hit in `sntrys_`, `glc_`, `supabase`, `JWT`, or `eyJ` shape as live-until-proven-dead. Rotate Sentry + Grafana tokens (U2) **before** or during the scan regardless of outcome, because U2 is already categorized as open exposure on a public repo and the scan cost is unrelated to the rotation cost. Accept the scannable Supabase blob (no history rewrite) — the credential is inert, the project is deleted, and force-pushing a public repo to delete one dead blob breaks forks/mirrors/PR refs for negative security gain; only rewrite if the scan surfaces a *live* secret that cannot be rotated.

## Scope Amendment (2026-04-14): Observability stack is suspect — rotate gets replaced by verify-then-decide

User reports suspicion that **Sentry and Grafana integrations may no longer work** (tokens expired, accounts lapsed, projects deleted, quota exhausted — unknown which). This converts "rotate U2 tokens regardless of scan outcome" into a three-branch decision: **(a) still working → rotate**, **(b) broken but salvageable → reconfigure + rotate**, **(c) not actually in use / worth keeping → deprovision entirely and strip the integration code + env vars**. The assistant will execute the verification walkthrough using Playwright MCP when Wave 1 A-track runs; the user will not have to hand-navigate dashboards.

### Playwright MCP verification playbook (runs before any rotation)

For each service, the assistant navigates in the browser, confirms state, and returns a disposition. The user provides login (or `! gcloud-style` interactive command) only if an SSO gate blocks automation.

**Sentry — assessment sequence:**
1. Navigate to `https://sentry.io/` and confirm auth state. If logged out, ask user to authenticate.
2. Open the org's Projects list. For each of `bingo` and `trivia`:
   - Open project overview. Record "Last seen" timestamp for any event. **If >30 days stale → integration likely broken.**
   - Open Project → Settings → Client Keys (DSN). Compare the DSN prefix to `.secrets/observability-accounts.json` (user reads the file; assistant does not).
   - Open Project → Stats. Check event volume over last 30 days. Zero events + recent deploys = broken.
3. Navigate to Account → User Auth Tokens (`https://sentry.io/settings/account/api/auth-tokens/`). Inventory active tokens; note last-used dates.
4. Navigate to Organization → Settings → Auth Tokens (org-scoped, used for sourcemap upload). Same inventory.
5. **Disposition per project:**
   - Events flowing + token used recently → **rotate** (keep integration)
   - Events stopped but project exists → **reconfigure** (check tunnel route at `/api/monitoring-tunnel`, Next.js Sentry config, then rotate)
   - Project deleted / org unknown → **deprovision** (strip Sentry dep + config + env vars)

**Grafana Cloud — assessment sequence:**
1. Navigate to `https://grafana.com/` Cloud Portal. Confirm auth state.
2. Open the stack/org dashboard. Check account tier (free/pro/trial) and whether it shows `EXPIRED` / `TRIAL_LAPSED` / `ACTIVE`.
3. Navigate to the Grafana instance (typically `https://<org>.grafana.net/`). Open Explore → data source `grafanacloud-<org>-traces` (Tempo). Query recent traces from `service.name=~"bingo|trivia"` over last 7 days. **Zero traces + recent deploys = broken.**
4. Open Connections → Data Sources. Confirm Tempo endpoint matches `otlp-gateway-prod-us-west-0.grafana.net/otlp`.
5. Open Frontend → Faro applications. For each of bingo + trivia Faro apps:
   - Check app key matches `.secrets/observability-accounts.json` (user-provided)
   - Check "Last received" event timestamp
6. Navigate to My Account → Access Policies (or API Keys). Inventory live tokens; note expiry + last-used.
7. **Disposition per data source:**
   - Traces/RUM events flowing → **rotate token**
   - Events stopped but org/app exists → **reconfigure + rotate** (Faro wiring was already fixed in BEA-710 era; check `NEXT_PUBLIC_FARO_URL` + `registerOTel` spanProcessors)
   - Org/app/tokens gone → **deprovision** (strip `@vercel/otel`, Faro init component, env vars, turbo allowlist entries)

### Deprovision scope (branch c) — what to strip if obs is dead

If assessment returns "deprovision" for either stack:

- **Sentry:** remove `@sentry/nextjs` dep from both apps; delete `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`; delete `/api/monitoring-tunnel` route; strip `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` from turbo.json + Vercel env + `.env.example`.
- **Grafana / OTel / Faro:** remove `@vercel/otel` dep; delete `instrumentation.ts` (or reduce to no-op); delete `FaroInit` component; strip `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `NEXT_PUBLIC_FARO_URL` from turbo.json + Vercel env + `.env.example`; remove the Grafana Cloud exporter code from `registerOTel`.
- **Memory.md update:** move the "Observability Stack (WORKING)" section to an archived/removed state with explicit rationale.
- **CLAUDE.md update:** remove the Context7 lib hints for Sentry/Faro if deprovisioned.

### Interaction with secret scan

The scan (TruffleHog + Gitleaks) runs **before** Playwright verification because:
- Scan output tells us which token shapes (`sntrys_...`, `glc_...`) were historically committed. This informs which integrations to prioritize verifying.
- A scan hit on a provider whose integration is dead (branch c) is still a concern — the token may be valid against the provider even if our code doesn't use it. Verification disposition drives "rotate now vs. let expire," not "scan or not."
- If scan finds no Sentry/Grafana hits AND verification returns "deprovision," U2 effectively closes as **INVALIDATED-BY-DEPROVISION** rather than **ROTATED**.

### Updated U2 resolution matrix

| Scan hit? | Verification | Action |
|-----------|--------------|--------|
| Yes | Live | Rotate (original plan) |
| Yes | Broken-salvageable | Reconfigure → rotate |
| Yes | Dead/deprovisioned | Assume-exposed → **best-effort revoke**; accept if provider won't revoke an orphan |
| No | Live | Rotate anyway (public repo hygiene) |
| No | Broken-salvageable | Reconfigure → rotate |
| No | Dead | Deprovision code + env; mark U2 closed-by-deletion |

---

## Tool Decision

- **Chosen:** **TruffleHog v3** (primary) + **Gitleaks** (cross-check) + GitHub's built-in secret scanning (already enabled, passive)
- **Runner-up:** Gitleaks alone (competitive; lost on verifier coverage)
- **Rejected:** `git-secrets`, `detect-secrets`, GitHub Advanced Security (paid), ggshield

### Justification vs. rejected options

**TruffleHog wins on verifier coverage.** TruffleHog has 800+ detectors with built-in live verifiers (it hits the upstream API to confirm the secret works). For this repo's threat model — Sentry auth tokens (`sntrys_...`), Grafana Cloud tokens (`glc_...`), Supabase service-role JWTs — every one of those has a TruffleHog verifier. A verified hit is actionable in seconds; an unverified hit requires manual confirmation. On a public repo the cost of a false negative dominates the cost of a false positive, so the verifier matters.

**Gitleaks wins on speed and rules transparency.** ~4x faster than TruffleHog on large repos, single-binary Go install (`brew install gitleaks`), and its rules are plain TOML. Ideal cross-check: if TruffleHog misses a provider-specific pattern because the detector regex is too tight, Gitleaks' generic entropy + high-coverage rule set catches it. Running both is cheap (<10 min total on 762 commits).

**GitHub Advanced Security:** Already have the free tier features (`secret_scanning: enabled`, `secret_scanning_push_protection: enabled` per `gh api /repos/julianken/hosted-game-night`). But `secret_scanning_non_provider_patterns: disabled` and `secret_scanning_validity_checks: disabled` — the non-partner patterns and validity checks are paid tier only. Cannot rely on GHAS alone for a comprehensive historical scan, but the existing push protection is a permanent safety net worth keeping.

**`git-secrets` rejected:** AWS-centric rules, no provider-specific Sentry/Grafana/Supabase patterns, requires pre-commit hook integration rather than historical scanning.

**`detect-secrets` (Yelp) rejected:** Good for baseline/diff workflow, weak on git-history sweep, entropy-based detection high FP rate on a Next.js monorepo with JWTs in tests and PRs.

**`ggshield` (GitGuardian) rejected:** Best-in-class scanner but requires a GitGuardian API account (pricing + onboarding cost). TruffleHog's verifier closes the main feature gap.

### Match against evaluation criteria

| Criterion | TruffleHog | Gitleaks | Winner |
|-----------|-----------|----------|--------|
| FP rate in Next.js/pnpm/TS | Low (JWT tests flagged but verifiers filter) | Medium (entropy FPs in lockfiles) | TruffleHog |
| Speed on 762 commits | ~5 min | ~90 sec | Gitleaks |
| Supabase service-role rules | Yes (dedicated detector) | Yes (jwt + entropy) | TruffleHog |
| Sentry auth token rules | Yes (`Sentry` detector) | Yes (sentry rule) | Tie |
| Grafana API keys | Yes (`GrafanaAPIToken`, `GrafanaCloudApiToken`, `GrafanaServiceAccountToken`) | Yes (`grafana-api-key`) | TruffleHog (finer detectors) |
| JWT / HMAC entropy | JWT detector + generic | Generic + entropy | Tie |
| Install complexity | `brew install trufflehog` | `brew install gitleaks` | Tie |
| Report format | JSON with verification status | JSON/SARIF | Tie |
| Triage UX | Severity = verified > unverified | Generic | TruffleHog |

## Scan Scope

**Decision: Full history across all refs, not just HEAD.**

Commands:

```bash
# Primary: TruffleHog across all refs, verified + unknown (unverified)
trufflehog git file:///Users/j/repos/beak-gaming-platform \
  --results=verified,unknown \
  --json \
  --no-update \
  > /tmp/trufflehog-$(date +%Y%m%d-%H%M).json

# Cross-check: Gitleaks over full log, redacted output
gitleaks detect \
  --source=/Users/j/repos/beak-gaming-platform \
  --log-opts="--all" \
  --redact \
  --report-format=json \
  --report-path=/tmp/gitleaks-$(date +%Y%m%d-%H%M).json \
  --no-banner

# Known-historical-blob spot check (the Supabase leak)
git log --all -S 'iivxpjhmnalsuvpdzgza' --oneline
git log --all -S 'service_role' --oneline
```

**Justification:**

- Prior audit identified the Supabase key only via `git log -S` — that's a targeted search, not a comprehensive scan. A real sweep needs the full object graph.
- "Since N" is tempting (scan from last-known-clean commit), but there is no last-known-clean commit on record. No prior scan means every commit is in scope.
- "Current branch only" misses reflog objects, deleted branches still reachable, and tag objects. On a public repo, GitHub shows all refs pushed to origin — scan must match that surface.
- ~762 commits on main + ~639 reachable via other refs (1401 total) is trivial for both scanners (<10 minutes combined).
- Scan `.worktrees/` separately because those worktree directories are on-disk-only and contain pre-standalone content per Finding 3.1; in practice the TruffleHog `git` backend will only see tracked content, but a filesystem scan (`trufflehog filesystem .worktrees/`) closes the gap.

## Triage SOP (decision tree)

For each hit, walk the tree:

```
HIT DETECTED
    |
    +-- Is it verified-live by the detector?
    |       |
    |       +-- YES: CRITICAL — rotate immediately (see Rotation Sequence)
    |       |        Also: investigate how it entered git history.
    |       |
    |       +-- NO (verifier disagrees): Treat as inert, log, move to next hit.
    |
    +-- Is there no verifier for this detector?  (e.g. bespoke HMAC)
    |       |
    |       +-- Check shape against live inventory (.secrets/ + Vercel env)
    |       |       |
    |       |       +-- Matches a live token: CRITICAL — rotate.
    |       |       |
    |       |       +-- Does NOT match any live token: Check provider dashboard
    |       |               for token name or fingerprint. If no match anywhere,
    |       |               treat as dead artifact; log to Linear, close.
    |       |
    |       +-- Looks like a past rotation (inventory has "rotated_at" newer than
    |                   commit date): Dead. Log, close.
    |
    +-- Is it a known-inert blob (Supabase key — project deleted)?
            |
            +-- Verify deletion via MCP / Supabase console one more time.
            +-- Verify zero-reachability via clean-env build (already done
                    prior-audit Iterator 5).
            +-- Log, accept, no history rewrite (see H.0 rewrite decision).
```

### Per-hit-type specifics

**Sentry auth token (`sntrys_...`):**
- Verifier: TruffleHog `Sentry` detector.
- If live: rotate via Sentry console → Settings → Auth Tokens → revoke `joolie-boolie-ci-2026-04`, generate new, update Vercel env `SENTRY_AUTH_TOKEN` on both `bingo` + `trivia` projects, trigger redeploy to confirm sourcemap upload still works.
- Exposure blast radius if leaked + used: sourcemap replacement (attacker uploads tampered sourcemap that de-obfuscates to malicious code paths), release note manipulation, issue deletion. Scoped to `org:ci` — cannot create projects or users.

**Grafana Cloud / Faro token (`glc_...`):**
- Verifier: TruffleHog `GrafanaCloudApiToken`.
- If live: rotate via Grafana Cloud → Access Policies → `joolie-boolie-otlp` → revoke token `joolie-boolie-vercel-2026-04`, create new token with same scopes (`metrics:write`, `logs:write`, `traces:write`), update Vercel env `OTEL_EXPORTER_OTLP_HEADERS` (both apps) **and** any Faro-specific env var, redeploy.
- Exposure blast radius: write-only — attacker can flood metrics/logs/traces, cannot exfiltrate. Still rotate because telemetry poisoning breaks incident response.

**Supabase service-role key (JWT):**
- Verifier: TruffleHog `Supabase` detector tries the API.
- Project `iivxpjhmnalsuvpdzgza` is *deleted* per prior audit — verifier will return dead.
- If verifier says alive: project was re-created or is paused-but-resumable; rotate via Supabase dashboard → Settings → API → regenerate service role, and file a new Linear ticket (this contradicts MEMORY.md and is a live exposure).
- If verifier says dead: no rotation possible; log blob location; move to history-rewrite decision.

**Generic JWT / HMAC / high-entropy string:**
- No verifier. Cross-reference against live token inventory (`.secrets/`, `vercel env ls` output for both projects, GitHub Secrets, `.env.*` files).
- Common false positives in this repo: Vitest snapshot JWTs, mock Supabase client fixtures (though these were deleted), Playwright auth state JSON.
- If matches live token: CRITICAL, rotate.
- If no match anywhere: log as inert; do not rotate (rotating unknown secrets is busywork).

### Audit log

For every triaged hit, append a row to `docs/drift-audit-2026-04/decisions/scan-results.md` with columns:

| Commit SHA | File path | Detector | Verified? | Disposition | Rotated? | Timestamp | Notes |

This is the evidence trail for "DOD" below and for any future auditor or regulator.

## Token Rotation Sequence (U2)

**Decision: Rotate Sentry + Grafana tokens regardless of scan outcome, in parallel with the scan.**

Rationale: U2 is already an open recommendation from the prior audit; its justification never depended on the scan finding anything. Doing it in parallel avoids pipelining two URGENT items serially when they don't share state.

### Sequence

**1. Sentry auth token rotation**

```bash
# Step 1: Create new token in Sentry console
#   Settings → Developer Settings → Custom Integrations or Auth Tokens
#   Or: Organization → Auth Tokens → Create New Token
#   Scope: org:ci (minimal; matches current)
#   Name: hosted-game-night-ci-2026-04-13 (note new brand, new date)
#
# Step 2: Update Vercel env on both projects
vercel env rm SENTRY_AUTH_TOKEN production --yes --cwd apps/bingo
vercel env add SENTRY_AUTH_TOKEN production --cwd apps/bingo  # paste new token
vercel env rm SENTRY_AUTH_TOKEN production --yes --cwd apps/trivia
vercel env add SENTRY_AUTH_TOKEN production --cwd apps/trivia  # paste new token
#
# Step 3: Update .secrets/observability-accounts.json (gitignored) with new token
#   + auth_token_name + auth_token_rotated_at = now
#
# Step 4: Trigger redeploy on each project (main branch) to verify
#   sourcemap upload still works; tail build logs for sentry-cli success
vercel --prod --cwd apps/bingo
vercel --prod --cwd apps/trivia
#
# Step 5: Revoke old token `joolie-boolie-ci-2026-04` in Sentry console
```

**2. Grafana Cloud OTLP token rotation**

```bash
# Step 1: Grafana Cloud console → Administration → Users & Access → Access Policies
#   Policy: joolie-boolie-otlp (id: 061f94f8-69f8-4613-b6c7-318817f00bbd)
#   Add new token: name=hosted-game-night-vercel-2026-04-13
#   Scopes: metrics:write, logs:write, traces:write (match current)
#   Copy the glc_... token AND the Base64 Authorization: Basic header
#
# Step 2: Update Vercel env on both projects
vercel env rm OTEL_EXPORTER_OTLP_HEADERS production --yes --cwd apps/bingo
vercel env add OTEL_EXPORTER_OTLP_HEADERS production --cwd apps/bingo
# Value: Authorization=Basic <new-base64>
vercel env rm OTEL_EXPORTER_OTLP_HEADERS production --yes --cwd apps/trivia
vercel env add OTEL_EXPORTER_OTLP_HEADERS production --cwd apps/trivia
#
# Step 3: If Faro has a separate token (per .secrets/), rotate that too:
#   Grafana Cloud → Frontend Observability → App key → rotate
#   Update NEXT_PUBLIC_FARO_URL / FARO_APP_KEY envs on both projects
#
# Step 4: Update .secrets/observability-accounts.json with new token + rotation date
#
# Step 5: Redeploy each project, confirm OTel traces arriving at Grafana Tempo
#   (open Grafana Explore → Tempo → filter by service.name=bingo/trivia, last 15min)
#
# Step 6: Revoke old token `joolie-boolie-vercel-2026-04` in Grafana Cloud
```

**3. OTel gateway token:** The OTel gateway endpoint `otlp-gateway-prod-us-west-0.grafana.net/otlp` uses the same Grafana Cloud access-policy token (step 2). No separate rotation.

**4. Axiom:** Per `.secrets/`, Axiom is Vercel Marketplace-integrated; the token is provisioned by Vercel and rotates through that flow. No manual rotation unless the scan finds an Axiom token in history. File a sub-task to check the Vercel Marketplace integration dashboard for token-rotation controls.

**5. Synthetic Monitoring:** Status is `initialized` with no checks configured; no token to rotate yet.

### Rotation order rationale

- Sentry first: it's the token whose compromise has the highest blast radius (sourcemap upload = code-path visibility + tampering vector), and its rotation is the lowest-risk (a redeploy validates that everything still works).
- Grafana second: write-only scope means compromise is annoying (poisoned telemetry) rather than critical; rotation requires slightly more care because the Authorization header is Base64-wrapped.
- Both rotations should complete within one sitting to avoid partial-state (old-token in one place, new-token in another).

## History-Rewrite Decision

**Decision: Do NOT rewrite history. Accept the scannable Supabase blob.**

### Reasoning

Prior audit's Recommendation D1 already reached this conclusion. This decision re-ratifies it with current evidence:

**Cost of rewrite:**
- `git filter-repo` or BFG Repo-Cleaner to strip the blob — 10 minutes technical work.
- Force-push to `julianken/hosted-game-night` — breaks every fork, every mirror, every open PR ref, every developer's local clone that anyone ever made. Public repos assume immutable history.
- Invalidates CI builds pinned to SHAs, GitHub issue/PR permalinks, any bookmarked commit URLs.
- Invalidates the audit funnel itself — this audit cites specific commit SHAs in the evidence trail.
- New worktrees must be re-created; any checked-out worktree becomes detached from the rewritten history.

**Cost of acceptance:**
- The Supabase blob remains searchable via `git log -S 'service_role'` or any scanner cloning the repo.
- The key is inert (project deleted, verified Iterator 5 via Supabase MCP). No exploitation path.
- GitHub's own secret scanning already surfaces it to maintainers; attackers scanning externally get the same dead result.
- Signals to future observers "secrets have leaked here before" — this is a documentation cost (MEMORY.md + this audit make it explicit) not a security cost.

**What would flip this decision to rewrite:**
- Scan surfaces a *verified-live* secret that cannot be rotated (e.g., leaked user PII, leaked SSH private key whose fingerprint is deployed to a production system the user cannot redeploy from scratch).
- Scan surfaces a secret tied to a paid third-party service with no rotation flow (rare, would need per-service investigation).
- Customer / regulator requires rewrite as compliance remediation (not applicable — no customer contracts, no regulated data handled).

**Tool if ever required:** `git filter-repo` (actively maintained, official git recommendation over BFG). Command shape: `git filter-repo --path-glob '*supabase*' --invert-paths --force` plus blob-oriented `--replace-text` for the specific key string. Would require `git push --mirror --force` to origin and notifying anyone with forks. Not executing here.

## Forward-Looking Cadence

**Decision: Two-layer defense — pre-commit hook for authoring-time catch, GitHub push protection (already on) as backstop. No CI step.**

### Layer 1: Pre-commit hook (NEW)

Add Gitleaks as a lint-staged step in `.husky/pre-commit`:

```bash
# .husky/pre-commit (append after existing lint/typecheck)
gitleaks protect --staged --redact --no-banner --verbose || {
  echo "gitleaks: secrets detected in staged changes; remove before committing."
  exit 1
}
```

Gitleaks chosen over TruffleHog here because:
- `protect --staged` is designed for pre-commit (scans diff, not history — fast, ~1 sec).
- Lower FP rate on diffs vs. historical scanning.
- Single-binary install; no Python/Go runtime needed.

Rationale: Theme 1 of the audit ("enforcement asymmetry — the policing boundary sits at the compiler") — adding a pre-commit gate *closer to the compiler* is how to convert drift-vulnerability into prevented drift. Secrets are the highest-severity case where drift matters, so they are the first candidate for shift-left enforcement.

### Layer 2: GitHub push protection (EXISTING)

Already enabled (`secret_scanning_push_protection: enabled`). Confirm it stays on; do not disable even for internal commits. Consider enabling `secret_scanning_non_provider_patterns` and `secret_scanning_validity_checks` if GitHub Advanced Security becomes available (paid — defer).

### Layer 3: CI step — deliberately omitted

Reasoning: by the time CI runs, the secret is already pushed to a public-repo branch. Push protection catches it earlier (at push time). A CI-job Gitleaks run is cycles-for-nothing on top of layers 1 + 2. If we ever move to a private repo or a mode where push protection does not cover the branch model, add CI.

### Cadence for full-history re-scan

- After any merge of a PR that touches `.secrets/`, `.env*`, or `vercel env`-related code.
- Quarterly — calendar-scheduled, not drift-triggered.
- After any incident (Sentry breach alert, GitHub secret-scanning hit, user report).

## Definition of Done

H.0 is DONE when *all* of the following are verifiable:

1. **Scan executed.** Both `trufflehog` and `gitleaks` outputs exist at `docs/drift-audit-2026-04/decisions/scan-results/` with timestamps, committed to the repo (the OUTPUTS, not any secrets they contain — redacted mode is the default).
2. **Every hit is triaged.** `scan-results.md` has a disposition row for every non-duplicate hit; no "unknown" status remains.
3. **U2 tokens rotated.** `.secrets/observability-accounts.json` shows `rotated_at` timestamps ≥ today's date for both `sentry.auth_token` and `grafana_cloud.api_token`. Old tokens revoked in upstream consoles (verifiable by attempting to use them — should 401).
4. **Verified-live hits have a rotation commit.** Any verified secret has either (a) a commit/Vercel-env change that rotated it, or (b) documented rationale for why rotation is not possible (only acceptable for dead blobs like the Supabase key).
5. **Inert blobs explicitly accepted.** For the Supabase blob, explicit "accept, no rewrite" decision logged here and cross-referenced from the Linear ticket.
6. **Pre-commit hook landed.** `.husky/pre-commit` contains Gitleaks; a test commit with a fake `sntrys_...` string confirms the hook blocks it.
7. **Linear ticket closed.** H.0's ticket status = Done with this decision file linked. Any spawned sub-tickets (e.g., dedicated security audit per Divergence 1 resolution) are linked and triaged.
8. **No delta between scan state and live state.** Re-run the scan; confirm zero new hits since the triage. (Catches the case where rotation itself accidentally committed a new secret.)

## Open Questions (need input before executing)

1. **Axiom token location.** `.secrets/observability-accounts.json` references Axiom via Vercel Marketplace but doesn't include the token. Is there an Axiom API key committed anywhere in `.env.local` or shell dotfiles that should be in scope for rotation? (Probe: `vercel env ls` for both projects; grep for `xaat-` prefix in history.)
2. **`NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT` consumer.** MEMORY.md flags this env var as set with no consumer (BEA-710). Is this a stub that was committed with a real endpoint containing credentials? Shape check during scan.
3. **Faro app-key rotation path.** Is the Faro app key rotated via Grafana Cloud console separately from the OTLP access-policy token, or via a different workflow? Need to confirm before executing Rotation Step 3.
4. **`.worktrees/` scan scope.** The worktrees are on-disk-only (not tracked). Should `trufflehog filesystem .worktrees/` run alongside the git scan, or is the worktree content out-of-scope given it's not reachable via public-repo browsing? Recommend: scan them anyway (low cost, protects against accidental push later).
5. **Should we file a dedicated security audit ticket regardless of scan outcome?** Divergence 1 resolution says H.0 "may spawn a dedicated security audit if the scan returns hits." Even a clean scan might warrant a one-time retainer-style review because this is the first formal security scan the repo has had. Defer decision to post-scan.
6. **Who approves the rotation downtime window?** Rotating the Grafana OTLP token means a short window where telemetry from in-flight Vercel functions might 401 before the redeploy completes. Is this user-acceptable or does it need coordination? (Realistic answer: accept; Vercel redeploys are atomic, so new functions start with new token; in-flight old functions will drop some spans briefly.)

## Rationale Summary

This plan reflects three principles:

1. **Defense in depth over one-shot remediation.** Running a scan (detect) + rotating U2 tokens (repair) + installing a pre-commit hook (prevent) + keeping GitHub push protection (backstop) produces a security posture that survives the next accidentally-committed secret. A scan-only approach leaves the repo vulnerable to the *next* leak.

2. **Cost-benefit honesty on history rewrite.** For a dead credential on a public repo, rewrite has exclusively downsides. The only counter-argument would be "aesthetics of a clean history," which is not a security goal. This audit absorbs that tradeoff explicitly rather than deferring it to a hypothetical future security audit.

3. **Parallelize independent work.** Scan execution and U2 rotation do not share prerequisites. Sequencing them would double elapsed time with no quality gain. The plan separates their DOD criteria so progress on one does not gate the other.

The scan is instrumented enough that a clean result is *informative* (baseline established) and a dirty result has an actionable triage path (decision tree + rotation sequence). The failure mode this plan guards against hardest is "ran the scan, got noise, didn't finish triage" — the DOD criterion 2 ("every hit triaged") is explicitly the blocker. If that criterion feels burdensome, the scanners support reducing noise via `--results=verified` only, at the cost of missing unverifiable-but-real secrets. Not recommended for first run.
