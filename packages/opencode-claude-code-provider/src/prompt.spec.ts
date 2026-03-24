import { describe, expect, it } from 'vitest';

import { buildPrompt, getSystem, getLatestUserText } from './prompt.js';
import { getResume } from './resume.js';

describe('prompt helpers', () => {
  it('returns the merged system prompt', () => {
    const prompt = [
      { content: 'System A', role: 'system' as const },
      { content: 'System B', role: 'system' as const },
    ];

    expect(getSystem(prompt)).toBe('System A\n\nSystem B');
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
    ];

    expect(getLatestUserText(prompt)).toBe('latest question');
    expect(buildPrompt(prompt, { resumeSessionId: 'sess_123' })).toBe('latest question');
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
        providerMetadata: {
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
});
