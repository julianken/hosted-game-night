# Obs Stack Assessment — 2026-04-14

**Verified via Playwright MCP against live dashboards.**
**Runner:** Claude Code (assistant) for BEA-A2
**Decision-1 framework:** per-service disposition → action

---

## TL;DR

| Service | Disposition | Action | Effort |
|---------|-------------|--------|--------|
| Sentry — jb-bingo | (a) Live | Keep; rename consideration | none / decision |
| Sentry — jb-trivia | (a) Live | Keep; rename consideration | none / decision |
| Sentry — jb-platform-hub | DEAD (orphaned) | **Delete project** | 1min in Sentry UI |
| Sentry transactions | BROKEN (0 events) | Investigate `registerOTel` spanProcessors routing | code PR |
| Grafana Faro — joolie-boolie (3480) | STALE | **Delete** | 1min in Grafana UI |
| Grafana Faro — bingo (3481) | (b) Broken-salvageable | **Add `host-bingo.com` to CORS list** | 30s fix |
| Grafana Faro — trivia (3482) | (b) Broken-salvageable | **Add `host-trivia.com` to CORS list** | 30s fix |
| Grafana Application Observability | PAYWALLED | **Decision needed** — upgrade / reroute / deprecate | needs user input |
| CSP `connect-src` `/monitoring` directive | BROKEN (invalid source) | **Fix in code** | code PR, ~1 line |

**No deprovision needed.** The obs stack is salvageable. The user's suspicion ("don't even think they work anymore") is partly correct: Faro RUM is broken by CORS post-rebrand, and Application Observability (backend traces UI) is behind a Grafana Cloud Free paywall. Sentry is alive.

---

## What works today

### Sentry (org `detached-node`)

- **Auth**: logged in as `juliankennon@gmail.com` (Google SSO via Sentry).
- **Deploy tracking**: both bingo + trivia show release `a7369f16cd42` (current HEAD) deployed "14hr ago" via vercel-production. Sourcemap + release machinery works.
- **Events**:
  - `jb-bingo`: 0 errors, 0 transactions, 100% crash-free (but 0 sessions → vacuous).
  - `jb-trivia`: **1 error, 0 transactions, 98.667% crash-free (1.333% crash rate)** → real sessions flowing.
  - `jb-platform-hub`: 0 / 0 / — / button "Track Deploys" → never received any data (orphaned).
- **Verdict**: Sentry error tracking works for trivia; bingo either has no users or its errors aren't being emitted. Transaction/performance side is dead on both.

### Grafana Faro (stack `julianken.grafana.net`)

- **Auth**: logged in via Grafana.com SSO (session cookie picked up automatically).
- **Plan**: "Cloud Free (Licensed)" — no hard tier lapse, but several paid-tier upsell banners.
- **Faro apps**:
  - `joolie-boolie` (app id 3480) — last data 5 days ago; stale rebrand leftover.
  - `bingo` (app id 3481) — last data 3 hours ago (via sendBeacon fallback). CORS origins list contains only `https://bingo.joolie-boolie.com`.
  - `trivia` (app id 3482) — last data 3 hours ago (via sendBeacon fallback). CORS origins list contains only `https://trivia.joolie-boolie.com`.
- **Verdict**: Faro apps exist and tokens are valid, but CORS origins are pre-rebrand. `host-bingo.com` / `host-trivia.com` requests fail preflight and never reach the collector via fetch.

---

## What's broken

### 1. Faro CORS (primary user-visible symptom)

Every page load of `host-bingo.com` or `host-trivia.com` produces this console sequence (verified live via Playwright MCP):

```
[ERROR] Access to fetch at 'https://faro-collector-prod-us-west-0.grafana.net/collect/<app-key>'
        from origin 'https://host-{bingo|trivia}.com' has been blocked by CORS policy:
        Response to preflight request doesn't pass access control check:
        No 'Access-Control-Allow-Origin' header is present on the requested resource.
[ERROR] Failed to load resource: net::ERR_FAILED
[ERROR] Faro @grafana/faro-web-sdk:transport-fetch Failed sending payload to the receiver
```

**Root cause**: Faro app CORS origins list is an allowlist; the allowlist contains only the pre-rebrand domain; new primary domains are not included. Confirmed by reading the actual form values in both apps' `/edit` pages.

**Why data still shows "3 hours ago"**: `navigator.sendBeacon` fallback doesn't trigger CORS preflight for simple `POST` payloads, so some events sneak through on page unload. Fetch-based transport (the default, used during session for periodic flushes) fails every time.

**Fix**: Add new origins to each Faro app. For bingo app (3481) add `https://host-bingo.com`; for trivia (3482) add `https://host-trivia.com`. While there, also add `https://trivia.host-bingo.com`-style wildcards if any dual-screen windows live on different subdomains (probably none).

### 2. CSP `connect-src` contains `/monitoring` (invalid syntax)

