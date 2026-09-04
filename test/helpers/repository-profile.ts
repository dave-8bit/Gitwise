import type { RepositoryProfile } from '../../src/inspect/profile';

export function makeRepositoryProfile(): RepositoryProfile {
  return {
    root: '/repo',
    rootEvidence: '/repo/.git',
    inventory: {
      fileCount: 12,
      totalSizeBytes: 3456,
    },
    languages: {
      primary: 'TypeScript',
      secondary: ['JavaScript'],
      confidence: 0.91,
      evidence: ['src/index.ts'],
    },
    frameworks: {
      primary: 'Express',
      secondary: [],
      category: 'backend',
      confidence: 0.8,
      evidence: ['express dependency'],
    },
    buildTools: {
      primary: 'tsup',
      secondary: [],
      confidence: 0.75,
      evidence: ['tsup dependency'],
    },
    packageManager: {
      detected: 'npm',
      confidence: 1,
      evidence: ['package-lock.json'],
    },
    dependencies: {
      dependencies: {
        express: '^5.0.0',
        chalk: '^5.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        vitest: '^4.0.0',
      },
      all: new Set(['express', 'chalk', 'typescript', 'vitest']),
      packageManager: 'npm@11.0.0',
      scripts: {
        test: 'vitest run',
      },
    },
    testing: {
      primary: 'Vitest',
      secondary: [],
      confidence: 1,
      evidence: ['vitest.config.ts'],
    },
    linting: {
      primary: 'ESLint',
      secondary: [],
      confidence: 0.8,
      evidence: ['eslint.config.js'],
    },
    formatting: {
      primary: 'Prettier',
      secondary: [],
      confidence: 0.8,
      evidence: ['.prettierrc'],
    },
    database: {
      primary: 'SQLite',
      secondary: [],
      confidence: 0.8,
      evidence: ['better-sqlite3 dependency'],
    },
    orm: {
      primary: 'Drizzle',
      secondary: [],
      confidence: 0.8,
      evidence: ['drizzle-orm dependency'],
    },
    architecture: {
      monorepo: true,
      workspaceManager: 'npm',
      confidence: 0.88,
      evidence: ['package.json workspaces field'],
      directories: {
        apps: true,
        packages: true,
        libs: false,
        services: false,
        frontend: false,
        backend: true,
        api: true,
        functions: false,
      },
    },
    health: {
      score: 80,
      grade: 'Good',
      recommendations: [],
      evidence: ['Found: README'],
      present: ['README'],
      missing: [],
    },
  };
}