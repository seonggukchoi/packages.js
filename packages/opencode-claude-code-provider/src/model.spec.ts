import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClaudeCodeLanguageModel } from './model.js';

import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

describe('ClaudeCodeLanguageModel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams the first turn and forwards native and bridged tool configuration', async () => {
    const calls: Array<{ options?: Record<string, unknown>; prompt: string }> = [];
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner(input) {
        calls.push(input as { options?: Record<string, unknown>; prompt: string });
        return createQuery([
          { session_id: 'sess_first', subtype: 'init', type: 'system', uuid: 'sys-1' },
          {
            event: { content_block: { type: 'text' }, index: 0, type: 'content_block_start' },
            parent_tool_use_id: null,
            session_id: 'sess_first',
            type: 'stream_event',
            uuid: 'evt-1',
          },
          {
            event: { delta: { text: 'hello from claude', type: 'text_delta' }, index: 0, type: 'content_block_delta' },
            parent_tool_use_id: null,
            session_id: 'sess_first',
            type: 'stream_event',
            uuid: 'evt-2',
          },
          {
            event: { index: 0, type: 'content_block_stop' },
            parent_tool_use_id: null,
            session_id: 'sess_first',
            type: 'stream_event',
            uuid: 'evt-2-stop',
          },
          {
            duration_api_ms: 1,
            duration_ms: 2,
            fast_mode_state: 'off',
            is_error: false,
            modelUsage: {},
            num_turns: 1,
            permission_denials: [],
            result: 'done',
            session_id: 'sess_first',
            stop_reason: 'end_turn',
            subtype: 'success',
            total_cost_usd: 0,
            type: 'result',
            usage: {
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              input_tokens: 10,
              output_tokens: 5,
              server_tool_use: null,
              service_tier: 'standard',
            },
            uuid: 'result-1',
          },
        ]);
      },
    });

    const result = await model.doStream({
      prompt: [
        { content: 'Follow the repository instructions.', role: 'system' },
        { content: [{ text: 'Say hello.', type: 'text' }], role: 'user' },
      ],
      providerOptions: {
        'claude-code': {
          bridgeTools: ['question'],
          nativeTools: ['bash'],
        },
      },
      tools: [
        { inputSchema: { type: 'object' }, name: 'bash', type: 'function' },
        { inputSchema: { properties: { query: { type: 'string' } }, type: 'object' }, name: 'question', type: 'function' },
      ],
    } as unknown as LanguageModelV2CallOptions);

    const parts = await readStream(result.stream);

    expect(parts).toEqual(
      expect.arrayContaining([
        { type: 'stream-start', warnings: [] },
        { id: 'text-0', type: 'text-start' },
        { delta: 'hello from claude', id: 'text-0', type: 'text-delta' },
        { id: 'text-0', type: 'text-end' },
        {
          finishReason: 'stop',
          providerMetadata: {
            'claude-code': {
              modelId: 'claude-sonnet-4-6',
              sessionId: 'sess_first',
            },
          },
          type: 'finish',
          usage: {
            cachedInputTokens: 0,
            inputTokens: 10,
            outputTokens: 5,
            reasoningTokens: undefined,
            totalTokens: 15,
          },
        },
      ]),
    );

    expect(calls[0].prompt).toContain('Say hello.');
    expect(calls[0].options?.allowDangerouslySkipPermissions).toBe(true);
    expect(calls[0].options?.tools).toEqual(['Bash']);
    expect(calls[0].options?.allowedTools).toEqual(['Bash', 'mcp__opencode__*']);
    expect(calls[0].options?.permissionMode).toBe('bypassPermissions');
    expect(calls[0].options?.resume).toBeUndefined();
  });

  it('resumes with the latest session id and keeps provider options namespaced', async () => {
    const calls: Array<{ options?: Record<string, unknown>; prompt: string }> = [];
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner(input) {
        calls.push(input as { options?: Record<string, unknown>; prompt: string });
        return createQuery([
          { session_id: 'sess_resume', subtype: 'init', type: 'system', uuid: 'sys-2' },
          {
            duration_api_ms: 1,
            duration_ms: 1,
            fast_mode_state: 'off',
            is_error: false,
            modelUsage: {},
            num_turns: 1,
            permission_denials: [],
            result: 'continued',
            session_id: 'sess_resume',
            stop_reason: 'end_turn',
            subtype: 'success',
            total_cost_usd: 0,
            type: 'result',
            usage: {
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              input_tokens: 1,
              output_tokens: 1,
              server_tool_use: null,
              service_tier: 'standard',
            },
            uuid: 'result-2',
          },
        ]);
      },
    });

    await model.doStream({
      prompt: [
        {
          content: [{ text: 'done', type: 'text' }],
          providerMetadata: {
            'claude-code': {
              modelId: 'claude-sonnet-4-6',
              sessionId: 'sess_resume',
            },
          },
          role: 'assistant',
        },
        {
          content: [{ text: 'continue please', type: 'text' }],
          role: 'user',
        },
      ],
      providerOptions: {
        'claude-code': {
          effort: 'high',
          maxTurns: 3,
        },
      },
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    expect(calls[0].prompt).toBe('continue please');
    expect(calls[0].options?.allowDangerouslySkipPermissions).toBe(true);
    expect(calls[0].options?.resume).toBe('sess_resume');
    expect(calls[0].options?.effort).toBe('high');
    expect(calls[0].options?.maxTurns).toBe(3);
    expect(calls[0].options?.permissionMode).toBe('bypassPermissions');
  });

  it('round-trips native and bridged tool calls through the stream mapper', async () => {
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner() {
        return createQuery([
          { session_id: 'sess_tools', subtype: 'init', type: 'system', uuid: 'sys-3' },
          {
            event: {
              content_block: { id: 'native-read', input: { filePath: 'README.md' }, name: 'Read', type: 'tool_use' },
              index: 0,
              type: 'content_block_start',
            },
            parent_tool_use_id: null,
            session_id: 'sess_tools',
            type: 'stream_event',
            uuid: 'evt-3',
          },
          {
            event: { index: 0, type: 'content_block_stop' },
            parent_tool_use_id: null,
            session_id: 'sess_tools',
            type: 'stream_event',
            uuid: 'evt-4',
          },
          {
            message: { role: 'user' },
            parent_tool_use_id: 'native-read',
            session_id: 'sess_tools',
            tool_use_result: { content: 'native read result' },
            type: 'user',
            uuid: 'user-1',
          },
          {
            event: {
              content_block: { id: 'bridge-question', input: { questions: [] }, name: 'question', type: 'tool_use' },
              index: 1,
              type: 'content_block_start',
            },
            parent_tool_use_id: null,
            session_id: 'sess_tools',
            type: 'stream_event',
            uuid: 'evt-5',
          },
          {
            event: { index: 1, type: 'content_block_stop' },
            parent_tool_use_id: null,
            session_id: 'sess_tools',
            type: 'stream_event',
            uuid: 'evt-6',
          },
          {
            message: { role: 'user' },
            parent_tool_use_id: 'bridge-question',
            session_id: 'sess_tools',
            tool_use_result: { content: 'bridge question result' },
            type: 'user',
            uuid: 'user-2',
          },
          {
            duration_api_ms: 1,
            duration_ms: 1,
            fast_mode_state: 'off',
            is_error: false,
            modelUsage: {},
            num_turns: 1,
            permission_denials: [],
            result: 'done',
            session_id: 'sess_tools',
            stop_reason: 'tool_use',
            subtype: 'success',
            total_cost_usd: 0,
            type: 'result',
            usage: {
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              input_tokens: 1,
              output_tokens: 1,
              server_tool_use: null,
              service_tier: 'standard',
            },
            uuid: 'result-3',
          },
        ]);
      },
    });

    const result = await model.doStream({
      prompt: [{ content: [{ text: 'inspect tools', type: 'text' }], role: 'user' }],
      providerOptions: {
        'claude-code': {
          bridgeTools: ['question'],
          nativeTools: ['read'],
        },
      },
      tools: [
        { inputSchema: { type: 'object' }, name: 'read', type: 'function' },
        { inputSchema: { properties: { questions: { type: 'array' } }, type: 'object' }, name: 'question', type: 'function' },
      ],
    } as unknown as LanguageModelV2CallOptions);

    const parts = await readStream(result.stream);

    expect(parts).toEqual(
      expect.arrayContaining([
        {
          id: 'native-read',
          providerExecuted: true,
          toolName: 'Read',
          type: 'tool-input-start',
        },
        {
          input: '{"filePath":"README.md"}',
          providerExecuted: true,
          toolCallId: 'native-read',
          toolName: 'Read',
          type: 'tool-call',
        },
        {
          providerExecuted: true,
          result: { content: 'native read result' },
          toolCallId: 'native-read',
          toolName: 'Read',
          type: 'tool-result',
        },
        {
          input: '{"questions":[]}',
          providerExecuted: true,
          toolCallId: 'bridge-question',
          toolName: 'question',
          type: 'tool-call',
        },
        {
          providerExecuted: true,
          result: { content: 'bridge question result' },
          toolCallId: 'bridge-question',
          toolName: 'question',
          type: 'tool-result',
        },
      ]),
    );
  });

  it('surfaces broken MCP warnings and closes the query on cancellation', async () => {
    let closeCount = 0;
    let release: (() => void) | undefined;
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner() {
        return {
          close() {
            closeCount += 1;
            release?.();
          },
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                await new Promise<void>((resolve) => {
                  release = resolve;
                });

                return { done: true, value: undefined };
              },
            };
          },
        };
      },
    });

    const result = await model.doStream({
      prompt: [{ content: [{ text: 'check mcp', type: 'text' }], role: 'user' }],
      providerOptions: {
        'claude-code': {
          bridgeOpenCodeMcp: true,
          openCodeMcp: {
            brokenRemote: {
              oauth: { issuer: 'https://issuer.example' },
              type: 'remote',
              url: 'https://mcp.example',
            },
          },
        },
      },
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    const reader = result.stream.getReader();
    const first = await reader.read();
    expect(first.value).toEqual({ type: 'stream-start', warnings: [] });

    const second = await reader.read();
    expect(second.value).toEqual({
      error: expect.any(Error),
      type: 'error',
    });

    await reader.cancel();
    await Promise.resolve();

    expect(closeCount).toBeGreaterThanOrEqual(1);
  });
});

function createQuery(messages: unknown[]) {
  return {
    close() {
      return undefined;
    },
    async *[Symbol.asyncIterator]() {
      for (const message of messages) {
        yield message as SDKMessage;
      }
    },
  };
}

async function readStream(stream: ReadableStream<unknown>) {
  const reader = stream.getReader();
  const parts: unknown[] = [];

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      break;
    }

    parts.push(chunk.value);
  }

  return parts;
}