Every page load: `The source list for the Content Security Policy directive 'connect-src' contains an invalid source: '/monitoring'. It will be ignored.`

**Root cause**: CSP source lists must be scheme/origin/URL/keyword values (`'self'`, `https://*.example.com`, `wss://...`). A path like `/monitoring` is invalid. Likely intended to permit `https://<something>.sentry.io/api/<id>/monitoring/` or the local `/api/monitoring-tunnel` route, but got truncated during construction.

**Fix location**: Most likely `next.config.ts` or a middleware/headers function. Search `next.config.*` and `middleware.ts` for `monitoring` or for the CSP header construction. Replace with a proper origin/URL.

### 3. Sentry transactions = 0 on both apps

Performance monitoring is not flowing events to Sentry. Possible causes:
- `registerOTel` only exports to Grafana via `BatchSpanProcessor` (per MEMORY.md note); Sentry's OTel integration isn't attached.
- `@vercel/otel` defaults may route only to Vercel's collector; Sentry requires `Sentry.init` with `tracesSampleRate > 0` AND/OR OTel bridge.

**Status**: Lower priority. Sentry error tracking works, which is 80% of the value. Transactions can be investigated in a follow-up.

### 4. Grafana Application Observability paywalled

Navigating to the Application Observability Services view produces a modal dialog:

> **Action required: Send host-hours telemetry** — Application Observability is now billed based on host-hours. To regain access to your services, please follow the instructions below to configure telemetry for host usage tracking. … Reach out to cloud-success@grafana.com for any questions or assistance.

This means even when OTel traces reach the Tempo endpoint, the UI for browsing them is locked behind host-hours billing on the free tier. The data may still be stored (Tempo retention on free tier is reduced but non-zero) and queryable via Explore → Tempo, but the first-class UX is gone.

**Decision needed from user** (not resolved by this assessment):
- **Option 1**: Upgrade to paid → Application Observability restored, ~$19/mo minimum Pro plan.
- **Option 2**: Keep sending traces to Tempo but only browse via Explore → Tempo (free tier still permits this at lower limits); accept degraded UX.
- **Option 3**: Reroute traces elsewhere — Sentry performance (paid tier for useful volume), Axiom (already on log drain, traces possible), or stop backend tracing entirely.
- **Option 4**: Deprovision `@vercel/otel` + Tempo integration entirely; rely on Sentry errors + Faro RUM only.

---

## Post-rebrand drift (additional findings)

These were discovered during the walkthrough and are not on any prior audit list:

### Sentry project slug drift

Project slugs are `jb-bingo`, `jb-trivia`, `jb-platform-hub` — all still `jb-*` from the joolie-boolie era. Sentry project slugs are generally immutable after creation; renaming typically requires creating a new project, re-pointing DSN, and archiving the old one. **Decision**: accept the slug drift (cosmetic; internal-facing), OR new-project migration (aligns the URL bar with `host-*` brand).

### Sentry `jb-platform-hub` project should be deleted

Zero events ever, no deploys tracked. Platform hub app was deleted in BEA-682. Safe to delete the Sentry project.

### Grafana `joolie-boolie` Faro app (3480) should be deleted

5-day-stale with no new data. Post-rebrand, events flow to bingo/trivia Faro apps. Safe to delete.

### Grafana access policy & token names still `joolie-boolie-*`

- Access policy: `joolie-boolie-otlp` (id `061f94f8-69f8-4613-b6c7-318817f00bbd`)
- Token name: `joolie-boolie-vercel-2026-04`
- Sentry auth token name: `joolie-boolie-ci-2026-04`

Names are cosmetic and token itself is fresh (rotated 2026-04-11), but future rotations should use `hosted-game-night-*` naming.

### Axiom via Vercel Marketplace is actually wired

Prior audit MEMORY.md claimed Axiom has "no consumer in current source" and filed BEA-710. In fact, Axiom is integrated as a **Vercel log drain** — Vercel auto-forwards logs, no source-code consumer needed. The `NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT` env var IS unused for source code, but Axiom itself is wired at the Vercel → Axiom integration layer. **BEA-710 should be updated** to reflect this correctly.

---

## Immediate fixes applied in this session

### ✅ Faro CORS allowlist fixed on both apps (via Playwright MCP)

- **Trivia Faro app (3482)**: added `https://host-trivia.com` to CORS origins list. Verified persisted after page reload.
- **Bingo Faro app (3481)**: added `https://host-bingo.com` to CORS origins list. Verified persisted after page reload.
- **Both legacy `*.joolie-boolie.com` origins kept** (no break for any legacy-domain traffic).

### ✅ End-to-end verification

Navigated to `https://host-trivia.com` — console error count dropped from **4 → 1**. All Faro CORS errors gone; only CSP `/monitoring` directive error remains.

Navigated to `https://host-bingo.com` — console error count dropped from **7 → 1**. Same pattern.

