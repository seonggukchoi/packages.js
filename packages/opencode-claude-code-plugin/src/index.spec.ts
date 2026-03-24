import { describe, expect, it } from 'vitest';

import { ClaudeCodePlugin } from './index.js';

type PluginContextInput = Parameters<typeof ClaudeCodePlugin>[0];
type ResolvedPlugin = Awaited<ReturnType<typeof ClaudeCodePlugin>>;
type ChatParamsHook = NonNullable<ResolvedPlugin['chat.params']>;
type SystemTransformHook = NonNullable<ResolvedPlugin['experimental.chat.system.transform']>;

describe('ClaudeCodePlugin', () => {
  it('wires chat params and system transform hooks for the claude-code provider', async () => {
    const plugin = await ClaudeCodePlugin({ worktree: '/repo' } as PluginContextInput);
    const chatParamsHook = plugin['chat.params'];
    const systemTransformHook = plugin['experimental.chat.system.transform'];
    const paramsOutput = {
      options: {} as Record<string, unknown>,
      temperature: 0,
      topK: 0,
      topP: 0,
    };
    const systemOutput = { system: [] as string[] };

    expect(chatParamsHook).toBeDefined();
    expect(systemTransformHook).toBeDefined();

    await chatParamsHook?.(createChatParamsInput() as Parameters<ChatParamsHook>[0], paramsOutput);
    await systemTransformHook?.(createChatParamsInput() as Parameters<SystemTransformHook>[0], systemOutput);

    expect(paramsOutput.options.cwd).toBe('/repo');
    expect(systemOutput.system).toHaveLength(1);
  });

  it('skips the system transform when model input is missing', async () => {
    const plugin = await ClaudeCodePlugin({ worktree: '/repo' } as PluginContextInput);
    const systemOutput = { system: [] as string[] };

    await plugin['experimental.chat.system.transform']?.({} as Parameters<SystemTransformHook>[0], systemOutput);

    expect(systemOutput.system).toEqual([]);
  });
});

function createChatParamsInput() {
  return {
    model: { providerID: 'claude-code' },
  };
}
