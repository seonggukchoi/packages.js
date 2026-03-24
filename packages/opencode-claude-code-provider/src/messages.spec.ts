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
});
