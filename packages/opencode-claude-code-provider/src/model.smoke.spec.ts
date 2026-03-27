/* eslint-disable @typescript-eslint/naming-convention */

import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createClaudeCode } from './index.js';

describe('ClaudeCodeLanguageModel smoke', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(async (dir) => rm(dir, { force: true, recursive: true })));
  });

  it('handles a fresh session through stdin text input', async () => {
    const { cwd, fakeClaudePath } = await createFakeClaudeFixture();
    const provider = createClaudeCode({ pathToClaudeCodeExecutable: fakeClaudePath });
    const model = provider.languageModel('claude-haiku-4-5');

    const result = await model.doStream({
      prompt: [
        { content: 'Follow repository rules.', role: 'system' },
        { content: [{ text: 'fresh smoke', type: 'text' }], role: 'user' },
      ],
      providerOptions: {
        'claude-code': {
          cwd,
          pathToClaudeCodeExecutable: fakeClaudePath,
        },
      },
      tools: [],
    });

    const parts = await readAllParts(result.stream);
    const requestBody = getRequestBody(result);

    expect(requestBody.args).toContain('--input-format');
    expect(requestBody.args).toContain('text');
    expect(requestBody.args.join(' ')).not.toContain('fresh smoke');
    expect(parts).toContainEqual({ delta: 'fresh-ok', id: 'text-0', type: 'text-delta' });
  });

  it('handles long provider-switch bootstrap prompts without resume metadata', async () => {
    const { cwd, fakeClaudePath } = await createFakeClaudeFixture();
    const provider = createClaudeCode({ pathToClaudeCodeExecutable: fakeClaudePath });
    const model = provider.languageModel('claude-haiku-4-5');
    const hugeText = 'switch-context-'.repeat(170_000);

    const result = await model.doStream({
      prompt: [
        { content: 'System guardrails.', role: 'system' },
        { content: [{ text: hugeText, type: 'text' }], role: 'user' },
        { content: [{ text: 'other-provider reply', type: 'text' }], role: 'assistant' },
        { content: [{ text: 'switch now', type: 'text' }], role: 'user' },
      ],
      providerOptions: {
        'claude-code': {
          cwd,
          pathToClaudeCodeExecutable: fakeClaudePath,
        },
      },
      tools: [],
    });

    const parts = await readAllParts(result.stream);
    const requestBody = getRequestBody(result);
    const receivedPart = parts.find(
      (part): part is { delta: string; type: 'text-delta' } =>
        typeof part === 'object' && part !== null && 'type' in part && part.type === 'text-delta' && 'delta' in part,
    );

    expect(requestBody).not.toHaveProperty('resume');
    expect(requestBody.prompt.length).toBeGreaterThan(2_000_000);
    expect(requestBody.args.join(' ')).not.toContain('switch-context-');
    expect(receivedPart?.delta).toMatch(/^received:\d+$/);
    expect(Number(receivedPart?.delta.split(':')[1])).toBeGreaterThan(2_000_000);
  });

  async function createFakeClaudeFixture(): Promise<{ cwd: string; fakeClaudePath: string }> {
    const cwd = await mkdtemp(join(tmpdir(), 'claude-code-smoke-'));
    tempDirs.push(cwd);
    const fakeClaudePath = join(cwd, 'fake-claude.mjs');

    await writeFile(
      fakeClaudePath,
      `#!/usr/bin/env node
import process from 'node:process';

const args = process.argv.slice(2);
const resumeIndex = args.indexOf('--resume');
const resumeSessionId = resumeIndex >= 0 ? args[resumeIndex + 1] : undefined;
let prompt = '';

process.stdin.setEncoding('utf8');

for await (const chunk of process.stdin) {
  prompt += chunk;
}

const emit = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
const sessionId = resumeSessionId ?? 'sess_smoke';
const text = prompt.includes('fresh smoke') ? 'fresh-ok' : 'received:' + String(prompt.length);

emit({ session_id: sessionId, subtype: 'init', type: 'system' });
emit({ type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'text' } }, session_id: sessionId });
emit({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }, session_id: sessionId });
emit({ type: 'stream_event', event: { type: 'content_block_stop', index: 0 }, session_id: sessionId });
emit({ type: 'result', subtype: 'success', is_error: false, stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 }, session_id: sessionId });
`,
    );
    await chmod(fakeClaudePath, 0o755);

    return { cwd, fakeClaudePath };
  }
});

async function readAllParts(stream: ReadableStream<unknown>): Promise<unknown[]> {
  const reader = stream.getReader();
  const parts: unknown[] = [];

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      return parts;
    }

    parts.push(chunk.value);
  }
}

function getRequestBody(result: { request?: { body?: unknown } }): { args: string[]; prompt: string; resume?: string } {
  if (!result.request || !isRequestBody(result.request.body)) {
    throw new Error('Expected provider response to include a typed request body.');
  }

  return result.request.body;
}

function isRequestBody(value: unknown): value is { args: string[]; prompt: string; resume?: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'args' in value &&
    Array.isArray(value.args) &&
    value.args.every((entry) => typeof entry === 'string') &&
    'prompt' in value &&
    typeof value.prompt === 'string'
  );
}
