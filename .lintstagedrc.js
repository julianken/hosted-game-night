export default {
  '*': (stagedFiles) => {
    // Map staged file paths to turbo package filters
    const packageMap = {
      'apps/bingo/': '@joolie-boolie/bingo',
      'apps/trivia/': '@joolie-boolie/trivia',
      'apps/platform-hub/': '@joolie-boolie/platform-hub',
      'packages/sync/': '@joolie-boolie/sync',
      'packages/ui/': '@joolie-boolie/ui',
      'packages/theme/': '@joolie-boolie/theme',
      'packages/auth/': '@joolie-boolie/auth',
      'packages/database/': '@joolie-boolie/database',
      'packages/types/': '@joolie-boolie/types',
      'packages/audio/': '@joolie-boolie/audio',
      'packages/game-engine/': '@joolie-boolie/game-engine',
      'packages/error-tracking/': '@joolie-boolie/error-tracking',
      'packages/testing/': '@joolie-boolie/testing',
    };

    const packages = new Set();
    for (const file of stagedFiles) {
      for (const [prefix, pkg] of Object.entries(packageMap)) {
        if (file.includes(prefix)) {
          packages.add(pkg);
          break;
        }
      }
    }

    if (packages.size === 0) return [];

    const filters = [...packages].map((p) => `--filter=${p}...`).join(' ');
    return [
      `turbo run lint ${filters}`,
      `turbo run typecheck ${filters}`,
      `turbo run test:run ${filters}`,
    ];
  },
};
