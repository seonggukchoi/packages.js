import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClaudeCodeLanguageModel } from './model.js';

import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

describe('ClaudeCodeLanguageModel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams the first turn and prefers OpenCode bridge tools when executors exist', async () => {
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
          bridgeTools: ['bash', 'question'],
          nativeTools: ['bash'],
        },
      },
      tools: {
        bash: {
          execute: async () => 'ok',
          inputSchema: { properties: { command: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
        question: {
          execute: async () => 'ok',
          inputSchema: { properties: { query: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
      },
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
    expect(calls[0].options?.tools).toEqual([]);
    expect(calls[0].options?.allowedTools).toEqual(['mcp__opencode__*']);
    expect(calls[0].options?.permissionMode).toBe('bypassPermissions');
    expect(calls[0].options?.permissionPromptToolName).toBe('mcp__opencode__question');
    expect(calls[0].options?.resume).toBeUndefined();
  });

  it('falls back to Claude native permissions when no OpenCode executor is attached', async () => {
    const calls: Array<{ options?: Record<string, unknown>; prompt: string }> = [];
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner(input) {
        calls.push(input as { options?: Record<string, unknown>; prompt: string });
        return createQuery([{ session_id: 'sess_native', subtype: 'init', type: 'system', uuid: 'sys-native' }]);
      },
    });

    const result = await model.doStream({
      prompt: [{ content: [{ text: 'List files.', type: 'text' }], role: 'user' }],
      providerOptions: {
        'claude-code': {
          bridgeTools: ['bash', 'question'],
          nativeTools: ['bash'],
        },
      },
      tools: [
        { inputSchema: { type: 'object' }, name: 'bash', type: 'function' },
        { inputSchema: { properties: { query: { type: 'string' } }, type: 'object' }, name: 'question', type: 'function' },
      ],
    } as unknown as LanguageModelV2CallOptions);

    const parts = await readStream(result.stream);

    expect(calls[0].options?.allowDangerouslySkipPermissions).toBeUndefined();
    expect(calls[0].options?.allowedTools).toEqual(['Bash']);
    expect(calls[0].options?.permissionMode).toBe('default');
    expect(calls[0].options?.permissionPromptToolName).toBeUndefined();
    expect(calls[0].options?.tools).toEqual(['Bash']);
    expect(parts[0]).toEqual({
      type: 'stream-start',
      warnings: [
        {
          message: 'Skipping OpenCode tool "question" because no provider-side executor was attached.',
          type: 'other',
        },
      ],
    });
    expect(parts.some((part) => isErrorPart(part))).toBe(false);
  });

  it('honors an explicit permission mode override', async () => {
    const calls: Array<{ options?: Record<string, unknown>; prompt: string }> = [];
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner(input) {
        calls.push(input as { options?: Record<string, unknown>; prompt: string });
        return createQuery([{ session_id: 'sess-plan', subtype: 'init', type: 'system', uuid: 'sys-plan' }]);
      },
    });

    await model.doStream({
      prompt: [{ content: [{ text: 'Plan only.', type: 'text' }], role: 'user' }],
      providerOptions: {
        'claude-code': {
          permissionMode: 'plan',
        },
      },
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    expect(calls[0].options?.allowDangerouslySkipPermissions).toBeUndefined();
    expect(calls[0].options?.permissionMode).toBe('plan');
  });

  it('throws when non-streaming generation is requested', async () => {
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6');

    await expect(model.doGenerate()).rejects.toThrow('only supports the streaming path');
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
          providerOptions: {
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

  it('streams assistant server tool blocks for read and bash', async () => {
    const model = new ClaudeCodeLanguageModel('claude-opus-4-6', {
      queryRunner() {
        return createQuery([
          { session_id: 'sess_server_tools', subtype: 'init', type: 'system', uuid: 'sys-server-tools' },
          {
            message: {
              content: [
                { id: 'server-read', input: { filePath: '.' }, name: 'Read', type: 'server_tool_use' },
                { content: { text: 'README.md' }, tool_use_id: 'server-read', type: 'text_editor_code_execution_tool_result' },
                { id: 'server-bash', input: { command: 'ls' }, name: 'Bash', type: 'server_tool_use' },
                {
                  content: { return_code: 0, stdout: 'README.md', type: 'bash_code_execution_result' },
                  tool_use_id: 'server-bash',
                  type: 'bash_code_execution_tool_result',
                },
              ],
              usage: { input_tokens: 8, output_tokens: 5, total_tokens: 13 },
            },
            parent_tool_use_id: null,
            session_id: 'sess_server_tools',
            type: 'assistant',
            uuid: 'assistant-server-tools',
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
            session_id: 'sess_server_tools',
            stop_reason: 'end_turn',
            subtype: 'success',
            total_cost_usd: 0,
            type: 'result',
            usage: {
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              input_tokens: 8,
              output_tokens: 5,
              server_tool_use: null,
              service_tier: 'standard',
              total_tokens: 13,
            },
            uuid: 'result-server-tools',
          },
        ]);
      },
    });

    const result = await model.doStream({
      prompt: [{ content: [{ text: 'what files are here?', type: 'text' }], role: 'user' }],
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    const parts = await readStream(result.stream);

    expect(parts).toEqual(
      expect.arrayContaining([
        {
          id: 'server-read',
          providerExecuted: true,
          toolName: 'read',
          type: 'tool-input-start',
        },
        {
          input: { filePath: '.' },
          providerExecuted: true,
          toolCallId: 'server-read',
          toolName: 'read',
          type: 'tool-call',
        },
        {
          providerExecuted: true,
          result: {
            metadata: { blockType: 'text_editor_code_execution_tool_result' },
            output: 'README.md',
            title: 'read',
          },
          toolCallId: 'server-read',
          toolName: 'read',
          type: 'tool-result',
        },
        {
          id: 'server-bash',
          providerExecuted: true,
          toolName: 'bash',
          type: 'tool-input-start',
        },
        {
          input: { command: 'ls' },
          providerExecuted: true,
          toolCallId: 'server-bash',
          toolName: 'bash',
          type: 'tool-call',
        },
        {
          providerExecuted: true,
          result: {
            metadata: { blockType: 'bash_code_execution_tool_result', returnCode: 0 },
            output: 'README.md',
            title: 'bash',
          },
          toolCallId: 'server-bash',
          toolName: 'bash',
          type: 'tool-result',
        },
        {
          finishReason: 'stop',
          providerMetadata: {
            'claude-code': {
              modelId: 'claude-opus-4-6',
              sessionId: 'sess_server_tools',
            },
          },
          type: 'finish',
          usage: {
            cachedInputTokens: 0,
            inputTokens: 8,
            outputTokens: 5,
            reasoningTokens: undefined,
            totalTokens: 13,
          },
        },
      ]),
    );
  });

  it('streams thinking deltas as reasoning parts', async () => {
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner() {
        return createQuery([
          { session_id: 'sess_reasoning', subtype: 'init', type: 'system', uuid: 'sys-thinking' },
          {
            event: { content_block: { type: 'thinking' }, index: 0, type: 'content_block_start' },
            parent_tool_use_id: null,
            session_id: 'sess_reasoning',
            type: 'stream_event',
            uuid: 'evt-thinking-start',
          },
          {
            event: { delta: { thinking: 'check repo state', type: 'thinking_delta' }, index: 0, type: 'content_block_delta' },
            parent_tool_use_id: null,
            session_id: 'sess_reasoning',
            type: 'stream_event',
            uuid: 'evt-thinking-delta',
          },
          {
            event: { index: 0, type: 'content_block_stop' },
            parent_tool_use_id: null,
            session_id: 'sess_reasoning',
            type: 'stream_event',
            uuid: 'evt-thinking-stop',
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
            session_id: 'sess_reasoning',
            stop_reason: 'end_turn',
            subtype: 'success',
            total_cost_usd: 0,
            type: 'result',
            usage: {
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              input_tokens: 3,
              output_tokens: 2,
              server_tool_use: null,
              service_tier: 'standard',
              thinking_tokens: 7,
            },
            uuid: 'result-thinking',
          },
        ]);
      },
    });

    const result = await model.doStream({
      prompt: [{ content: [{ text: 'show your reasoning', type: 'text' }], role: 'user' }],
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    const parts = await readStream(result.stream);

    expect(parts).toEqual(
      expect.arrayContaining([
        { type: 'stream-start', warnings: [] },
        { id: 'reasoning-0', type: 'reasoning-start' },
        { delta: 'check repo state', id: 'reasoning-0', type: 'reasoning-delta' },
        { id: 'reasoning-0', type: 'reasoning-end' },
        {
          finishReason: 'stop',
          providerMetadata: {
            'claude-code': {
              modelId: 'claude-sonnet-4-6',
              sessionId: 'sess_reasoning',
            },
          },
          type: 'finish',
          usage: {
            cachedInputTokens: 0,
            inputTokens: 3,
            outputTokens: 2,
            reasoningTokens: 7,
            totalTokens: 5,
          },
        },
      ]),
    );
  });

  it('round-trips provider-executed tool calls without leaving the turn in tool-calls state', async () => {
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
      tools: {
        question: {
          execute: async () => 'ok',
          inputSchema: { properties: { questions: { type: 'array' } }, type: 'object' },
          type: 'function',
        },
        read: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
      },
    } as unknown as LanguageModelV2CallOptions);

    const parts = await readStream(result.stream);

    expect(parts).toEqual(
      expect.arrayContaining([
        {
          id: 'native-read',
          providerExecuted: true,
          toolName: 'read',
          type: 'tool-input-start',
        },
        {
          input: { filePath: 'README.md' },
          providerExecuted: true,
          toolCallId: 'native-read',
          toolName: 'read',
          type: 'tool-call',
        },
        {
          providerExecuted: true,
          result: { content: 'native read result' },
          toolCallId: 'native-read',
          toolName: 'read',
          type: 'tool-result',
        },
        {
          input: { questions: [] },
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
        {
          finishReason: 'stop',
          providerMetadata: {
            'claude-code': {
              modelId: 'claude-sonnet-4-6',
              sessionId: 'sess_tools',
            },
          },
          type: 'finish',
          usage: {
            cachedInputTokens: 0,
            inputTokens: 1,
            outputTokens: 1,
            reasoningTokens: undefined,
            totalTokens: 2,
          },
        },
      ]),
    );
  });

  it('emits broken MCP warnings in stream-start and closes the query on cancellation', async () => {
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
    expect(first.value).toEqual({
      type: 'stream-start',
      warnings: [
        {
          message: 'MCP server "brokenRemote" is skipped because OAuth bridging is not supported yet.',
          type: 'other',
        },
      ],
    });

    await reader.cancel();
    await Promise.resolve();

    expect(closeCount).toBeGreaterThanOrEqual(1);
  });

  it('emits metadata without a session id when init is never received', async () => {
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner() {
        return createQuery([
          {
            duration_api_ms: 1,
            duration_ms: 1,
            fast_mode_state: 'off',
            is_error: false,
            modelUsage: {},
            num_turns: 1,
            permission_denials: [],
            result: 'done',
            session_id: 'missing-init',
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
            uuid: 'result-no-init',
          },
        ]);
      },
    });

    const result = await model.doStream({
      prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }],
      providerOptions: { 'claude-code': {} },
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    const parts = await readStream(result.stream);
    expect(parts[parts.length - 1]).toEqual({
      finishReason: 'stop',
      providerMetadata: {
        'claude-code': {
          modelId: 'claude-sonnet-4-6',
        },
      },
      type: 'finish',
      usage: {
        cachedInputTokens: 0,
        inputTokens: 1,
        outputTokens: 1,
        reasoningTokens: undefined,
        totalTokens: 2,
      },
    });
  });

  it('propagates the abort signal reason to the SDK abort controller', async () => {
    let capturedReason: unknown;
    const signalController = new AbortController();
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner(input) {
        input.options?.abortController?.signal.addEventListener('abort', () => {
          capturedReason = input.options?.abortController?.signal.reason;
        });

        return createQuery([]);
      },
    });

    await model.doStream({
      abortSignal: signalController.signal,
      prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }],
      providerOptions: { 'claude-code': {} },
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    signalController.abort('stop-now');

    expect(capturedReason).toBe('stop-now');
  });

  it('accepts missing providerOptions and falls back to defaults', async () => {
    const calls: Array<{ options?: Record<string, unknown>; prompt: string }> = [];
    const model = new ClaudeCodeLanguageModel('claude-sonnet-4-6', {
      queryRunner(input) {
        calls.push(input as { options?: Record<string, unknown>; prompt: string });
        return createQuery([]);
      },
    });

    await model.doStream({
      prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }],
      tools: [],
    } as unknown as LanguageModelV2CallOptions);

    expect(calls[0]?.options?.model).toBe('claude-sonnet-4-6');
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

function isErrorPart(part: unknown): part is { type: 'error' } {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'error';
}