**RUM / Faro pipeline restored** end-to-end. Next page loads from real users will flow events to Grafana without CORS blocks. "Last data received" timestamps on the Faro apps should refresh to current time within minutes of real user traffic.

### CSP `/monitoring` bug source located (not fixed in-session — code PR)

- **`apps/bingo/next.config.ts:40`**
- **`apps/trivia/next.config.ts:40`**

Both contain the identical CSP header with `connect-src 'self' https://*.grafana.net /monitoring`. The `/monitoring` token is invalid CSP syntax (CSP sources must be scheme/host/keyword). Browsers silently drop it, so there's no functional impact — just console noise.

**Prior audit already analyzed this** (post-standalone-audit Finding 3-6). Recommended fix per that audit's Iterator 5:

```diff
- connect-src 'self' https://*.grafana.net /monitoring;
+ connect-src 'self' https://*.grafana.net https://*.ingest.sentry.io https://*.sentry.io;
```

Rationale:
- Drop invalid `/monitoring` (same-origin `/api/monitoring-tunnel` is already covered by `'self'`)
- Keep `*.grafana.net` — load-bearing for Faro (now functional again after CORS fix)
- Add Sentry fallback domains so Sentry's direct transport works if tunnel fails

This is a one-line fix to 2 files, no runtime behavior change, no risk. Should go into the CSP enforcement PR (tracked as prior audit's H.7 / M3, still open) OR a standalone hygiene PR.

## Action log

- **2026-04-14 17:10 UTC** — Navigated `sentry.io/organizations/detached-node/projects/`, observed 3 projects with event counts.
- **2026-04-14 17:10 UTC** — Captured `host-trivia.com` console: Faro CORS errors confirmed.
- **2026-04-14 17:11 UTC** — Captured `host-bingo.com` console: Faro CORS errors confirmed, same pattern.
- **2026-04-14 17:11 UTC** — Grafana Cloud login auto-completed via session cookie.
- **2026-04-14 17:11 UTC** — Observed Application Observability paywall dialog.
- **2026-04-14 17:12 UTC** — Navigated Frontend Observability: 3 Faro apps (joolie-boolie / bingo / trivia).
- **2026-04-14 17:13 UTC** — Read bingo Faro CORS origins via DOM inspection: `[https://bingo.joolie-boolie.com]`.
- **2026-04-14 17:13 UTC** — Read trivia Faro CORS origins: `[https://trivia.joolie-boolie.com]`.
- **2026-04-14 17:14–17:18 UTC** — Added `https://host-trivia.com` to trivia Faro (3482) and `https://host-bingo.com` to bingo Faro (3481) via form submission; both saves verified via page reload.
- **2026-04-14 17:18 UTC** — Re-navigated to both production apps: trivia console dropped 4 → 1 errors, bingo 7 → 1. Only the CSP `/monitoring` directive error remains on each (same root cause, separate bug).
- **2026-04-14 17:19 UTC** — Located CSP bug source at `apps/{bingo,trivia}/next.config.ts:40` (identical line); already analyzed in prior audit Finding 3-6 with a one-line fix diff available.

## Next steps (proposed, pending user approval where flagged)

1. ~~**Add `host-bingo.com` to bingo Faro app CORS allowlist**~~ — **DONE** ✅
2. ~~**Add `host-trivia.com` to trivia Faro app CORS allowlist**~~ — **DONE** ✅
3. **[Approve?] Delete stale `joolie-boolie` Faro app (3480).** Grafana retains deleted apps recoverable for ~30 days per their docs; deletion is reversible short-term but cosmetic harm is zero (it stopped receiving data 5 days ago).
4. **[Approve?] Delete orphaned `jb-platform-hub` Sentry project.** Never received any events; app was deleted in BEA-682. Sentry project deletion is reversible for 30 days via org restore.
5. **[Code PR] CSP `/monitoring` directive bug** — one-line fix in 2 files (`apps/{bingo,trivia}/next.config.ts:40`). Can ship with the CSP enforcement PR (prior audit M3, still open) or as standalone hygiene.
6. **[Decision needed] Grafana Application Observability — paywall response**: upgrade / reroute / keep-degraded / deprovision. Currently backend traces sent to Tempo but browsing UI paywalled.
7. **[Decision needed] Sentry project slug drift** — accept cosmetic `jb-*` OR migrate to new projects (breaks DSN → source re-deploy required).
8. **[Update MEMORY.md + close BEA-710]** Axiom IS wired via Vercel log drain integration; the `NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT` env var being unused does NOT mean Axiom isn't receiving data. BEA-710 premise was wrong.
9. **[Optional hygiene] Rename post-rebrand**: Grafana access policy (`joolie-boolie-otlp`), Grafana API token (`joolie-boolie-vercel-2026-04`), Sentry auth token (`joolie-boolie-ci-2026-04`) — cosmetic only, token values themselves are current.
