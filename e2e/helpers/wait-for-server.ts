/**
 * Health check helper for E2E test infrastructure.
 * Ensures servers are ready before tests start.
 */

/**
 * Wait for a server to be ready by polling its health endpoint.
 * Retries with exponential backoff until server responds with OK status.
 *
 * @param url - Server URL to check (e.g., 'http://localhost:3002')
 * @param maxRetries - Maximum number of retry attempts (default: 30)
 * @param retryDelay - Initial delay between retries in ms (default: 1000)
 * @throws Error if server not ready after max retries
 */
export async function waitForServer(
  url: string,
  maxRetries = 30,
  retryDelay = 1000
): Promise<void> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        // Don't follow redirects - we just need to know server is responding
        redirect: 'manual',
      });

      // Server is ready if it responds with any HTTP status
      // (200 OK, 302 redirect to login, etc.)
      if (response.status >= 200 && response.status < 500) {
        console.log(`✓ Server ready at ${url} (attempt ${i + 1}/${maxRetries})`);
        return;
      }

      lastError = new Error(`Server returned status ${response.status}`);
    } catch (error) {
      // Network error - server not ready yet
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Wait before retrying (with exponential backoff)
    const delay = retryDelay * Math.min(2 ** Math.floor(i / 5), 4);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(
    `Server at ${url} not ready after ${maxRetries} attempts.\n` +
      `Last error: ${lastError?.message}`
  );
}

/**
 * Wait for multiple servers to be ready in parallel.
 *
 * @param servers - Array of server URLs to check
 * @param maxRetries - Maximum number of retry attempts per server
 * @throws Error if any server not ready after max retries
 */
export async function waitForServers(
  servers: string[],
  maxRetries = 30
): Promise<void> {
  console.log(`Waiting for ${servers.length} server(s) to be ready...`);
  await Promise.all(servers.map((url) => waitForServer(url, maxRetries)));
  console.log('All servers ready!');
}
