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
      cacheCreationInputTokens: undefined,
      inputTokens: 5,
      outputTokens: 9,
      reasoningTokens: undefined,
      totalTokens: 16,
    });

    mapCliMessage(
      {
        event: {
          delta: {},
          type: 'message_delta',
        },
        type: 'stream_event',
      },
      state,
    );

    expect(state.stopReason).toBe('end_turn');
  });

  it('maps native Claude tool_use assistant content into OpenCode tool parts', () => {
    const state = createStreamState();

    const parts = mapCliMessage(
      {
        message: {
          content: [
            {
              input: { filePath: 'README.md' },
              name: 'read',
              type: 'tool_use',
            },
          ],
        },
        type: 'assistant',
      },
      state,
    );

    expect(parts).toEqual([
      { id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' },
      { delta: '{"filePath":"README.md"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"filePath":"README.md"}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
    ]);
  });

  it('updates pending native tool_use blocks from assistant messages and emits tool-call parts on stop', () => {
    const state = createStreamState();

    expect(
      mapCliMessage(
        {
          event: {
            content_block: { id: 'toolu_1', input: {}, name: 'read', type: 'tool_use' },
            index: 1,
            type: 'content_block_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([{ id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' }]);

    expect(
      mapCliMessage(
        {
          message: {
            content: [
              {
                input: { filePath: 'README.md' },
                name: 'read',
                type: 'tool_use',
              },
            ],
          },
          type: 'assistant',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            index: 1,
            type: 'content_block_stop',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"filePath":"README.md"}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
    ]);
  });

  it('falls back safely for malformed native tool_use payloads', () => {
    const state = createStreamState();

    expect(
      mapCliMessage(
        {
          message: {
            content: [
              {
                input: {
                  toJSON: () => {
                    throw new Error('boom');
                  },
                },
                name: 'read',
                type: 'tool_use',
              },
            ],
          },
          type: 'assistant',
        },
        state,
      ),
    ).toEqual([
      { id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' },
      { delta: '{}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
    ]);
  });

  it('handles empty native tool_use deltas and empty inputs', () => {
    const state = createStreamState();

    expect(
      mapCliMessage(
        {
          event: {
            content_block: { id: 'toolu_2', input: {}, name: 'read', type: 'tool_use' },
            index: 2,
            type: 'content_block_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([{ id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' }]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { partial_json: '', type: 'input_json_delta' },
            index: 2,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { type: 'input_json_delta' },
            index: 2,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            index: 2,
            type: 'content_block_stop',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
    ]);
  });

  it('falls back to empty JSON when native tool_use input is not an object', () => {
    const state = createStreamState();

    expect(
      mapCliMessage(
        {
          message: {
            content: [
              {
                input: 'not-an-object',
                name: 'read',
                type: 'tool_use',
              },
            ],
          },
          type: 'assistant',
        },
        state,
      ),
    ).toEqual([
      { id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' },
      { delta: '{}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
    ]);
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
      cacheCreationInputTokens: undefined,
      inputTokens: 3,
      outputTokens: 4,
      reasoningTokens: undefined,
      totalTokens: 7,
    });
  });

  it('tracks cache creation tokens in total usage', () => {
    const state = createStreamState();

    mapCliMessage(
      {
        event: {
          message: {
            usage: {
              cache_creation_input_tokens: 11,
              cache_read_input_tokens: 7,
              input_tokens: 5,
            },
          },
          type: 'message_start',
        },
        type: 'stream_event',
      },
      state,
    );

    mapCliMessage(
      {
        is_error: false,
        subtype: 'success',
        type: 'result',
        usage: {
          output_tokens: 3,
        },
      },
      state,
    );

    expect(state.usage).toEqual({
      cachedInputTokens: 7,
      cacheCreationInputTokens: 11,
      inputTokens: 5,
      outputTokens: 3,
      reasoningTokens: undefined,
      totalTokens: 26,
    });
  });

  it('covers reasoning, message_start, and fallback branches', () => {
    const state = createStreamState();

    expect(mapCliMessage({ type: 'unknown' }, state)).toEqual([]);
    expect(mapCliMessage({ event: null, type: 'stream_event' }, state)).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            index: 2,
            type: 'unknown_event',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            message: {
              usage: {
                input_tokens: 2,
                total_tokens: 2,
              },
            },
            type: 'message_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            block: { type: 'thinking' },
            index: 1,
            type: 'content_block_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([{ id: 'reasoning-1', type: 'reasoning-start' }]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { text: 'reasoning', type: 'text_delta' },
            index: 1,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([{ delta: 'reasoning', id: 'reasoning-1', type: 'reasoning-delta' }]);

    expect(
      mapCliMessage(
        {
          event: {
            index: 1,
            type: 'content_block_stop',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([{ id: 'reasoning-1', type: 'reasoning-end' }]);

    expect(
      mapCliMessage(
        {
          event: {
            content_block: { type: 'other' },
            index: 6,
            type: 'content_block_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            content_block: { type: 'tool_use' },
            index: 5,
            type: 'content_block_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            content_block: { type: 'text' },
            index: 3,
            type: 'content_block_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([{ id: 'text-3', type: 'text-start' }]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { text: '', type: 'text_delta' },
            index: 3,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { text: 1, type: 'text_delta' },
            index: 3,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { type: 'text_delta' },
            index: 99,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            block: { type: 'thinking' },
            index: 4,
            type: 'content_block_start',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([{ id: 'reasoning-4', type: 'reasoning-start' }]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { text: '', type: 'text_delta' },
            index: 4,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { thinking: 1, type: 'thinking_delta' },
            index: 4,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            delta: { type: 'unknown_delta' },
            index: 3,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);

    expect(
      mapCliMessage(
        {
          event: {
            index: 999,
            type: 'content_block_stop',
          },
          type: 'stream_event',
        },
        state,
      ),
    ).toEqual([]);
  });

  it('maps all finish-reason branches', () => {
    const errorState = createStreamState();
    mapCliMessage({ is_error: true, subtype: 'success', type: 'result' }, errorState);
    expect(errorState.finishReason).toBe('error');

    const lengthState = createStreamState();
    mapCliMessage({ stop_reason: 'max_tokens', subtype: 'success', type: 'result' }, lengthState);
    expect(lengthState.finishReason).toBe('length');

    const stopState = createStreamState();
    mapCliMessage({ stop_reason: 'stop_sequence', subtype: 'success', type: 'result' }, stopState);
    expect(stopState.finishReason).toBe('stop');

    const otherState = createStreamState();
    mapCliMessage({ stop_reason: 'weird_reason', subtype: 'success', type: 'result' }, otherState);
    expect(otherState.finishReason).toBe('other');

    const unknownState = createStreamState();
    mapCliMessage({ subtype: 'success', type: 'result' }, unknownState);
    expect(unknownState.finishReason).toBe('unknown');
  });
});
