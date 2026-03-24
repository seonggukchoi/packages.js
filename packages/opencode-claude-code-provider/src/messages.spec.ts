import { describe, expect, it } from 'vitest';

import { createStreamState, mapSdkMessage } from './messages.js';

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

describe('mapSdkMessage', () => {
  it('maps thinking and text stream events', () => {
    const state = createStreamState();

    expect(
      mapSdkMessage(
        {
          session_id: 'sess_123',
          subtype: 'init',
          type: 'system',
          uuid: 'init-1',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);

    expect(
      mapSdkMessage(
        {
          event: {
            index: 0,
            type: 'content_block_start',
            content_block: { type: 'thinking' },
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-1',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'reasoning-0', type: 'reasoning-start' }]);

    expect(
      mapSdkMessage(
        {
          event: {
            delta: { text: 'check', type: 'thinking_delta' },
            index: 0,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-2',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ delta: 'check', id: 'reasoning-0', type: 'reasoning-delta' }]);

    expect(
      mapSdkMessage(
        {
          event: { index: 0, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-3',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'reasoning-0', type: 'reasoning-end' }]);
  });

  it('maps provider-executed tool calls and results', () => {
    const state = createStreamState();

    const startParts = mapSdkMessage(
      {
        event: {
          content_block: { id: 'tool-1', name: 'question', type: 'tool_use' },
          index: 1,
          type: 'content_block_start',
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-4',
      } as unknown as SDKMessage,
      state,
    );

    expect(startParts).toEqual([
      {
        id: 'tool-1',
        providerExecuted: true,
        toolName: 'question',
        type: 'tool-input-start',
      },
    ]);

    const deltaParts = mapSdkMessage(
      {
        event: {
          delta: { partial_json: '{"questions":[]}', type: 'input_json_delta' },
          index: 1,
          type: 'content_block_delta',
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-5',
      } as unknown as SDKMessage,
      state,
    );

    expect(deltaParts).toEqual([{ delta: '{"questions":[]}', id: 'tool-1', type: 'tool-input-delta' }]);

    const stopParts = mapSdkMessage(
      {
        event: { index: 1, type: 'content_block_stop' },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-6',
      } as unknown as SDKMessage,
      state,
    );

    expect(stopParts).toEqual([
      { id: 'tool-1', type: 'tool-input-end' },
      {
        input: '{"questions":[]}',
        providerExecuted: true,
        toolCallId: 'tool-1',
        toolName: 'question',
        type: 'tool-call',
      },
    ]);

    const resultParts = mapSdkMessage(
      {
        message: { role: 'user' },
        parent_tool_use_id: 'tool-1',
        session_id: 'sess_123',
        tool_use_result: { answer: 'yes' },
        type: 'user',
        uuid: 'user-1',
      } as unknown as SDKMessage,
      state,
    );

    expect(resultParts).toEqual([
      {
        providerExecuted: true,
        result: { answer: 'yes' },
        toolCallId: 'tool-1',
        toolName: 'question',
        type: 'tool-result',
      },
    ]);
  });

  it('covers tool fallback ids, empty text deltas, and unknown tool results', () => {
    const state = createStreamState();

    expect(
      mapSdkMessage(
        {
          event: {
            content_block: { type: 'text' },
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-no-index',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'text-0', type: 'text-start' }]);
    expect(
      mapSdkMessage(
        {
          event: { index: 0, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-no-index-stop',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'text-0', type: 'text-end' }]);

    expect(
      mapSdkMessage(
        {
          event: {
            content_block: { type: 'tool_use' },
            index: 7,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-fallback-tool',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        id: 'tool-7',
        providerExecuted: true,
        toolName: 'unknown',
        type: 'tool-input-start',
      },
    ]);
    expect(
      mapSdkMessage(
        {
          event: { index: 7, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-fallback-tool-stop',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      { id: 'tool-7', type: 'tool-input-end' },
      {
        input: '{}',
        providerExecuted: true,
        toolCallId: 'tool-7',
        toolName: 'unknown',
        type: 'tool-call',
      },
    ]);
    expect(
      mapSdkMessage(
        {
          event: {
            content_block: { type: 'text' },
            index: 8,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-empty-text',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'text-8', type: 'text-start' }]);
    expect(
      mapSdkMessage(
        {
          event: {
            delta: { type: 'text_delta' },
            index: 8,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-undefined-text-delta',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: {
            delta: { text: '', type: 'text_delta' },
            index: 8,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-empty-text-delta',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: { index: 8, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-empty-text-stop',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'text-8', type: 'text-end' }]);
    expect(
      mapSdkMessage(
        {
          event: {
            content_block: { type: 'thinking' },
            index: 9,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-reasoning-text-delta',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'reasoning-9', type: 'reasoning-start' }]);
    expect(
      mapSdkMessage(
        {
          event: {
            delta: { type: 'text_delta' },
            index: 9,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-reasoning-no-text',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: {
            delta: { text: 'reason', type: 'text_delta' },
            index: 9,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-reasoning-text-delta-2',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ delta: 'reason', id: 'reasoning-9', type: 'reasoning-delta' }]);
    expect(
      mapSdkMessage(
        {
          message: { role: 'user' },
          parent_tool_use_id: 'missing-tool',
          session_id: 'sess_123',
          tool_use_result: { answer: 'unknown' },
          type: 'user',
          uuid: 'user-missing-tool',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        providerExecuted: true,
        result: { answer: 'unknown' },
        toolCallId: 'missing-tool',
        toolName: 'unknown',
        type: 'tool-result',
      },
    ]);
  });

  it('covers fallback stream and finish reason branches', () => {
    const state = createStreamState();

    expect(mapSdkMessage({ type: 'assistant' } as unknown as SDKMessage, state)).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: 'bad-event',
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-bad',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: { index: 0, type: 'unknown_event' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-unknown-event',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: {
            content_block: undefined,
            index: 4,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-no-content-block',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: {
            content_block: { type: 'unknown' },
            index: 4,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-unknown-block',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: { index: 99, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-no-block',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: {
            content_block: { type: 'text' },
            index: 0,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-text-start',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'text-0', type: 'text-start' }]);
    expect(
      mapSdkMessage(
        {
          event: {
            delta: { type: 'weird_delta' },
            index: 0,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-weird-text-delta',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: {
            content_block: { type: 'redacted_thinking' },
            index: 2,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-redacted',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'reasoning-2', type: 'reasoning-start' }]);
    expect(
      mapSdkMessage(
        {
          event: {
            delta: null,
            index: 2,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-null-delta',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: {
            delta: { text: '', type: 'thinking_delta' },
            index: 2,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-empty',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: { index: 2, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-stop',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ id: 'reasoning-2', type: 'reasoning-end' }]);

    expect(
      mapSdkMessage(
        {
          event: {
            content_block: {
              id: 'tool-circular',
              input: (() => {
                const value: { self?: unknown } = {};
                value.self = value;
                return value;
              })(),
              name: 'question',
              type: 'tool_use',
            },
            index: 3,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-tool-circular',
        } as unknown as SDKMessage,
        state,
      )[1],
    ).toEqual({ delta: '{}', id: 'tool-circular', type: 'tool-input-delta' });
    expect(
      mapSdkMessage(
        {
          event: {
            delta: { type: 'other_delta' },
            index: 3,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-tool-empty',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
    expect(
      mapSdkMessage(
        {
          event: { index: 3, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-tool-stop',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      { id: 'tool-circular', type: 'tool-input-end' },
      {
        input: '{}',
        providerExecuted: true,
        toolCallId: 'tool-circular',
        toolName: 'question',
        type: 'tool-call',
      },
    ]);

    expect(
      mapSdkMessage(
        {
          message: { role: 'user' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          tool_use_result: undefined,
          type: 'user',
          uuid: 'user-none',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);

    mapSdkMessage(
      {
        duration_api_ms: 1,
        duration_ms: 1,
        fast_mode_state: 'off',
        is_error: true,
        modelUsage: {},
        num_turns: 1,
        permission_denials: [],
        result: 'bad',
        session_id: 'sess_123',
        stop_reason: 'stop_sequence',
        subtype: 'error_max_turns',
        total_cost_usd: 0,
        type: 'result',
        usage: {},
        uuid: 'result-error',
      } as unknown as SDKMessage,
      state,
    );
    expect(state.finishReason).toBe('error');

    mapSdkMessage(
      {
        duration_api_ms: 1,
        duration_ms: 1,
        fast_mode_state: 'off',
        is_error: false,
        modelUsage: {},
        num_turns: 1,
        permission_denials: [],
        result: 'length',
        session_id: 'sess_123',
        stop_reason: 'max_tokens',
        subtype: 'success',
        total_cost_usd: 0,
        type: 'result',
        usage: { input_tokens: 1, output_tokens: 2, thinking_tokens: 3, total_tokens: 6 },
        uuid: 'result-length',
      } as unknown as SDKMessage,
      state,
    );
    expect(state.finishReason).toBe('length');
    expect(state.usage).toEqual({
      cachedInputTokens: undefined,
      inputTokens: 1,
      outputTokens: 2,
      reasoningTokens: 3,
      totalTokens: 6,
    });

    mapSdkMessage(
      {
        duration_api_ms: 1,
        duration_ms: 1,
        fast_mode_state: 'off',
        is_error: false,
        modelUsage: {},
        num_turns: 1,
        permission_denials: [],
        result: 'stop',
        session_id: 'sess_123',
        stop_reason: 'stop_sequence',
        subtype: 'success',
        total_cost_usd: 0,
        type: 'result',
        usage: { input_tokens: 1, output_tokens: 2 },
        uuid: 'result-stop',
      } as unknown as SDKMessage,
      state,
    );
    expect(state.finishReason).toBe('stop');

    mapSdkMessage(
      {
        duration_api_ms: 1,
        duration_ms: 1,
        fast_mode_state: 'off',
        is_error: false,
        modelUsage: {},
        num_turns: 1,
        permission_denials: [],
        result: 'unknown',
        session_id: 'sess_123',
        stop_reason: 'weird',
        subtype: 'success',
        total_cost_usd: 0,
        type: 'result',
        usage: {},
        uuid: 'result-unknown',
      } as unknown as SDKMessage,
      state,
    );
    expect(state.finishReason).toBe('unknown');
  });
});
