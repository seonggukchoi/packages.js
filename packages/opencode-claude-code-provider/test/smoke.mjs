import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdtemp, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { createClaudeCode } from '../dist/index.js';
import { ClaudeCodePlugin } from '../../opencode-claude-code-plugin/dist/index.js';

const fixtureDir = await mkdtemp(join(tmpdir(), 'claude-code-smoke-'));
const fakeClaudePath = join(fixtureDir, 'fake-claude.mjs');

await writeFile(
  fakeClaudePath,
  `#!/usr/bin/env node
const args = process.argv.slice(2);
const prompt = args.at(-1) ?? '';
const resumeIndex = args.indexOf('--resume');
const resumeSessionId = resumeIndex >= 0 ? args[resumeIndex + 1] : undefined;
const sessionId = resumeSessionId ?? 'sess_first';

const emit = (message) => process.stdout.write(JSON.stringify(message) + '\\n');

emit({ session_id: sessionId, subtype: 'init', type: 'system' });
emit({
  type: 'stream_event',
  event: { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
  session_id: sessionId,
});

if (resumeSessionId) {
  emit({
    type: 'stream_event',
    event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'continued' } },
    session_id: sessionId,
  });
  emit({ type: 'assistant', message: { usage: { input_tokens: 2, output_tokens: 1 } }, session_id: sessionId });
  emit({ type: 'stream_event', event: { type: 'content_block_stop', index: 0 }, session_id: sessionId });
  emit({
    type: 'stream_event',
    event: { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 2, output_tokens: 1 } },
    session_id: sessionId,
  });
  emit({ type: 'result', subtype: 'success', is_error: false, stop_reason: 'end_turn', usage: { input_tokens: 2, output_tokens: 1 }, session_id: sessionId });
  process.exit(0);
}

const text = prompt.includes('use read')
  ? '<tool_call>{"name":"read","arguments":{"filePath":"README.md"}}</tool_call>'
  : 'hello';

emit({
  type: 'stream_event',
  event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
  session_id: sessionId,
});
emit({ type: 'assistant', message: { usage: { input_tokens: 3, output_tokens: 2 } }, session_id: sessionId });
emit({ type: 'stream_event', event: { type: 'content_block_stop', index: 0 }, session_id: sessionId });
emit({
  type: 'stream_event',
  event: { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 3, output_tokens: 2 } },
  session_id: sessionId,
});
emit({ type: 'result', subtype: 'success', is_error: false, stop_reason: 'end_turn', usage: { input_tokens: 3, output_tokens: 2 }, session_id: sessionId });
`,
);
await chmod(fakeClaudePath, 0o755);

const provider = createClaudeCode({
  pathToClaudeCodeExecutable: fakeClaudePath,
});

const plugin = await ClaudeCodePlugin({ worktree: process.cwd() });
const normalized = { options: { effort: 'high', maxTurns: 5 } };

await plugin['chat.params']?.(
  {
    model: { providerID: 'claude-code' },
  },
  normalized,
);

assert.equal(normalized.options.maxTurns, 5);

const model = provider.languageModel('claude-sonnet-4-6');
const first = await model.doStream({
  prompt: [
    { content: 'Follow repo rules.', role: 'system' },
    { content: [{ text: 'hello', type: 'text' }], role: 'user' },
  ],
  providerOptions: {
    'claude-code': {
      ...normalized.options,
    },
  },
  tools: [],
});

const firstParts = await readStream(first.stream);

assert.deepEqual(firstParts[0], { type: 'stream-start', warnings: [] });
assert.ok(firstParts.some((part) => part.type === 'text-delta' && part.delta === 'hello'));
assert.ok(firstParts.some((part) => part.type === 'finish' && part.finishReason === 'stop'));

const toolCall = await model.doStream({
  prompt: [{ content: [{ text: 'please use read', type: 'text' }], role: 'user' }],
  providerOptions: {
    'claude-code': {
      pathToClaudeCodeExecutable: fakeClaudePath,
    },
  },
  tools: [
    {
      description: 'Read a file.',
      inputSchema: { properties: { filePath: { type: 'string' } }, required: ['filePath'], type: 'object' },
      name: 'read',
      type: 'function',
    },
  ],
});

const toolParts = await readStream(toolCall.stream);

assert.ok(toolParts.some((part) => part.type === 'tool-call' && part.toolName === 'read' && part.input === '{"filePath":"README.md"}'));
assert.ok(toolParts.some((part) => part.type === 'finish' && part.finishReason === 'tool-calls'));

const resumed = await model.doStream({
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
    'claude-code': {
      pathToClaudeCodeExecutable: fakeClaudePath,
    },
  },
  tools: [],
});

const resumedParts = await readStream(resumed.stream);

assert.ok(resumedParts.some((part) => part.type === 'text-delta' && part.delta === 'continued'));

console.log('Smoke test passed');

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
