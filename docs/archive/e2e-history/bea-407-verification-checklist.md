# BEA-407 Verification Checklist

## Pre-Test Setup

### Environment Validation

- [ ] All `.env.local` files exist
  ```bash
  ls -la apps/bingo/.env.local
  ls -la apps/trivia/.env.local
  ls -la apps/platform-hub/.env.local
  ls -la .env
  ```

- [ ] SESSION_TOKEN_SECRET is valid (64-char hex)
  ```bash
  # Should show 64-character hex string in all files
  grep SESSION_TOKEN_SECRET apps/*/.env.local .env
  ```

- [ ] No servers running on test ports
  ```bash
  # Should return empty (no output)
  lsof -i:3000,3001,3002
  ```

### Script Validation

- [ ] E2E build script is executable
  ```bash
  ls -la scripts/e2e-with-build.sh
  # Should show: -rwxr-xr-x
  ```

- [ ] Script passes syntax check
  ```bash
  bash -n scripts/e2e-with-build.sh
  # Should return no errors
  ```

## Test Execution - Run 1

### Execute Test Suite

```bash
# Clear previous results
rm -rf test-results playwright-report

# Run full E2E suite
pnpm test:e2e

# Capture build logs
cp /tmp/e2e-build.log test-results/run1-build.log

# Capture server logs
cp /tmp/e2e-*.log test-results/
```

### Verify Results

- [ ] Build succeeded (check console output)
- [ ] All 3 servers started (ports 3000, 3001, 3002)
- [ ] Tests completed without interruption
- [ ] Servers cleaned up on exit

### Check Test Summary

```bash
pnpm test:e2e:summary
```

**Record metrics:**
- Total tests: ____
- Passed: ____
- Failed: ____
- Skipped: ____
- Execution time: ____ min

**Check for connection errors:**
```bash
grep -r "Could not connect to the server" test-results/
```

- [ ] Zero connection errors
- [ ] Failure count matches expected baseline (if any)

### Inspect Logs

```bash
# Check build logs
tail -100 /tmp/e2e-build.log

# Check server logs for crashes
grep -i "error\|crash\|killed" /tmp/e2e-*.log

# Check memory usage during test (if still running)
ps aux | grep next-server | awk '{print $3, $4, $11}'
```

- [ ] No build errors
- [ ] No server crashes
- [ ] Memory usage stable (<5% per server)

## Test Execution - Run 2

### Execute Test Suite (Second Run)

```bash
# Clear previous results
rm -rf test-results playwright-report

# Run full E2E suite again
pnpm test:e2e

# Save results
cp /tmp/e2e-build.log test-results/run2-build.log
cp /tmp/e2e-*.log test-results/
```

### Verify Results

- [ ] Build succeeded
- [ ] All 3 servers started
- [ ] Tests completed
- [ ] Servers cleaned up

### Check Test Summary

```bash
pnpm test:e2e:summary
```

**Record metrics:**
- Total tests: ____
- Passed: ____
- Failed: ____
- Skipped: ____
- Execution time: ____ min

**Compare to Run 1:**
- [ ] Pass/fail counts match Run 1 (±5% acceptable)
- [ ] No new connection errors
- [ ] Execution time within 10% of Run 1

## Test Execution - Run 3

### Execute Test Suite (Third Run)

```bash
# Clear previous results
rm -rf test-results playwright-report

# Run full E2E suite one more time
pnpm test:e2e

# Save results
cp /tmp/e2e-build.log test-results/run3-build.log
cp /tmp/e2e-*.log test-results/
```

### Verify Results

- [ ] Build succeeded
- [ ] All 3 servers started
- [ ] Tests completed
- [ ] Servers cleaned up

### Check Test Summary

```bash
pnpm test:e2e:summary
```

**Record metrics:**
- Total tests: ____
- Passed: ____
- Failed: ____
- Skipped: ____
- Execution time: ____ min

**Compare to Run 1 & 2:**
- [ ] Pass/fail counts consistent across all runs
- [ ] No connection errors in any run
- [ ] Execution time stable (±10%)

## Success Criteria

### Critical Requirements (Must Pass)

