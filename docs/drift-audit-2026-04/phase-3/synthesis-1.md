# Synthesis 1: Thematic Lens

## Synthesis Approach

I began with the emergent narrative already articulated by the Phase 2 packet ("what you run is correct, what you read is wrong") and asked a harder question: what *mechanisms* keep reproducing that pattern, such that they will produce the next wave of drift even after this audit's cleanup lands? The ~80 Phase 1 + Phase 2 findings cluster into symptoms (stale line X, dead selector Y), so I deliberately resisted catalog-style themes and instead chose themes that explain **why** a particular class of drift recurs.

The trade-off I made: I collapsed several related-but-distinct failure modes into single themes when they share a common mechanism. For example, `MANUAL_TEST_PLAN.md` drift and `E2E_TESTING_GUIDE.md` drift are different artifacts but share the same mechanism (test-adjacent prose has no compiler and no CI gate), so they live inside one theme rather than two. I preferred four generative themes over seven cataloging ones. One theme (Theme 5) is admitted as weaker and scoped to a single discovery, because the public-repo finding genuinely changes the frame and demands separate treatment even though it has fewer exemplars.

I checked each candidate theme against a falsifiability prompt: "Could I predict, today, where the next drift will appear if this theme is real?" Themes that passed are below; themes that failed (e.g., "monorepo fragmentation") were dropped into the blind-spots section.

## Core Narrative

The repository is a clean machine wrapped in a layer of stale prose. BEA-697 through BEA-719 executed a competent, mechanical, grep-and-diff cleanup — the compiler, lint rules, E2E tests, and package manager all passed — and the running code at HEAD `a7369f16` is coherently standalone and coherently rebranded. But the cleanup touched only the surfaces that have enforcement. Every surface without enforcement — human-written prose, test plans, ADRs, agent context files, `MEMORY.md`, worktrees on disk — carries a residue of what the repository used to be: platform-hub, Supabase, Joolie Boolie, room setup, question sets, OAuth. The drift is not random noise; it is architectural fiction that was true six weeks ago and that the cleanup process never re-examined because nothing *forced* it to.

The deeper story is that this repo is AI-developed, and AI agents read the stale layer. A Claude session opening `.worktrees/wt-BEA-677-layout-constraints/` reads 30 CLAUDE.md files that still describe Supabase auth and `@joolie-boolie/*` scope (Iterator 3, B1–B4); a session reading `docs/templates/APP_README_TEMPLATE.md` to scaffold a new app package will still be told to use Supabase (Finding 2.8–2.10); a session reading the root `CLAUDE.md` will be told trivia has a "buzz-in feature" that does not exist (Finding A1). Each stale surface is a context vector that produces subtly wrong code on the next session. The cost is not the edit-hours to fix these files — that is small (~350 lines total across all targets). The cost is the compounding rate at which AI agents re-derive deleted architecture from plausible-but-false documentation, and the absence of any feedback loop that would surface that derivation. The four themes below describe the mechanisms by which this layer keeps accumulating.

## Theme 1: Enforced Surfaces vs. Advisory Surfaces — The Compiler Is the Only Gatekeeper

### Why this is a theme
Every drift finding in Phase 1 maps to a surface that is **not checked by any automated process**. Every *absence* of drift — i.e., every clean finding — maps to a surface that **is** checked (TypeScript, ESLint, Vitest, `pnpm typecheck`, pre-commit hooks). The split is near-perfect. Drift is the shadow cast by the compiler's blind spots.

