import { describe, expect, it } from 'vitest';

import ClaudeCodePlugin from './index.js';

type PluginContextInput = Parameters<typeof ClaudeCodePlugin>[0];
type ResolvedPlugin = Awaited<ReturnType<typeof ClaudeCodePlugin>>;

describe('ClaudeCodePlugin', () => {
  it('wires chat params and system transform hooks for the claude-code provider', async () => {
    const plugin = await ClaudeCodePlugin({ worktree: '/repo' } as PluginContextInput);
    const paramsOutput = {
      options: {} as Record<string, unknown>,
      temperature: 0,
      topK: 0,
      topP: 0,
    };
    const systemOutput = { system: [] as string[] };

    await plugin['chat.params']?.(createChatParamsInput() as Parameters<ResolvedPlugin['chat.params']>[0], paramsOutput);
    await plugin['experimental.chat.system.transform']?.(
      createChatParamsInput() as Parameters<ResolvedPlugin['experimental.chat.system.transform']>[0],
      systemOutput,
    );

    expect(paramsOutput.options.cwd).toBe('/repo');
    expect(systemOutput.system).toHaveLength(1);
  });
});

function createChatParamsInput() {
  return {
    model: { providerID: 'claude-code' },
  };
}
