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
            delta: { thinking: 'check', type: 'thinking_delta' },
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
          event: {
            delta: { text: 'fallback', type: 'text_delta' },
            index: 0,
            type: 'content_block_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-2b',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([{ delta: 'fallback', id: 'reasoning-0', type: 'reasoning-delta' }]);

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
        input: { questions: [] },
        providerExecuted: true,
        toolCallId: 'tool-1',
        toolName: 'question',
        type: 'tool-call',
      },
    ]);
    expect(String((stopParts[1] as Extract<(typeof stopParts)[number], { type: 'tool-call' }>).input)).toBe('{"questions":[]}');
    expect((stopParts[1] as Extract<(typeof stopParts)[number], { type: 'tool-call' }>).input.trim()).toBe('{"questions":[]}');

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
        result: {
          metadata: { blockType: 'tool_result' },
          output: '{"answer":"yes"}',
          title: 'question',
        },
        toolCallId: 'tool-1',
        toolName: 'question',
        type: 'tool-result',
      },
    ]);

    const stateFromMessageContent = createStreamState();
    mapSdkMessage(
      {
        event: {
          content_block: { id: 'tool-2', input: { questions: [] }, name: 'question', type: 'tool_use' },
          index: 0,
          type: 'content_block_start',
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-tool-2-start',
      } as unknown as SDKMessage,
      stateFromMessageContent,
    );
    mapSdkMessage(
      {
        event: { index: 0, type: 'content_block_stop' },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-tool-2-stop',
      } as unknown as SDKMessage,
      stateFromMessageContent,
    );

    expect(
      mapSdkMessage(
        {
          message: {
            content: [{ tool_use_id: 'tool-2', type: 'tool_result' }],
            role: 'user',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          tool_use_result: { answer: 'from message content' },
          type: 'user',
          uuid: 'user-from-message-content',
        } as unknown as SDKMessage,
        stateFromMessageContent,
      ),
    ).toEqual([
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'tool_result' },
          output: '{"answer":"from message content"}',
          title: 'question',
        },
        toolCallId: 'tool-2',
        toolName: 'question',
        type: 'tool-result',
      },
    ]);

    expect(
      mapSdkMessage(
        {
          message: {
            content: [null, { type: 'tool_result' }],
            role: 'user',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          tool_use_result: { answer: 'missing id' },
          type: 'user',
          uuid: 'user-missing-message-content-id',
        } as unknown as SDKMessage,
        stateFromMessageContent,
      ),
    ).toEqual([]);

    expect(
      mapSdkMessage(
        {
          message: { role: 'user' },
          parent_tool_use_id: 'tool-1',
          session_id: 'sess_123',
          tool_use_result: { answer: 'yes again' },
          type: 'user',
          uuid: 'user-duplicate',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
  });

  it('maps assistant server tool blocks for read and bash flows', () => {
    const state = createStreamState();

    const parts = mapSdkMessage(
      {
        message: {
          content: [
            { id: 'server-read', input: { filePath: 'README.md' }, name: 'Read', type: 'server_tool_use' },
            { content: { text: 'read ok' }, tool_use_id: 'server-read', type: 'text_editor_code_execution_tool_result' },
            { id: 'server-bash', input: { command: 'ls' }, name: 'Bash', type: 'server_tool_use' },
            {
              content: { return_code: 0, stdout: 'README.md', type: 'bash_code_execution_result' },
              tool_use_id: 'server-bash',
              type: 'bash_code_execution_tool_result',
            },
          ],
          usage: { input_tokens: 8, output_tokens: 3, total_tokens: 11 },
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'assistant',
        uuid: 'assistant-tools',
      } as unknown as SDKMessage,
      state,
    );

    expect(parts).toEqual([
      {
        id: 'server-read',
        providerExecuted: true,
        toolName: 'read',
        type: 'tool-input-start',
      },
      { delta: '{"filePath":"README.md"}', id: 'server-read', type: 'tool-input-delta' },
      { id: 'server-read', type: 'tool-input-end' },
      {
        input: { filePath: 'README.md' },
        providerExecuted: true,
        toolCallId: 'server-read',
        toolName: 'read',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'text_editor_code_execution_tool_result' },
          output: 'read ok',
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
      { delta: '{"command":"ls"}', id: 'server-bash', type: 'tool-input-delta' },
      { id: 'server-bash', type: 'tool-input-end' },
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
    ]);

    expect(state.usage.totalTokens).toBe(11);
  });

  it('handles assistant tool result fallbacks and duplicate suppression', () => {
    const state = createStreamState();

    expect(
      mapSdkMessage(
        {
          message: {
            content: [
              { id: 'server-search', input: { query: 'repo' }, name: 'WebSearch', type: 'server_tool_use' },
              { result: { hits: 1 }, tool_call_id: 'server-search', type: 'tool_search_tool_result' },
              { id: 'server-error', input: { command: 'pwd' }, name: 'Bash', type: 'server_tool_use' },
              {
                error: { code: 'permission_denied' },
                is_error: true,
                server_tool_use_id: 'server-error',
                type: 'bash_code_execution_tool_result',
              },
              { id: 'server-stderr', input: { command: 'ls missing' }, name: 'Bash', type: 'server_tool_use' },
              {
                content: { return_code: 1, stderr: 'missing file', type: 'bash_code_execution_result' },
                tool_use_id: 'server-stderr',
                type: 'bash_code_execution_tool_result',
              },
              { id: 'server-stdout-only', input: { command: 'printf foo' }, name: 'Bash', type: 'server_tool_use' },
              {
                content: { return_code: 1, stdout: 'partial output', type: 'bash_code_execution_result' },
                tool_use_id: 'server-stdout-only',
                type: 'bash_code_execution_tool_result',
              },
              { id: 'server-error-code', input: { command: 'cat secret' }, name: 'Bash', type: 'server_tool_use' },
              {
                content: { error_code: 'permission_denied' },
                tool_use_id: 'server-error-code',
                type: 'bash_code_execution_tool_result',
              },
              { id: 'server-empty-bash', input: { command: 'noop' }, name: 'Bash', type: 'server_tool_use' },
              {
                content: {},
                tool_use_id: 'server-empty-bash',
                type: 'bash_code_execution_tool_result',
              },
              { id: 'server-fallback', input: { path: '.' }, name: 'Remote', type: 'mcp_tool_use' },
              { mystery: 'value', toolUseId: 'server-fallback', type: 'mcp_tool_result' },
            ],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-fallbacks',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        id: 'server-search',
        providerExecuted: true,
        toolName: 'websearch',
        type: 'tool-input-start',
      },
      { delta: '{"query":"repo"}', id: 'server-search', type: 'tool-input-delta' },
      { id: 'server-search', type: 'tool-input-end' },
      {
        input: { query: 'repo' },
        providerExecuted: true,
        toolCallId: 'server-search',
        toolName: 'websearch',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'tool_search_tool_result' },
          output: '{"hits":1}',
          title: 'websearch',
        },
        toolCallId: 'server-search',
        toolName: 'websearch',
        type: 'tool-result',
      },
      {
        id: 'server-error',
        providerExecuted: true,
        toolName: 'bash',
        type: 'tool-input-start',
      },
      { delta: '{"command":"pwd"}', id: 'server-error', type: 'tool-input-delta' },
      { id: 'server-error', type: 'tool-input-end' },
      {
        input: { command: 'pwd' },
        providerExecuted: true,
        toolCallId: 'server-error',
        toolName: 'bash',
        type: 'tool-call',
      },
      {
        isError: true,
        providerExecuted: true,
        result: {
          metadata: { blockType: 'bash_code_execution_tool_result', errorCode: 'permission_denied' },
          output: 'Tool error: permission_denied',
          title: 'bash',
        },
        toolCallId: 'server-error',
        toolName: 'bash',
        type: 'tool-result',
      },
      {
        id: 'server-stderr',
        providerExecuted: true,
        toolName: 'bash',
        type: 'tool-input-start',
      },
      { delta: '{"command":"ls missing"}', id: 'server-stderr', type: 'tool-input-delta' },
      { id: 'server-stderr', type: 'tool-input-end' },
      {
        input: { command: 'ls missing' },
        providerExecuted: true,
        toolCallId: 'server-stderr',
        toolName: 'bash',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'bash_code_execution_tool_result', returnCode: 1 },
          output: 'missing file',
          title: 'bash',
        },
        toolCallId: 'server-stderr',
        toolName: 'bash',
        type: 'tool-result',
      },
      {
        id: 'server-stdout-only',
        providerExecuted: true,
        toolName: 'bash',
        type: 'tool-input-start',
      },
      { delta: '{"command":"printf foo"}', id: 'server-stdout-only', type: 'tool-input-delta' },
      { id: 'server-stdout-only', type: 'tool-input-end' },
      {
        input: { command: 'printf foo' },
        providerExecuted: true,
        toolCallId: 'server-stdout-only',
        toolName: 'bash',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'bash_code_execution_tool_result', returnCode: 1 },
          output: 'partial output',
          title: 'bash',
        },
        toolCallId: 'server-stdout-only',
        toolName: 'bash',
        type: 'tool-result',
      },
      {
        id: 'server-error-code',
        providerExecuted: true,
        toolName: 'bash',
        type: 'tool-input-start',
      },
      { delta: '{"command":"cat secret"}', id: 'server-error-code', type: 'tool-input-delta' },
      { id: 'server-error-code', type: 'tool-input-end' },
      {
        input: { command: 'cat secret' },
        providerExecuted: true,
        toolCallId: 'server-error-code',
        toolName: 'bash',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'bash_code_execution_tool_result', errorCode: 'permission_denied' },
          output: 'Tool error: permission_denied',
          title: 'bash',
        },
        toolCallId: 'server-error-code',
        toolName: 'bash',
        type: 'tool-result',
      },
      {
        id: 'server-empty-bash',
        providerExecuted: true,
        toolName: 'bash',
        type: 'tool-input-start',
      },
      { delta: '{"command":"noop"}', id: 'server-empty-bash', type: 'tool-input-delta' },
      { id: 'server-empty-bash', type: 'tool-input-end' },
      {
        input: { command: 'noop' },
        providerExecuted: true,
        toolCallId: 'server-empty-bash',
        toolName: 'bash',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'bash_code_execution_tool_result' },
          output: '{}',
          title: 'bash',
        },
        toolCallId: 'server-empty-bash',
        toolName: 'bash',
        type: 'tool-result',
      },
      {
        id: 'server-fallback',
        providerExecuted: true,
        toolName: 'Remote',
        type: 'tool-input-start',
      },
      { delta: '{"path":"."}', id: 'server-fallback', type: 'tool-input-delta' },
      { id: 'server-fallback', type: 'tool-input-end' },
      {
        input: { path: '.' },
        providerExecuted: true,
        toolCallId: 'server-fallback',
        toolName: 'Remote',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'mcp_tool_result' },
          output: '{"mystery":"value","toolUseId":"server-fallback","type":"mcp_tool_result"}',
          title: 'Remote',
        },
        toolCallId: 'server-fallback',
        toolName: 'Remote',
        type: 'tool-result',
      },
    ]);

    expect(
      mapSdkMessage(
        {
          message: {
            content: [{ content: { ignored: true }, tool_use_id: 'server-search', type: 'web_fetch_tool_result' }],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-duplicate-result',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);

    expect(
      mapSdkMessage(
        {
          message: {
            content: [{ content: { ignored: true }, type: 'web_fetch_tool_result' }],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-missing-link',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);
  });

  it('covers assistant message guard branches and duplicate tool inputs', () => {
    const state = createStreamState();
    state.toolNames.set('remembered-tool', 'RememberedTool');

    expect(
      mapSdkMessage(
        {
          message: {
            content: 'not-an-array',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-bad-content',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);

    expect(
      mapSdkMessage(
        {
          message: {
            content: [
              null,
              {},
              { id: 'remembered-tool', type: 'server_tool_use' },
              { id: 'unknown-tool', type: 'server_tool_use' },
              { type: 'not-a-tool' },
              { id: 'dup-tool', input: { filePath: '.' }, name: 'Read', type: 'server_tool_use' },
              { id: 'dup-tool', name: 'Read', type: 'server_tool_use' },
            ],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-duplicate-tool',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        id: 'remembered-tool',
        providerExecuted: true,
        toolName: 'RememberedTool',
        type: 'tool-input-start',
      },
      { id: 'remembered-tool', type: 'tool-input-end' },
      {
        input: {},
        providerExecuted: true,
        toolCallId: 'remembered-tool',
        toolName: 'RememberedTool',
        type: 'tool-call',
      },
      {
        id: 'unknown-tool',
        providerExecuted: true,
        toolName: 'unknown',
        type: 'tool-input-start',
      },
      { id: 'unknown-tool', type: 'tool-input-end' },
      {
        input: {},
        providerExecuted: true,
        toolCallId: 'unknown-tool',
        toolName: 'unknown',
        type: 'tool-call',
      },
      {
        id: 'dup-tool',
        providerExecuted: true,
        toolName: 'read',
        type: 'tool-input-start',
      },
      { delta: '{"filePath":"."}', id: 'dup-tool', type: 'tool-input-delta' },
      { id: 'dup-tool', type: 'tool-input-end' },
      {
        input: { filePath: '.' },
        providerExecuted: true,
        toolCallId: 'dup-tool',
        toolName: 'read',
        type: 'tool-call',
      },
    ]);

    expect(
      mapSdkMessage(
        {
          message: {
            content: [{ content: { bare: true }, tool_use_id: 'ghost-tool', type: 'web_fetch_tool_result' }],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-unknown-tool-name',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'web_fetch_tool_result' },
          output: '{"bare":true}',
          title: 'web_fetch_tool_result',
        },
        toolCallId: 'ghost-tool',
        toolName: 'web_fetch_tool_result',
        type: 'tool-result',
      },
    ]);
  });

  it('covers unknown top-level messages and assistant fallback tool ids', () => {
    const state = createStreamState();

    expect(mapSdkMessage({ type: 'noop' } as unknown as SDKMessage, state)).toEqual([]);

    expect(
      mapSdkMessage(
        {
          message: {
            content: [{ input: { filePath: '.' }, name: 'Read', type: 'server_tool_use' }],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-fallback-tool-id',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        id: 'tool-0',
        providerExecuted: true,
        toolName: 'read',
        type: 'tool-input-start',
      },
      { delta: '{"filePath":"."}', id: 'tool-0', type: 'tool-input-delta' },
      { id: 'tool-0', type: 'tool-input-end' },
      {
        input: { filePath: '.' },
        providerExecuted: true,
        toolCallId: 'tool-0',
        toolName: 'read',
        type: 'tool-call',
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
        input: {},
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
        result: {
          metadata: { blockType: 'tool_result' },
          output: '{"answer":"unknown"}',
          title: 'unknown',
        },
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
      ),
    ).toEqual([
      {
        id: 'tool-circular',
        providerExecuted: true,
        toolName: 'question',
        type: 'tool-input-start',
      },
    ]);
    expect(
      mapSdkMessage(
        {
          message: {
            content: [
              { id: 'tool-empty-string', input: '', name: 'question', type: 'server_tool_use' },
              { id: 'tool-invalid-json', input: '{', name: 'question', type: 'server_tool_use' },
              {
                id: 'tool-non-record-json',
                input: {
                  toJSON() {
                    return 'not-a-record';
                  },
                },
                name: 'question',
                type: 'server_tool_use',
              },
            ],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-string-inputs',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        id: 'tool-empty-string',
        providerExecuted: true,
        toolName: 'question',
        type: 'tool-input-start',
      },
      { id: 'tool-empty-string', type: 'tool-input-end' },
      {
        input: {},
        providerExecuted: true,
        toolCallId: 'tool-empty-string',
        toolName: 'question',
        type: 'tool-call',
      },
      {
        id: 'tool-invalid-json',
        providerExecuted: true,
        toolName: 'question',
        type: 'tool-input-start',
      },
      { id: 'tool-invalid-json', type: 'tool-input-end' },
      {
        input: {},
        providerExecuted: true,
        toolCallId: 'tool-invalid-json',
        toolName: 'question',
        type: 'tool-call',
      },
      {
        id: 'tool-non-record-json',
        providerExecuted: true,
        toolName: 'question',
        type: 'tool-input-start',
      },
      { id: 'tool-non-record-json', type: 'tool-input-end' },
      {
        input: {},
        providerExecuted: true,
        toolCallId: 'tool-non-record-json',
        toolName: 'question',
        type: 'tool-call',
      },
    ]);
    const stringInputParts = mapSdkMessage(
      {
        message: {
          content: [{ id: 'tool-string-compatible', input: { filePath: 'README.md' }, name: 'Read', type: 'server_tool_use' }],
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'assistant',
        uuid: 'assistant-string-compatible',
      } as unknown as SDKMessage,
      state,
    );
    const toolCall = stringInputParts.find((part) => part.type === 'tool-call') as Extract<
      (typeof stringInputParts)[number],
      { type: 'tool-call' }
    >;

    expect(toolCall.input.trim()).toBe('{"filePath":"README.md"}');
    expect(`${toolCall.input}`).toBe('{"filePath":"README.md"}');
    expect(JSON.parse(String(toolCall.input))).toEqual({ filePath: 'README.md' });
    expect(toolCall.input.toString()).toBe('{"filePath":"README.md"}');
    expect(toolCall.input.valueOf()).toBe('{"filePath":"README.md"}');
    mapSdkMessage(
      {
        event: {
          content_block: {
            id: 'tool-invalid-delta-fallback',
            input: { filePath: 'README.md' },
            name: 'Read',
            type: 'tool_use',
          },
          index: 9,
          type: 'content_block_start',
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-tool-invalid-delta-start',
      } as unknown as SDKMessage,
      state,
    );
    mapSdkMessage(
      {
        event: {
          delta: { partial_json: '{', type: 'input_json_delta' },
          index: 9,
          type: 'content_block_delta',
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-tool-invalid-delta',
      } as unknown as SDKMessage,
      state,
    );
    expect(
      mapSdkMessage(
        {
          event: { index: 9, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-tool-invalid-delta-stop',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      { id: 'tool-invalid-delta-fallback', type: 'tool-input-end' },
      {
        input: { filePath: 'README.md' },
        providerExecuted: true,
        toolCallId: 'tool-invalid-delta-fallback',
        toolName: 'read',
        type: 'tool-call',
      },
    ]);
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
        input: {},
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
        event: {
          delta: { stop_reason: 'end_turn' },
          type: 'message_delta',
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-message-delta-stop',
      } as unknown as SDKMessage,
      state,
    );
    expect(
      mapSdkMessage(
        {
          event: {
            delta: {},
            type: 'message_delta',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-message-delta-empty',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);

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
        result: 'tool use handled by provider',
        session_id: 'sess_123',
        stop_reason: 'tool_use',
        subtype: 'success',
        total_cost_usd: 0,
        type: 'result',
        usage: {},
        uuid: 'result-tool-use',
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
        result: 'pause',
        session_id: 'sess_123',
        stop_reason: 'pause_turn',
        subtype: 'success',
        total_cost_usd: 0,
        type: 'result',
        usage: {},
        uuid: 'result-pause',
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
        subtype: 'success',
        total_cost_usd: 0,
        type: 'result',
        usage: {},
        uuid: 'result-unknown',
      } as unknown as SDKMessage,
      state,
    );
    expect(state.finishReason).toBe('stop');

    const unknownState = createStreamState();

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
        session_id: 'sess_unknown',
        stop_reason: 'weird',
        subtype: 'success',
        total_cost_usd: 0,
        type: 'result',
        usage: {},
        uuid: 'result-unknown-stop-reason',
      } as unknown as SDKMessage,
      unknownState,
    );
    expect(unknownState.finishReason).toBe('unknown');
  });

  it('defers tool results that arrive before tool-call stop events', () => {
    const state = createStreamState();

    expect(
      mapSdkMessage(
        {
          event: {
            content_block: {
              id: 'server-read',
              input: { filePath: 'README.md' },
              name: 'Read',
              type: 'server_tool_use',
            },
            index: 0,
            type: 'content_block_start',
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-read-start',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      {
        id: 'server-read',
        providerExecuted: true,
        toolName: 'read',
        type: 'tool-input-start',
      },
      { delta: '{"filePath":"README.md"}', id: 'server-read', type: 'tool-input-delta' },
    ]);

    expect(
      mapSdkMessage(
        {
          message: {
            content: [
              { id: 'server-read', input: { filePath: 'README.md' }, name: 'Read', type: 'server_tool_use' },
              { content: { text: 'read ok' }, tool_use_id: 'server-read', type: 'text_editor_code_execution_tool_result' },
            ],
          },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'assistant',
          uuid: 'assistant-early-result',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([]);

    expect(
      mapSdkMessage(
        {
          event: { index: 0, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-read-stop',
        } as unknown as SDKMessage,
        state,
      ),
    ).toEqual([
      { id: 'server-read', type: 'tool-input-end' },
      {
        input: { filePath: 'README.md' },
        providerExecuted: true,
        toolCallId: 'server-read',
        toolName: 'read',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'text_editor_code_execution_tool_result' },
          output: 'read ok',
          title: 'read',
        },
        toolCallId: 'server-read',
        toolName: 'read',
        type: 'tool-result',
      },
    ]);

    const earlyUserState = createStreamState();

    mapSdkMessage(
      {
        event: {
          content_block: {
            id: 'tool-user-early',
            input: { questions: [] },
            name: 'question',
            type: 'tool_use',
          },
          index: 1,
          type: 'content_block_start',
        },
        parent_tool_use_id: null,
        session_id: 'sess_123',
        type: 'stream_event',
        uuid: 'evt-user-early-start',
      } as unknown as SDKMessage,
      earlyUserState,
    );

    expect(
      mapSdkMessage(
        {
          message: { role: 'user' },
          parent_tool_use_id: 'tool-user-early',
          session_id: 'sess_123',
          tool_use_result: { answer: 'yes' },
          type: 'user',
          uuid: 'user-early-result',
        } as unknown as SDKMessage,
        earlyUserState,
      ),
    ).toEqual([]);

    expect(
      mapSdkMessage(
        {
          event: { index: 1, type: 'content_block_stop' },
          parent_tool_use_id: null,
          session_id: 'sess_123',
          type: 'stream_event',
          uuid: 'evt-user-early-stop',
        } as unknown as SDKMessage,
        earlyUserState,
      ),
    ).toEqual([
      { id: 'tool-user-early', type: 'tool-input-end' },
      {
        input: { questions: [] },
        providerExecuted: true,
        toolCallId: 'tool-user-early',
        toolName: 'question',
        type: 'tool-call',
      },
      {
        providerExecuted: true,
        result: {
          metadata: { blockType: 'tool_result' },
          output: '{"answer":"yes"}',
          title: 'question',
        },
        toolCallId: 'tool-user-early',
        toolName: 'question',
        type: 'tool-result',
      },
    ]);
  });
});
