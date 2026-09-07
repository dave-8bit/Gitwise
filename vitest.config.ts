import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'parallel',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: ['test/core/repository/repository.identity.test.ts'],
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'repository identity',
          environment: 'node',
          include: ['test/core/repository/repository.identity.test.ts'],
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});

