import { describe, expect, it } from 'vitest';

import { getClaudeCodeHealthcheckCommands } from './health.js';

describe('getClaudeCodeHealthcheckCommands', () => {
  it('returns the expected Claude CLI health check commands', () => {
    expect(getClaudeCodeHealthcheckCommands()).toEqual(['claude --version', 'claude auth status || claude doctor']);
  });
});
