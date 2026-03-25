import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';

import { createClaudeCode } from '../dist/index.js';
import { ClaudeCodePlugin } from '../../opencode-claude-code-plugin/dist/index.js';

const providerCalls = [];
const provider = createClaudeCode({
  queryRunner(input) {
    providerCalls.push(input);

    if (input.options?.resume) {
      return createQuery([
        { session_id: 'sess_resume', subtype: 'init', type: 'system', uuid: 'sys-resume' },
        resultMessage('sess_resume', 'end_turn', 2, 2),
      ]);
    }

    return createQuery([
      { session_id: 'sess_first', subtype: 'init', type: 'system', uuid: 'sys-first' },
      {
        event: { content_block: { type: 'text' }, index: 0, type: 'content_block_start' },
        parent_tool_use_id: null,
        session_id: 'sess_first',
        type: 'stream_event',
        uuid: 'evt-1',
      },
      {
        event: { delta: { text: 'hello', type: 'text_delta' }, index: 0, type: 'content_block_delta' },
        parent_tool_use_id: null,
        session_id: 'sess_first',
        type: 'stream_event',
        uuid: 'evt-2',
      },
      {
        event: {
          content_block: { id: 'native-read', input: { filePath: 'README.md' }, name: 'Read', type: 'tool_use' },
          index: 1,
          type: 'content_block_start',
        },
        parent_tool_use_id: null,
        session_id: 'sess_first',
        type: 'stream_event',
        uuid: 'evt-3',
      },
      {
        event: { index: 1, type: 'content_block_stop' },
        parent_tool_use_id: null,
        session_id: 'sess_first',
        type: 'stream_event',
        uuid: 'evt-4',
      },
      {
        message: { role: 'user' },
        parent_tool_use_id: 'native-read',
        session_id: 'sess_first',
        tool_use_result: { content: 'read ok' },
        type: 'user',
        uuid: 'user-1',
      },
      {
        event: {
          content_block: { id: 'bridge-question', input: { questions: [] }, name: 'question', type: 'tool_use' },
          index: 2,
          type: 'content_block_start',
        },
        parent_tool_use_id: null,
        session_id: 'sess_first',
        type: 'stream_event',
        uuid: 'evt-5',
      },
      {
        event: { index: 2, type: 'content_block_stop' },
        parent_tool_use_id: null,
        session_id: 'sess_first',
        type: 'stream_event',
        uuid: 'evt-6',
      },
      {
        message: { role: 'user' },
        parent_tool_use_id: 'bridge-question',
        session_id: 'sess_first',
        tool_use_result: { content: 'question ok' },
        type: 'user',
        uuid: 'user-2',
      },
      resultMessage('sess_first', 'tool_use', 10, 7),
    ]);
  },
});

const plugin = await ClaudeCodePlugin({ worktree: process.cwd() });
const normalized = { options: { bridgeOpenCodeMcp: true, effort: 'high', maxTurns: 5 } };

await plugin['chat.params']?.(
  {
    model: { providerID: 'claude-code' },
  },
  normalized,
);

const model = provider.languageModel('claude-sonnet-4-6');
const first = await model.doStream({
  prompt: [
    { content: 'Follow repo rules.', role: 'system' },
    { content: [{ text: 'hello', type: 'text' }], role: 'user' },
  ],
  providerOptions: {
    'claude-code': {
      ...normalized.options,
      bridgeTools: ['question', 'task', 'todowrite', 'webfetch', 'oc_apply_patch', 'oc_codesearch', 'oc_websearch'],
      nativeTools: ['read', 'write', 'edit', 'glob', 'grep', 'bash'],
      openCodeMcp: {
        brokenRemote: {
          oauth: { issuer: 'https://issuer.example' },
          type: 'remote',
          url: 'https://mcp.example',
        },
        github: {
          command: ['npx', '-y', '@modelcontextprotocol/server-github'],
          type: 'local',
        },
      },
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
});

const firstParts = await readStream(first.stream);

assert.equal(providerCalls[0].options.effort, undefined);
assert.equal(providerCalls[0].options.maxTurns, 5);
assert.deepEqual(providerCalls[0].options.tools, ['Read']);
assert.ok(providerCalls[0].options.allowedTools.includes('mcp__opencode__*'));
assert.equal(providerCalls[0].options.permissionPromptToolName, undefined);
assert.deepEqual(firstParts[0], {
  type: 'stream-start',
  warnings: [
    {
      message: 'MCP server "brokenRemote" is skipped because OAuth bridging is not supported yet.',
      type: 'other',
    },
  ],
});
assert.ok(firstParts.some((part) => part.type === 'text-delta' && part.delta === 'hello'));
assert.ok(firstParts.some((part) => part.type === 'tool-result' && part.toolName === 'read'));
assert.ok(firstParts.some((part) => part.type === 'tool-result' && part.toolName === 'question'));
assert.ok(!firstParts.some((part) => part.type === 'error'));
assert.ok(firstParts.some((part) => part.type === 'finish' && part.finishReason === 'stop'));

const second = await model.doStream({
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
    { content: [{ text: 'continue', type: 'text' }], role: 'user' },
  ],
  providerOptions: {
    'claude-code': normalized.options,
  },
  tools: [],
});

await readStream(second.stream);
assert.equal(providerCalls[1].prompt, 'continue');
assert.equal(providerCalls[1].options.resume, 'sess_resume');

console.log('Smoke test passed');

function createQuery(messages) {
  return {
    close() {},
    async *[Symbol.asyncIterator]() {
      for (const message of messages) {
        yield message;
      }
    },
  };
}

function resultMessage(sessionId, stopReason, inputTokens, outputTokens) {
  return {
    duration_api_ms: 1,
    duration_ms: 1,
    fast_mode_state: 'off',
    is_error: false,
    modelUsage: {},
    num_turns: 1,
    permission_denials: [],
    result: 'ok',
    session_id: sessionId,
    stop_reason: stopReason,
    subtype: 'success',
    total_cost_usd: 0,
    type: 'result',
    usage: {
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      server_tool_use: null,
      service_tier: 'standard',
    },
    uuid: `${sessionId}-${stopReason}`,
  };
}

async function readStream(stream) {
  const reader = stream.getReader();
  const parts = [];

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }

    parts.push(chunk.value);
  }

  return parts;
}