### Supporting evidence
- **Code is clean.** Finding 1.1–1.7: dead types deleted, imports clean, `hgn-` prefix complete, scope rebrand complete, E2E workflow cleaned. All verified by `tsc` + `eslint` + test runs.
- **Prose that imports code concepts drifts.** Findings 2.1–2.4 (E2E guide references `authenticatedXyzPage`, `waitForRoomSetupModal`, data-testid table, removed spec file) — the guide uses identifiers that once matched real exports but now have no referent, and nothing blocked the deletion.
- **Templates prescribe deleted infrastructure.** Findings 2.8–2.10: `APP_README_TEMPLATE.md` still lists Supabase, `@hosted-game-night/database`, `@hosted-game-night/auth` — nothing checks that template recommendations match repo reality.
- **ADRs reference non-existent paths.** Finding 2.12: ADR-001 references `e2e/fixtures/auth.ts` which doesn't exist.
- **Manual test plan references 404 routes.** F3.5, F3.6, F3.25: `/question-sets` appears in 3 test cases; the route returns 404.
- **Iterator 5's predictive insight:** "E2E_TESTING_GUIDE.md: 40% of commits touched `e2e/`, only 2 touched the guide." Quantifies the asymmetry directly.
- **Positive confirmations of the mechanism:** Findings 2.14 (README.md clean), 2.15 (ARCHITECTURE.md clean), A8–A9 (`packages/game-stats/CLAUDE.md` and `apps/trivia/CLAUDE.md` Scene Engine section clean). These are clean *because* they were recently rewritten in dedicated sprints (BEA-702, BEA-719), not because any process kept them aligned.

### Mechanism
The cleanup economy is reactive, not proactive. Code cleanup is forced by compile-time errors; doc cleanup is forced only by humans noticing or by dedicated sprints. Between sprints, the gap grows at the rate of code change. BEA-719 was a string-swap sprint (no semantic review); BEA-702 was a larger sprint but still could not catch everything. The cycle is: code changes → code stays consistent (compiler enforces) → docs drift silently → drift accumulates → eventually someone runs an audit or sprint → brief correction → cycle resumes.

### Cross-theme relationships
- Theme 2 (semantic gap) explains *why* even sprint-level cleanup misses things.
- Theme 3 (agent context hygiene) is a special case of this theme where the affected surface is "what AI agents read."
- Theme 4 (write-once test plans) is the sharpest instance; MTP has no compiler *and* no human review cadence.

### Blind spots
This theme cannot explain why some unenforced surfaces (root `README.md`, `ARCHITECTURE.md`) stay clean while others (`APP_README_TEMPLATE.md`, MTP) drift. The real variable appears to be "was this edited as part of a recent sprint" — so the theme is really about *sprint coverage*, not just enforcement. I should not read this theme as "add CI gates everywhere"; that may be infeasible.

---

## Theme 2: String Rebrand ≠ Semantic Rebrand — BEA-719 Methodology Gap

### Why this is a theme
BEA-719's approach — grep for `joolie-boolie`, replace with `hosted-game-night`, ship — passes all automated checks because the check is *also* a grep. But documents contain architectural claims in natural language that name the same deleted system without using any of the brand strings. Any cleanup that uses only string matching will leave these claims in place. Multiple findings exhibit this pattern across multiple investigators.

### Supporting evidence
- **Finding 2.8** (`APP_README_TEMPLATE.md`): "Uses Supabase for auth" survived BEA-719 because it contains neither `joolie-boolie` nor `@joolie-boolie`. The sentence is *topologically correct* English prose about a deleted system.
- **Finding 2.9–2.10** (`APP_README_TEMPLATE.md`, `PACKAGE_README_TEMPLATE.md`): `@hosted-game-night/database`, `@hosted-game-night/auth` — BEA-719 *successfully* rebranded the scope and therefore preserved a reference to packages that were deleted in BEA-688 / BEA-694. The rebrand actively *reinforced* the staleness by making the strings look current.
- **Finding A1** (root `CLAUDE.md`): "buzz-in feature" — describes a feature that was never built (or was removed). Pure architectural fiction with no brand string to catch.
- **Finding 2.11** (`docs/plans/BEA-697-e2e-baseline-fix.md`): Records resolved bugs as still open — factual drift, not string drift.
- **Finding B2** (worktree CLAUDE.md): "Joolie Boolie" brand + Supabase auth in `.worktrees/wt-BEA-677/CLAUDE.md` — not touched by BEA-719 because BEA-719 ran against `git ls-files`, and worktree CLAUDE.md files are on-disk-only.
- **Finding C1** (MEMORY.md "Branding IN PROGRESS"): Stale status claim; BEA-719 can't update external user memory.
- **Iterator 5 convergence statement:** "APP_README_TEMPLATE semantic-Supabase bug shows BEA-719 did string-swap, not semantic rewrite." Names the mechanism explicitly.
- **Iterator 2 rewrite spec** treats 4 files as needing *semantic* rewrites, not string swaps; 977 lines of surgery plan.

