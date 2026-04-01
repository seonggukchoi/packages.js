/* eslint-disable @typescript-eslint/naming-convention */

import { describe, expect, it } from 'vitest';

import { buildPrompt, getLatestUserText, getSystem } from './prompt.js';
import { getResume } from './resume.js';

import type { LanguageModelV2FilePart, LanguageModelV2Prompt } from '@ai-sdk/provider';

describe('prompt helpers', () => {
  it('returns the merged system prompt', () => {
    const prompt = [
      { content: 'System A', role: 'system' as const },
      { content: 'System B', role: 'system' as const },
    ] as unknown as LanguageModelV2Prompt;

    expect(getSystem(prompt)).toBe('System A\n\nSystem B');
    expect(buildPrompt(prompt)).toBe(
      [
        'System instructions:',
        'System A',
        '',
        'System B',
        '',
        'Response instructions:',
        "Respond with the assistant's next message only.",
        'Do not repeat transcript headers, tool narration, or tool results unless the user explicitly asks for the raw transcript.',
      ].join('\n'),
    );
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
    expect(buildPrompt(prompt)).toContain('Conversation transcript (context only - do not repeat or continue it):');
    expect(buildPrompt(prompt)).toContain('Please inspect the workspace.');
    expect(buildPrompt(prompt)).toContain("Respond with the assistant's next message only.");
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
    expect(output).toContain('Assistant used the question tool with input: [object Object]');
    expect(output).toContain('The question tool returned:');
    expect(output).toContain('External tool results:');
    expect(output).toContain('[file mediaType=application/json]');
  });

  it('injects gap context when resuming after messages to another model', () => {
    const prompt = [
      {
        content: [{ text: 'Claude response', type: 'text' as const }],
        providerOptions: { 'claude-code': { modelId: 'claude-haiku-4-5', sessionId: 'sess_abc' } },
        role: 'assistant' as const,
      },
      {
        content: [{ text: 'user asks GPT', type: 'text' as const }],
        role: 'user' as const,
      },
      {
        content: [{ text: 'GPT response', type: 'text' as const }],
        role: 'assistant' as const,
      },
      {
        content: [{ text: 'back to Claude', type: 'text' as const }],
        role: 'user' as const,
      },
    ];

    const output = buildPrompt(prompt as unknown as LanguageModelV2Prompt, { resumeSessionId: 'sess_abc' });

    expect(output).toContain('The following conversation happened with a different model while your session was paused:');
    expect(output).toContain('user asks GPT');
    expect(output).toContain('GPT response');
    expect(output).toContain('Continue from here:');
    expect(output).toContain('back to Claude');
  });

  it('does not inject gap context when no Claude assistant message exists', () => {
    const prompt = [
      {
        content: [{ text: 'GPT response', type: 'text' as const }],
        role: 'assistant' as const,
      },
      {
        content: [{ text: 'new question', type: 'text' as const }],
        role: 'user' as const,
      },
    ];

    const output = buildPrompt(prompt as unknown as LanguageModelV2Prompt, { resumeSessionId: 'sess_abc' });

    expect(output).not.toContain('different model');
    expect(output).toBe('new question');
  });

  it('does not inject gap context when no messages exist between Claude and resume tail', () => {
    const prompt = [
      {
        content: [{ text: 'Claude response', type: 'text' as const }],
        providerOptions: { 'claude-code': { modelId: 'claude-haiku-4-5', sessionId: 'sess_abc' } },
        role: 'assistant' as const,
      },
      {
        content: [{ text: 'follow up', type: 'text' as const }],
        role: 'user' as const,
      },
    ];

    const output = buildPrompt(prompt as unknown as LanguageModelV2Prompt, { resumeSessionId: 'sess_abc' });

    expect(output).not.toContain('different model');
    expect(output).toBe('follow up');
  });

  it('skips system messages in the tail when detecting gap boundary', () => {
    const prompt = [
      {
        content: [{ text: 'Claude response', type: 'text' as const }],
        providerOptions: { 'claude-code': { modelId: 'claude-haiku-4-5', sessionId: 'sess_abc' } },
        role: 'assistant' as const,
      },
      {
        content: [{ text: 'user asks GPT', type: 'text' as const }],
        role: 'user' as const,
      },
      {
        content: [{ text: 'GPT response', type: 'text' as const }],
        role: 'assistant' as const,
      },
      { content: 'injected system note', role: 'system' as const },
      {
        content: [{ text: 'back to Claude', type: 'text' as const }],
        role: 'user' as const,
      },
    ];

    const output = buildPrompt(prompt as unknown as LanguageModelV2Prompt, { resumeSessionId: 'sess_abc' });

    expect(output).toContain('The following conversation happened with a different model while your session was paused:');
    expect(output).toContain('user asks GPT');
    expect(output).toContain('GPT response');
    expect(output).not.toContain('injected system note');
    expect(output).toContain('Continue from here:');
    expect(output).toContain('back to Claude');
  });

  it('injects gap context alongside tool results when resuming with pending tools', () => {
    const prompt = [
      {
        content: [{ text: 'Claude response', type: 'text' as const }],
        providerOptions: { 'claude-code': { modelId: 'claude-haiku-4-5', sessionId: 'sess_abc' } },
        role: 'assistant' as const,
      },
      {
        content: [{ text: 'user asks GPT', type: 'text' as const }],
        role: 'user' as const,
      },
      {
        content: [{ text: 'GPT response', type: 'text' as const }],
        role: 'assistant' as const,
      },
      {
        content: [{ text: 'use tool now', type: 'text' as const }],
        role: 'user' as const,
      },
      {
        content: [{ input: {}, toolCallId: 'tc1', toolName: 'Read', type: 'tool-call' as const }],
        role: 'assistant' as const,
      },
      {
        content: [{ output: { data: 'file content' }, toolCallId: 'tc1', toolName: 'Read', type: 'tool-result' as const }],
        role: 'tool' as const,
      },
    ];

    const output = buildPrompt(prompt as unknown as LanguageModelV2Prompt, { resumeSessionId: 'sess_abc' });

    expect(output).toContain('different model while your session was paused');
    expect(output).toContain('user asks GPT');
    expect(output).toContain('GPT response');
    expect(output).toContain('The Read tool returned:');
    expect(output).toContain('If you have sufficient information');
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

    expect(invalidJsonOutput).toContain('Assistant used the Read tool with input: "{"');
  });
});
