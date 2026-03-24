import { describe, expect, it } from 'vitest';

import { buildBridge } from './bridge.js';

describe('buildBridge', () => {
  it('classifies the native tool set and curated bridge tools', () => {
    const bridge = buildBridge({
      bridgeTools: ['question', 'task', 'todowrite', 'webfetch', 'oc_websearch', 'oc_apply_patch'],
      nativeTools: ['bash', 'read', 'write', 'edit', 'glob', 'grep'],
      prompt: [],
      tools: [
        { inputSchema: { type: 'object' }, name: 'bash', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'read', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'question', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'task', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'todowrite', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'webfetch', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'oc_websearch', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'oc_apply_patch', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'custom_tool', type: 'function' as const },
      ],
    });

    expect(bridge.nativeTools).toEqual(['Bash', 'Read']);
    expect(bridge.bridgedToolNames).toEqual(['question', 'task', 'todowrite', 'webfetch', 'oc_websearch', 'oc_apply_patch']);
    expect(bridge.allowedTools).toContain('mcp__opencode__*');
  });
});