### Mechanism
The cleanup playbook assumed "if the strings match, the meaning matches." This holds for code (because code is structural, and a renamed import either resolves or doesn't). It fails for prose, because prose describes concepts using many synonymous and unnamed references. A template saying "auth" implies a package; a doc saying "uses the online session model" implies removed infrastructure. These are architectural ghosts — references without names.

### Cross-theme relationships
- Tightly coupled with Theme 1: string-rebrand is *exactly* the kind of cleanup an unenforced surface can survive unscathed.
- Predicts Theme 5: historical leaks in git history are another kind of "content the string-swap can't reach."
- Reinforces Theme 4: MTP has many test cases whose *descriptions* name deleted features without using brand strings.

### Blind spots
Doesn't address *why* BEA-719 was scoped as string-only. The likely explanation is that a semantic rebrand requires reading every doc — which is expensive, and there was time pressure. So the theme's hidden variable is "cleanup budget vs. semantic coverage." The theme might be less about methodology and more about the budget that was allocated.

---

## Theme 3: Agent Context Surfaces Have No Lifecycle and No Gatekeeper

### Why this is a theme
Three findings from three different investigators (Area 4, Iterator 3, Iterator 4) independently surfaced **agent-specific context pollution** that the prior audit had scoped out. Together they describe a category of drift — "what the AI reads" — that has no owner, no rotation policy, no staleness signal, and no enforcement. This is not a subset of Theme 1: these surfaces drift for *additional* reasons beyond lack of enforcement, including their semi-persistent nature across sessions and their invisibility to git.

### Supporting evidence
- **Finding B1** (Area 4, Iterator 3): `.worktrees/wt-BEA-677-layout-constraints/` contains **30** pre-standalone CLAUDE.md files on disk, invisible to git, advertising Supabase + `@joolie-boolie/*`. An agent invoked with CWD in that worktree reads fiction as fact.
- **Iterator 3 inventory:** All **7** worktrees are orphaned; no lifecycle policy exists.
- **Finding A5 + Iterator 4 correction:** **22** `<claude-mem-context>` stubs (Area 4 said 21, Iterator 4 corrected the count) are orphaned one-time commits, not live claude-mem output. Iterator 4 falsified the Phase 1 hypothesis and identified the 2 that still cite OAuth/JWT: `apps/bingo/src/CLAUDE.md` (5 JWT entries) and `apps/trivia/src/CLAUDE.md` (OAuth/CORS).
- **Finding C1–C4** (MEMORY.md outside the repo): User's auto-memory claims "Rebrand IN PROGRESS," contradicts HEAD state; also contains stale `jb-` prefix claim in `project_standalone_conversion.md` reference. The file lives at `/Users/j/.claude/projects/.../memory/MEMORY.md` — outside any repo's enforcement domain.
- **Finding A2** (Context7 version pins in root CLAUDE.md): Pins lag actual package versions — a drift vector specifically because CLAUDE.md tells agents which version to fetch docs for.
- **Finding A1** (root CLAUDE.md "buzz-in"): A false feature claim that an agent implementing or testing would take as requirement.
- **Iterator 3 Absorption Chain** (line 126): explicitly models how a worktree CLAUDE.md → agent session → generated code produces poisoned output.
- **Finding A7** (`packages/audio/` has no CLAUDE.md): Coverage gap; agents have no context for this package.

### Mechanism
These files accumulate context-rot because:
1. They span multiple process boundaries (git tracked, on-disk, user-home, worktree). No single policy reaches all of them.
2. They are read but rarely written; a human editing code will not notice that CLAUDE.md still describes an old architecture unless they re-read it.
3. Worktrees specifically are designed to be disposable but nothing enforces disposal — so they collect context at the moment of creation and never update.
4. MEMORY.md is meant to persist learning; nothing distinguishes "learning that's still true" from "learning that has been invalidated."
5. claude-mem stubs masquerade as live auto-output; the truth (they're one-time Feb 2026 commits) only emerged after Iterator 4's disassembly.

### Cross-theme relationships
- Instance of Theme 1 (unenforced surface) but with an agent-specific blast radius.
- Interacts with Theme 2: worktree CLAUDE.md files contain *both* old brand strings and architectural prose, so a full cleanup would need both a string pass and a semantic pass.
- Orthogonal to Theme 4: MTP is human-read; agent context is agent-read. Both are "write-once" but for different reasons.

### Blind spots
I'm relying on the assumption that agents actually *do* read all these surfaces and are meaningfully affected by them. The evidence for this is indirect — nobody measured "how many sessions per week opened a worktree CLAUDE.md." If agents rarely hit these surfaces, the theme overweights them. Conversely, if the PUBLIC-repo finding from Theme 5 is taken seriously, agent-context pollution also becomes scrapable by adversaries — but that's speculative.

---

## Theme 4: Write-Once Test Plans and Documentation Run at a Different Cadence from Code

### Why this is a theme
`docs/MANUAL_TEST_PLAN.md` (85 test cases, 49% need work per Iterator 1) and to a lesser extent `docs/E2E_TESTING_GUIDE.md` (~8% churn) share a failure mode: they were written in a burst, integrated into no process that re-executes them, and therefore freeze while the code they describe continues to evolve. Execution-history dates (F3.16: last run 2026-03-02, month-old) make this literal.

### Supporting evidence
- **F3.1, F3.2** (MTP): Stories 2.2 and 3.2 "Room Setup" describe modals/flows that have been deleted. The tests cannot be executed because the UI they test doesn't exist.
- **F3.5, F3.6, F3.25** (MTP): Three test cases reference the removed `/question-sets` route. All will 404.
- **F3.8–F3.14** (MTP): **6 feature-shipped-no-test-coverage gaps** — `/api/health`, BEA-713 SetupGate, Trivia ChatGPT guide, BEA-685/687 template/preset stores, BEA-664 audio move, BEA-676/677 layout changes.
- **F3.16** (MTP): Execution history is stale — all runs from Feb/early-March 2026. No re-execution is happening.
- **F3.21** (MTP): Documents a "Skip to game controls" skip link that BEA-673 removed.
- **F3.19** (MTP): Numbering gap (tests 1-4 then 6-7) — a low-cost editorial error that persists because nobody re-reads.
- **Iterator 1 disposition:** 17 KEEP / 24 REWRITE / 18 DELETE / 18 ADD = **49% churn**. This magnitude suggests the plan has accumulated debt across many releases.
- **Findings 2.1–2.5** (E2E guide): selector table, deleted fixture names, removed spec file, obsolete troubleshooting — the guide was authoritative once and is now partial fiction.
- **Iterator 5 predictive risk statement:** "Manual test plan has no CI gate — drift will recur without one."

### Mechanism
Test plans (manual or prose-based) are written at feature-ship time as a kind of "contract." The plan is executed a few times, then the author moves on. Subsequent feature work updates the code and the automated tests but not the plan — because the plan is not part of the feature's acceptance criteria *after* the feature ships. Every feature adds 0-2 test cases and implicitly invalidates 0-2 existing ones; the invalidation is silent, so drift grows linearly with feature count.

### Cross-theme relationships
- Special case of Theme 1 with an extra mechanism: not just "no enforcement" but also "no re-execution cadence."
- Amplified by Theme 2: many MTP test cases describe removed features without using brand strings, so string-swap cleanups miss them.
- Contrasts with Theme 3: MTP is read by humans doing manual QA; agent-context files are read by AI. Both rot, but for slightly different reasons.

### Blind spots
Assumes test plans *should* keep pace with code. In some orgs, a stale test plan is acceptable as long as automated tests cover the equivalent surface. If trivia's E2E suite covers everything MTP covers, then MTP drift is cosmetic. I don't see evidence either way in the packets — the theme assumes the plan has intrinsic value separate from automated tests.

---

## Theme 5: Historical Leaks Outlive the Runtime — The Public-Repo Reframing

### Why this is a theme
Iterator 5 flagged that `julianken/hosted-game-night` is **public**, and the prior audit's URGENT item U1 (Supabase service-role key leak) is "INVALIDATED" by the project's deletion *but* the leaked blob remains scannable in git history. This is a distinct theme because (a) it's not about drift between code and docs — it's about drift between *the security model assumed at leak-time* and *the security model that now holds*; (b) no amount of documentation or code cleanup addresses it; and (c) it generalizes — *any* historical content in git history is now an external attack surface in ways that weren't true while the repo was private.

### Supporting evidence
- **Phase 2 packet finding:** `julianken/hosted-game-night` is PUBLIC (live-verified).
- **Iterator 5 U1 status:** Supabase project deleted → key no longer grants access → but the leaked blob is still externally scannable.
- **U2 (Sentry + Grafana tokens): OPEN.** No evidence of rotation — if any of these tokens were ever committed (not verified in Phase 2), the public-repo framing applies.
- **Finding B2** (worktree CLAUDE.md): Contains `.secrets/observability-accounts.json` paths referenced in prose — not the secret itself, but evidence that a secrets file pattern exists and could have been committed.
- **Iterator 3 Absorption Chain:** Worktrees can be accessed by anyone who can read the disk; worktree secrets are not protected by `git ls-files`.
- **MEMORY.md contains Grafana Cloud endpoint host name** (observability block); if MEMORY.md is ever copy-pasted into a public surface, it leaks topology even if not tokens.

### Mechanism
When a repo transitions private → public (or is made public at creation), the threat model inverts: every historical blob becomes externally discoverable by secret scanners. This is invisible in a drift audit framed around "code vs. docs" because the drift here is between "assumed confidentiality" and "actual confidentiality." A private repo can tolerate sloppy secret hygiene historically; a public repo cannot, retroactively.

### Cross-theme relationships
- Orthogonal to Themes 1–4, but amplifies them: if agent context files (Theme 3) ever contained secrets, they're now externally visible too.
- Bounds the impact of Theme 2: even a perfect semantic rebrand doesn't rewrite git history, so the old architecture lives on in commits.

### Blind spots
This is the weakest theme by exemplar count — it rests on one or two findings. I'm including it because the shift in framing is load-bearing, not because the evidence is thick. It may belong in recommendations rather than as a full theme. Also, I don't know when the repo became public; Iterator 5 didn't date it, so I can't assess the window of exposure.

---

## Confidence

### Strong themes
- **Theme 1 (enforced vs. advisory surfaces)**: Strongest. Every Phase 1 finding maps cleanly; the asymmetry is quantitatively visible in Iterator 5's "40% of commits vs 2" statistic. Would be falsified only by finding that a clean advisory surface drifted silently despite no sprint coverage, or that code drifted despite compiler coverage — neither appears in the evidence.
- **Theme 2 (semantic rebrand gap)**: Strong. Multiple independent findings (2.8–2.10, A1, C1, B2) exhibit the same mechanism — prose describes deleted systems without using brand strings. Would be falsified by finding that BEA-719 *did* do semantic work but missed these for other reasons; the commit log suggests it did not.
- **Theme 3 (agent context hygiene)**: Strong by breadth of evidence but speculative on impact magnitude. Three independent investigators (Area 4, Iterator 3, Iterator 4) surfaced the category. Would be falsified by showing agents rarely read these surfaces in practice.

### Weaker themes
- **Theme 4 (test plan cadence)**: Medium-strong. Well-evidenced for the MTP specifically (Iterator 1's 49% churn is a hard number), but the generalization to "all test-adjacent docs" relies on the E2E guide as a second case. Could be stronger with more instances.
- **Theme 5 (historical leaks)**: Weak. One load-bearing discovery, few exemplars. Included because the framing shift matters; may reduce to a recommendation rather than a theme.

### What could falsify each
- Theme 1: finding an unenforced surface with zero drift that had no sprint coverage (negative evidence).
- Theme 2: finding a drift case where the miss was *not* due to string vs. semantic gap.
- Theme 3: measuring session CWD logs and finding agents rarely read worktrees / stale CLAUDE.md.
- Theme 4: finding that MTP content is fully covered by automated tests (making drift cosmetic).
- Theme 5: verifying the repo is actually private, or that no secrets ever made it to git history.

---

## Blind Spots of the Thematic Lens

- **Bias toward mechanism over severity.** I picked themes for their generativeness, not their urgency. The security theme is weak by my criteria but may be the *most* urgent; a severity-weighted lens would order differently. Synthesis 2 or 3 should correct this.
- **No theme for intentional staleness.** ADRs (2.13) and archived docs are correctly stale as historical records. My themes don't distinguish "drift" from "intentional past-tense," which could lead a reader to over-apply prevention measures.
- **Assumes drift is bad.** In a rapidly evolving AI-developed codebase, some prose drift may be a normal byproduct of experimentation velocity. "Too much enforcement" is a real cost; my themes frame enforcement as unambiguously good.
- **Monorepo structural contribution underexplored.** Turborepo + pnpm workspaces + per-package CLAUDE.md files create many more context surfaces than a monolith would. A "monorepo tax" theme is defensible but I folded it into Themes 1 and 3 rather than splitting it out.
- **AI-agent-specific failure modes may be broader than Theme 3.** Agents also hallucinate architecture from ambiguous docs; the drift between "what docs imply" and "what docs assert" is a different axis I didn't explore.
- **No theme for process-level signals.** The cleanup sprints (BEA-702, BEA-719) *themselves* are a pattern — they work, but reactively and with gaps. "Cleanup-as-sprint" vs "cleanup-as-continuous" is a meta-theme I compressed into Theme 1.

---

## Recommendations (high-level only, NOT implementation plans)

1. **Treat AI-agent-readable surfaces as a first-class concern with its own hygiene policy.** Worktrees, CLAUDE.md files (tracked + on-disk), MEMORY.md, and claude-mem stubs collectively form an "agent context layer" that currently has no owner, no lifecycle, and no staleness signal. Any future standalone-conversion-scale cleanup should treat this layer as a peer of code cleanup, not a byproduct.
2. **Future cleanup sprints need a semantic review phase, not just a string-swap phase.** The next cleanup will leave the same residue unless the methodology changes. A checklist that asks "which of these sentences describes deleted architecture?" for each touched doc would catch Finding 2.8-class issues.
3. **Test plans and prose guides need a re-execution/re-validation cadence** or an explicit acknowledgment that they are reference material that will drift. The current state — MTP last executed ~2026-03-02 — is neither "living document" nor "archive"; this ambiguity is where drift hides.
4. **The public-repo + git history question deserves a dedicated security review** independent of this audit's drift framing. It is not a documentation problem.
5. **Consider gating doc-adjacent changes with lightweight prose checks** — e.g., when a package is deleted, a check that greps docs for the package name and flags survivors; when a route is deleted, a check that greps the MTP. This is Theme-1 enforcement applied to the specific high-drift surfaces.
6. **Establish a "cleanup budget → semantic coverage" expectation.** Document explicitly whether a given cleanup sprint is string-level (cheap, fast, incomplete) or semantic-level (expensive, thorough) so the resulting residue is known in advance, not discovered by audit.
