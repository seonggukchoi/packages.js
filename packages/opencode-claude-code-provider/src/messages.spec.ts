/* eslint-disable @typescript-eslint/naming-convention */

import { describe, expect, it } from 'vitest';

import { createStreamState, mapCliMessage } from './messages.js';

describe('mapCliMessage', () => {
  it('captures the session id from system messages', () => {
    const state = createStreamState();

    const parts = mapCliMessage(
      {
        session_id: 'sess_system',
        subtype: 'init',
        type: 'system',
      },
      state,
    );

    expect(parts).toEqual([]);
    expect(state.sessionId).toBe('sess_system');
  });

  it('maps text stream events into stream parts', () => {
    const state = createStreamState();

    const startParts = mapCliMessage(
      {
        event: {
          content_block: { type: 'text' },
          index: 0,
          type: 'content_block_start',
        },
        type: 'stream_event',
      },
      state,
    );
    const deltaParts = mapCliMessage(
      {
        event: {
          delta: { text: 'hello', type: 'text_delta' },
          index: 0,
          type: 'content_block_delta',
        },
        type: 'stream_event',
      },
      state,
    );
    const stopParts = mapCliMessage(
      {
        event: {
          index: 0,
          type: 'content_block_stop',
        },
        type: 'stream_event',
      },
      state,
    );

    expect(startParts).toEqual([{ id: 'text-0', type: 'text-start' }]);
    expect(deltaParts).toEqual([{ delta: 'hello', id: 'text-0', type: 'text-delta' }]);
    expect(stopParts).toEqual([{ id: 'text-0', type: 'text-end' }]);
  });

  it('updates usage from assistant and message_delta events', () => {
    const state = createStreamState();

    const assistantParts = mapCliMessage(
      {
        message: {
          usage: {
            cache_read_input_tokens: 2,
            input_tokens: 5,
            output_tokens: 7,
          },
        },
        type: 'assistant',
      },
      state,
    );

    mapCliMessage(
      {
        event: {
          delta: { stop_reason: 'end_turn' },
          type: 'message_delta',
          usage: {
            output_tokens: 9,
          },
        },
        type: 'stream_event',
      },
      state,
    );

    expect(assistantParts).toEqual([]);
    expect(state.stopReason).toBe('end_turn');
    expect(state.usage).toEqual({
      cachedInputTokens: 2,
      inputTokens: 5,
      outputTokens: 9,
      reasoningTokens: undefined,
      totalTokens: 14,
    });
  });

  it('maps result messages into finish metadata', () => {
    const state = createStreamState();
    state.toolCallCounter = 1;

    const parts = mapCliMessage(
      {
        is_error: false,
        stop_reason: 'end_turn',
        subtype: 'success',
        type: 'result',
        usage: {
          input_tokens: 3,
          output_tokens: 4,
        },
      },
      state,
    );

    expect(parts).toEqual([]);
    expect(state.finishReason).toBe('tool-calls');
    expect(state.usage).toEqual({
      cachedInputTokens: undefined,
      inputTokens: 3,
      outputTokens: 4,
      reasoningTokens: undefined,
      totalTokens: 7,
    });
  });
});
