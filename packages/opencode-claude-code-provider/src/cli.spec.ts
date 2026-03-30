import { describe, expect, it } from 'vitest';

import { buildCliArgs } from './cli.js';

describe('buildCliArgs', () => {
  it('builds print-mode args without deprecated bare flag', () => {
    const args = buildCliArgs({ maxTurns: 3, model: 'sonnet' });

    expect(args).toContain('-p');
    expect(args).not.toContain('--bare');
    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
    expect(args).toContain('--tools');
    expect(args).toContain('');
  });

  it('includes optional system prompt and resume session id', () => {
    const args = buildCliArgs({
      maxTurns: 5,
      model: 'claude-sonnet-4-5',
      resumeSessionId: 'sess_123',
      system: 'You are helpful.',
    });

    expect(args).toContain('--system-prompt');
    expect(args).toContain('You are helpful.');
    expect(args).toContain('--resume');
    expect(args).toContain('sess_123');
  });
});