- [ ] **Zero connection errors** across all 3 runs
  ```bash
  grep -r "Could not connect to the server" test-results/run*.log
  # Should return: (no matches)
  ```

- [ ] **No server crashes** during test execution
  ```bash
  grep -i "crash\|killed\|signal" /tmp/e2e-*.log
  # Should return: (no matches or only cleanup signals)
  ```

- [ ] **Stable results** across 3 runs (pass/fail counts within ±5%)

- [ ] **Test execution time <5min** per run

### Performance Metrics

| Metric | Baseline (Dev Mode) | Target (Prod Mode) | Actual Run 1 | Actual Run 2 | Actual Run 3 |
|--------|-------------------|-------------------|--------------|--------------|--------------|
| Total Tests | 345 | 345 | ____ | ____ | ____ |
| Connection Errors | 90-338 | 0 | ____ | ____ | ____ |
| Execution Time | 3.9min (crashes) | <5min | ____min | ____min | ____min |
| Server Crashes | Yes | No | ____ | ____ | ____ |

### Expected Outcomes

**Production build mode should:**
- ✅ Complete all 345 tests without server crashes
- ✅ Zero "Could not connect to the server" errors
- ✅ Consistent pass/fail counts across runs
- ✅ Total time ~4-5min (including 30-60s build overhead)

## Troubleshooting

### If Connection Errors Still Occur

1. **Check server health:**
   ```bash
   curl -I http://localhost:3000
   curl -I http://localhost:3001
   curl -I http://localhost:3002
   ```

2. **Inspect server logs:**
   ```bash
   tail -100 /tmp/e2e-bingo.log
   tail -100 /tmp/e2e-trivia.log
   tail -100 /tmp/e2e-hub.log
   ```

3. **Check memory/CPU:**
   ```bash
   ps aux | grep next-server
   # Should show <10% CPU when idle, <500MB memory per server
   ```

4. **Verify build output:**
   ```bash
   ls -la apps/bingo/.next/
   ls -la apps/trivia/.next/
   ls -la apps/platform-hub/.next/
   # Should show BUILD_ID files and server chunks
   ```

### If Build Fails

1. **Clean and rebuild:**
   ```bash
   pnpm clean
   pnpm install
   pnpm build
   ```

2. **Check for dependency issues:**
   ```bash
   pnpm list --depth 0
   ```

3. **Verify .env files:**
   ```bash
   cat apps/bingo/.env.local | grep SESSION_TOKEN_SECRET
   # Should show 64-char hex
   ```

### If Tests Are Flaky (Different Results Each Run)

1. **Check for test.only or test.skip:**
   ```bash
   grep -r "test\.only\|test\.skip" e2e/
   ```

2. **Run specific failing test:**
   ```bash
   pnpm test:e2e e2e/<failing-test>.spec.ts --headed
   ```

3. **Check for BroadcastChannel leakage:**
   ```bash
   grep -r "BroadcastChannel" e2e/
   # Ensure all tests have beforeEach cleanup
   ```

## Final Validation

### Documentation Updated

- [ ] CLAUDE.md reflects production build as default
- [ ] E2E_TESTING_GUIDE.md has both modes documented
- [ ] package.json scripts updated
- [ ] Implementation plan document created

### Code Review Checklist

- [ ] `/scripts/e2e-with-build.sh` has proper error handling
- [ ] Script cleans up servers on exit (trap)
- [ ] Health checks before running tests
- [ ] Logs redirect to `/tmp/` for debugging

### Linear Issue Update

- [ ] BEA-407 status updated to "In Review"
- [ ] Test results attached (all 3 runs)
- [ ] Metrics recorded (before/after comparison)
- [ ] Solution documented (link to implementation plan)

## Sign-Off

**Implementer:** _______________
**Date:** _______________

**Test Results:**
- Run 1: ____ passed, ____ failed, ____ connection errors
- Run 2: ____ passed, ____ failed, ____ connection errors
- Run 3: ____ passed, ____ failed, ____ connection errors

**Conclusion:**
- [ ] PASS - Ready for PR
- [ ] FAIL - Needs investigation (attach logs and findings)

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________
