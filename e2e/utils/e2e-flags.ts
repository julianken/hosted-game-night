/**
 * Runtime E2E flags applied via browser-context addInitScript.
 *
 * Why window global, not `process.env`: Next.js only inlines `NEXT_PUBLIC_*`
 * env vars into the client bundle. A plain `process.env.E2E_TESTING` read in
 * a Client Component resolves to `undefined` at runtime (via Turbopack's
 * `process` polyfill). Setting a window global via `page.context().addInitScript`
 * is the reliable escape hatch: the script runs in every page of the context
 * (including popups opened by `window.open`) BEFORE any app code evaluates,
 * so the app's `useState(() => window.__E2E_TESTING__ === true)` initializer
 * sees the flag on its very first render.
 *
 * Production builds never have this script injected, so the flag is always
 * `undefined` and the overlay renders normally.
 */
import type { BrowserContext } from '@playwright/test';

export async function applyE2ERuntimeFlags(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    (window as Window & { __E2E_TESTING__?: boolean }).__E2E_TESTING__ = true;
  });
}
