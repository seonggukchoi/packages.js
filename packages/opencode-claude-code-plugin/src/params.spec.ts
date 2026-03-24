import { describe, expect, it } from 'vitest';

import { normalizeChatParams } from './params.js';

describe('normalizeChatParams', () => {
  it('fills default values for the claude-code provider', () => {
    const output = {
      options: {
        effort: 'high',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'claude-code',
        },
      },
      output,
      { cwd: '/workspace' },
    );

    expect(output.options).toEqual({
      bridgeOpenCodeMcp: false,
      claudeMdPath: undefined,
      cwd: '/workspace',
      effort: 'high',
      env: {},
      loadClaudeMd: false,
      maxTurns: 12,
      mcpServers: {},
      pathToClaudeCodeExecutable: 'claude',
      settingSources: [],
    });
  });

  it('does nothing for other providers', () => {
    const output = {
      options: {
        cwd: '/tmp',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'openai',
        },
      },
      output,
      { cwd: '/workspace' },
    );

    expect(output.options).toEqual({ cwd: '/tmp' });
  });
});
