import { describe, it, expect, vi, beforeEach } from 'vitest';
import childProcess from 'child_process';

/**
 * Security regression tests for the commit command.
 *
 * The commit message originates from untrusted AI output. Previously the code
 * interpolated the message directly into a shell command:
 *
 *   execSync(`git commit -m "${message}"`, ...)
 *
 * That allowed an AI-generated message such as `fix: x"; rm -rf /; #` (or
 * containing `&&`, backticks, `$()`, etc.) to be interpreted as shell syntax
 * and executed. The remediation uses execFileSync with an argument array, which
 * never invokes a shell and passes the message as a single argv element.
 *
 * These tests mock process execution and assert that the message is always
 * forwarded as exactly one argument — never re-parsed as shell syntax.
 */

// Mock child_process BEFORE importing the module under test so commit.ts picks
// up the mocked execFileSync. No real processes are ever spawned.
vi.mock('child_process', () => ({
  __esModule: true,
  default: {
    execFileSync: vi.fn(() => undefined),
  },
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/utils/git', () => ({
  validateRepo: vi.fn().mockResolvedValue(undefined),
  getStagedDiff: vi.fn().mockResolvedValue('diff --git a/file b/file\n+change'),
  trimDiff: vi.fn((diff: string) => diff),
}));

vi.mock('../../src/core/ai/ai.service', () => ({
  AIService: {
    chatWithFallback: vi.fn().mockResolvedValue({ content: 'safe default message' }),
  },
}));

vi.mock('../../src/core/ai/ai.request-builder', () => ({
  buildAIRequest: vi.fn((req: unknown) => req),
}));

vi.mock('../../src/ai/prompts', () => ({
  commitSystemPrompt: vi.fn(() => 'system'),
  commitUserPrompt: vi.fn(() => 'user'),
}));

vi.mock('../../src/ai/get-repository-context', () => ({
  getRepositoryContext: vi.fn(() => ({})),
}));

vi.mock('../../src/utils/display', () => ({
  spinner: {
    text: '',
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  },
  printSuccess: vi.fn(),
  printError: vi.fn(),
  printHeader: vi.fn(),
  printInfo: vi.fn(),
  printDivider: vi.fn(),
  printWarning: vi.fn(),
}));

import { commitCommand } from '../../src/commands/commit';
import { AIService } from '../../src/core/ai/ai.service';
import { confirm } from '@inquirer/prompts';

const execFileSyncMock = vi.mocked(childProcess.execFileSync);

describe('commit command — command injection safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user confirms, AI returns a benign message.
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(AIService.chatWithFallback).mockResolvedValue({
      content: 'feat: add feature',
    });
  });

  const hostilePayloads: Array<{ name: string; payload: string }> = [
    { name: 'semicolon', payload: 'feat: safe; touch /tmp/pwned' },
    { name: 'double ampersand', payload: 'feat: safe && touch /tmp/pwned' },
    { name: 'pipe', payload: 'feat: safe | echo pwned' },
    { name: 'command substitution', payload: 'feat: safe $(touch /tmp/pwned)' },
    { name: 'backticks', payload: 'feat: safe `touch /tmp/pwned`' },
    { name: 'embedded double quotes', payload: 'feat: safe"; touch /tmp/pwned; "' },
    { name: 'embedded single quotes', payload: "feat: safe'; touch /tmp/pwned; '" },
    { name: 'newline', payload: 'feat: first line\ntouch /tmp/pwned' },
  ];

  it.each(hostilePayloads)(
    'passes "$name" message as a single argument (no shell interpolation)',
    async ({ payload }) => {
      vi.mocked(AIService.chatWithFallback).mockResolvedValue({ content: payload });

      await commitCommand();

      expect(execFileSyncMock).toHaveBeenCalledTimes(1);
      expect(execFileSyncMock).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', payload],
        { stdio: 'inherit' }
      );
    }
  );

  it('calls git via execFileSync, not via a shell command string', async () => {
    await commitCommand();

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'git',
      ['commit', '-m', 'feat: add feature'],
      { stdio: 'inherit' }
    );
  });

  it('prints success when execFileSync succeeds', async () => {
    await commitCommand();
    const { printSuccess, printError } = await import('../../src/utils/display');

    expect(printSuccess).toHaveBeenCalledWith('Commit created successfully!');
    expect(printError).not.toHaveBeenCalledWith('Failed to create commit.');
  });

  it('preserves error handling when the git commit fails', async () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('commit failed');
    });

    await commitCommand();
    const { printError } = await import('../../src/utils/display');

    expect(printError).toHaveBeenCalledWith('Failed to create commit.');
  });

  it('skips execution when the user declines the message', async () => {
    vi.mocked(confirm).mockResolvedValue(false);

    await commitCommand();

    expect(execFileSyncMock).not.toHaveBeenCalled();
  });
});
