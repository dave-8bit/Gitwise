import { describe, expect, it } from 'vitest';

import {
  formatArchitecture,
  formatDependencies,
  formatRepositoryStats,
  formatDoctor,
  formatRepositoryTree,
} from '../../src/inspect/formatter';
import { makeRepositoryProfile } from '../helpers/repository-profile';

describe('repository intelligence formatters', () => {
  it('formats detected architecture with status, workspace, confidence, evidence, and directories', () => {
    const output = formatArchitecture(makeRepositoryProfile().architecture);

    expect(output).toContain('Monorepo: Yes');
    expect(output).toContain('Workspace Manager: npm');
    expect(output).toContain('Confidence: 0.88');
    expect(output).toContain('package.json workspaces field');
    expect(output).toContain('apps, packages, backend, api');
  });

  it('formats an undetected architecture cleanly', () => {
    const architecture = makeRepositoryProfile().architecture;
    architecture.monorepo = false;
    architecture.workspaceManager = undefined;
    architecture.confidence = 0;
    architecture.evidence = [];
    for (const key of Object.keys(architecture.directories) as Array<keyof typeof architecture.directories>) {
      architecture.directories[key] = false;
    }

    const output = formatArchitecture(architecture);

    expect(output).toContain('Monorepo: No');
    expect(output).toContain('Workspace Manager: Not detected');
    expect(output).toContain('Confidence: 0');
    expect(output).toContain('    - Not detected');
    expect(output).toContain('    None');
  });

  it('keeps runtime and development dependencies separate with counts', () => {
    const profile = makeRepositoryProfile();
    const output = formatDependencies(profile.dependencies, profile.packageManager);

    expect(output).toContain('Runtime Count: 2');
    expect(output).toContain('Development Count: 2');
    expect(output).toContain('Total Count: 4');
    expect(output).toContain('Package Manager: npm');
    expect(output).toContain('    - chalk');
    expect(output).toContain('    - express');
    expect(output).toContain('    - typescript');
    expect(output).toContain('    - vitest');
  });

  it('formats an empty dependency state', () => {
    const profile = makeRepositoryProfile();
    profile.dependencies = {
      dependencies: {},
      devDependencies: {},
      all: new Set(),
    };
    profile.packageManager = {
      detected: 'unknown',
      confidence: 0,
      evidence: [],
    };

    const output = formatDependencies(profile.dependencies, profile.packageManager);

    expect(output).toContain('Runtime Count: 0');
    expect(output).toContain('Development Count: 0');
    expect(output).toContain('Total Count: 0');
    expect(output).toContain('Package Manager: Not detected');
    expect(output).toContain('  Runtime:\n    None');
    expect(output).toContain('  Development:\n    None');
  });

  it('formats only profile-backed repository statistics', () => {
    const output = formatRepositoryStats(makeRepositoryProfile());

    expect(output).toContain('Files: 12');
    expect(output).toContain('Total Size Bytes: 3456');
    expect(output).toContain('Primary Language: TypeScript');
    expect(output).toContain('Secondary Languages: JavaScript');
    expect(output).toContain('Language Confidence: 0.91');
    expect(output).toContain('Runtime Dependencies: 2');
    expect(output).toContain('Development Dependencies: 2');
    expect(output).toContain('Total Dependencies: 4');
    expect(output).toContain('Architecture: Monorepo');
    expect(output).toContain('Framework: Express');
    expect(output).toContain('Build Tool: tsup');
    expect(output).not.toContain('LOC');
    expect(output).not.toContain('Source Files');
    expect(output).not.toContain('Test Files');
  });

  it('formats a populated doctor report with deterministic sections and evidence', () => {
    const output = formatDoctor(makeRepositoryProfile());

    expect(output).toContain('Repository');
    expect(output).toContain('Health');
    expect(output).toContain('Score: 80');
    expect(output).toContain('Grade: Good');
    expect(output).toContain('Recommendations\n  None');
    expect(output).toContain('Tooling');
    expect(output).toContain('Testing:\n    Primary: Vitest');
    expect(output).toContain('Architecture');
    expect(output).toContain('Monorepo: Yes');
    expect(output).toContain('Dependencies');
    expect(output).toContain('Runtime Count: 2');
    expect(output).toContain('Development Count: 2');
    expect(output).toContain('    - chalk\n    - express');
    expect(output).toContain('Inventory');
    expect(output).toContain('Files: 12');
    expect(output).toContain('Evidence');
    expect(output).toContain('vitest.config.ts');
  });

  it('formats missing detector values and health recommendations without inventing recommendations', () => {
    const profile = makeRepositoryProfile();
    profile.testing = { primary: undefined, secondary: [], confidence: 0, evidence: ['No testing framework evidence found'] };
    profile.linting = { primary: undefined, secondary: [], confidence: 0, evidence: ['No linting tool evidence found'] };
    profile.formatting = { primary: undefined, secondary: [], confidence: 0, evidence: ['No formatting tool evidence found'] };
    profile.health.recommendations = ['Add a README.md.'];

    const output = formatDoctor(profile);

    expect(output).toContain('Testing:\n    Not detected');
    expect(output).toContain('Linting:\n    Not detected');
    expect(output).toContain('Recommendations\n  - Add a README.md.');
    expect(output).not.toContain('Run ESLint');
    expect(output).not.toContain('Run tests');
  });

  it('formats an empty dependency state', () => {
    const profile = makeRepositoryProfile();
    profile.dependencies = { dependencies: {}, devDependencies: {}, all: new Set() };

    const output = formatDoctor(profile);

    expect(output).toContain('Runtime Count: 0');
    expect(output).toContain('Development Count: 0');
    expect(output).toContain('Total Count: 0');
    expect(output).toContain('  Runtime:\n    None');
    expect(output).toContain('  Development:\n    None');
  });

  it('formats a deterministic repository tree with depth-limited descendants', () => {
    const tree = {
      children: [
        {
          name: 'src',
          kind: 'directory' as const,
          children: [
            {
              name: 'commands',
              kind: 'directory' as const,
              children: [
                {
                  name: 'doctor.ts',
                  kind: 'file' as const,
                  children: [],
                },
                {
                  name: 'nested',
                  kind: 'directory' as const,
                  children: [{ name: 'hidden.ts', kind: 'file' as const, children: [] }],
                },
              ],
            },
            { name: 'index.ts', kind: 'file' as const, children: [] },
          ],
        },
        { name: 'README.md', kind: 'file' as const, children: [] },
      ],
    };

    const output = formatRepositoryTree('C:/repo', tree, 3);

    expect(output).toContain('Repository: C:/repo');
    expect(output).toContain('Tree:');
    expect(output).toContain('├── src/');
    expect(output).toContain('│   ├── commands/');
    expect(output).toContain('│   │   ├── doctor.ts');
    expect(output).toContain('│   │   └── nested/');
    expect(output).toContain('│   │       └── ...');
    expect(output).toContain('└── README.md');
    expect(output).not.toContain('C:/repo/src');
    expect(formatRepositoryTree('C:/repo', tree, 3)).toBe(output);
  });

  it('formats an empty tree', () => {
    expect(formatRepositoryTree('C:/repo', { children: [] }, 3)).toBe(
      'Repository: C:/repo\n\nTree:\n(empty)',
    );
  });
});