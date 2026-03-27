/* eslint-disable @typescript-eslint/naming-convention */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildPrompt, getLatestUserText, getSystem, loadClaudeMd } from './prompt.js';
import { getResume } from './resume.js';

import type { LanguageModelV2FilePart, LanguageModelV2Prompt } from '@ai-sdk/provider';

describe('prompt helpers', () => {
  it('returns the merged system prompt', () => {
    const prompt = [
      { content: 'System A', role: 'system' as const },
      { content: 'System B', role: 'system' as const },
    ] as unknown as LanguageModelV2Prompt;

    expect(getSystem(prompt)).toBe('System A\n\nSystem B');
    expect(buildPrompt(prompt)).toBe('System instructions:\nSystem A\n\nSystem B');
  });

  it('extracts the latest user text for resumed sessions', () => {
    const prompt = [
      { content: 'System', role: 'system' as const },
      {
        content: [{ text: 'first question', type: 'text' as const }],
        role: 'user' as const,
      },
      {
        content: [{ text: 'latest question', type: 'text' as const }],
        role: 'user' as const,
      },
    ] as unknown as LanguageModelV2Prompt;

    expect(getLatestUserText(prompt)).toBe('latest question');
    expect(buildPrompt(prompt, { resumeSessionId: 'sess_123' })).toBe('latest question');
    expect(getLatestUserText([{ content: [{ text: '', type: 'text' as const }], role: 'user' as const }])).toBeUndefined();
  });

  it('serializes a first-turn bootstrap prompt', () => {
    const prompt = [
      { content: 'Follow repository rules.', role: 'system' as const },
      {
        content: [{ text: 'Please inspect the workspace.', type: 'text' as const }],
        role: 'user' as const,
      },
      {
        content: [{ text: 'I am checking files now.', type: 'text' as const }],
        role: 'assistant' as const,
      },
    ];

    expect(buildPrompt(prompt)).toContain('System instructions:');
    expect(buildPrompt(prompt)).toContain('Conversation:');
    expect(buildPrompt(prompt)).toContain('Please inspect the workspace.');
  });

  it('reads the latest matching resume session id', () => {
    const prompt = [
      {
        content: [{ text: 'done', type: 'text' as const }],
        providerOptions: {
          'claude-code': {
            modelId: 'sonnet',
            sessionId: 'sess_123',
          },
        },
        role: 'assistant' as const,
      },
    ];

    expect(getResume(prompt, 'sonnet')).toBe('sess_123');
    expect(getResume(prompt, 'opus')).toBeUndefined();
  });

  it('falls back to the last conversation chunk when no resumed user text exists', () => {
    const prompt = [
      {
        content: [{ text: 'done', type: 'text' as const }],
        role: 'assistant' as const,
      },
    ];

    expect(buildPrompt(prompt, { resumeSessionId: 'sess_123' })).toContain('Assistant:');
    expect(buildPrompt([{ content: 'System only', role: 'system' as const }], { resumeSessionId: 'sess_123' })).toBe('');
  });

  it('serializes files, reasoning, tool calls, and tool results', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    const prompt = [
      {
        content: [
          {
            data: new Uint8Array([1, 2, 3]),
            filename: 'note.txt',
            mediaType: 'text/plain',
            type: 'file' as const,
          },
          {
            data: new URL('https://example.com/file.txt'),
            mediaType: 'text/plain',
            type: 'file' as const,
          },
          {
            data: 'inline-data',
            mediaType: 'text/plain',
            type: 'file' as const,
          },
        ],
        role: 'user' as const,
      },
      {
        content: [
          { text: 'think', type: 'reasoning' as const },
          { input: circular, providerExecuted: true, toolCallId: '1', toolName: 'question', type: 'tool-call' as const },
          { output: { ok: true }, providerExecuted: true, toolCallId: '1', toolName: 'question', type: 'tool-result' as const },
          {
            data: 42 as unknown as LanguageModelV2FilePart['data'],
            mediaType: 'application/json',
            type: 'file' as const,
          },
        ],
        role: 'assistant' as const,
      },
      {
        content: [{ output: { final: true }, toolCallId: '2', toolName: 'question', type: 'tool-result' as const }],
        role: 'tool' as const,
      },
    ];

    const output = buildPrompt(prompt as unknown as LanguageModelV2Prompt);

    expect(output).toContain('bytes=3');
    expect(output).toContain('url=https://example.com/file.txt');
    expect(output).toContain('stringLength=11');
    expect(output).not.toContain('[reasoning]');
    expect(output).toContain('[tool-call:question] [object Object]');
    expect(output).toContain('[tool-result:question]');
    expect(output).toContain('[file mediaType=application/json]');
  });

  it('normalizes stringified tool inputs during prompt serialization', () => {
    const prompt = [
      {
        content: [
          {
            input: '{"filePath":"README.md"}',
            providerExecuted: true,
            toolCallId: '1',
            toolName: 'Read',
            type: 'tool-call' as const,
          },
        ],
        role: 'assistant' as const,
      },
    ];

    const output = buildPrompt(prompt as unknown as LanguageModelV2Prompt);

    expect(output).toContain('"filePath": "README.md"');
    expect(output).not.toContain('\\"filePath\\"');

    const invalidJsonOutput = buildPrompt([
      {
        content: [{ input: '{', toolCallId: '2', toolName: 'Read', type: 'tool-call' as const }],
        role: 'assistant' as const,
      },
    ] as unknown as LanguageModelV2Prompt);

    expect(invalidJsonOutput).toContain('[tool-call:Read] "{"');
  });

  it('loads CLAUDE.md content only when enabled', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'claude-md-'));
    const filePath = join(cwd, 'CLAUDE.md');
    await writeFile(filePath, '  Hello Claude  ');
    const emptyPath = join(cwd, 'EMPTY.md');
    await writeFile(emptyPath, '   ');

    await expect(loadClaudeMd({ cwd, loadClaudeMd: false })).resolves.toBeUndefined();
    await expect(loadClaudeMd({ cwd, loadClaudeMd: true })).resolves.toBe('Hello Claude');
    await expect(loadClaudeMd({ cwd, explicitPath: filePath, loadClaudeMd: true })).resolves.toBe('Hello Claude');
    await expect(loadClaudeMd({ cwd, explicitPath: emptyPath, loadClaudeMd: true })).resolves.toBeUndefined();
    await expect(loadClaudeMd({ cwd, explicitPath: join(cwd, 'missing.md'), loadClaudeMd: true })).resolves.toBeUndefined();
  });
});
