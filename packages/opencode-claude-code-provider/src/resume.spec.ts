/* eslint-disable @typescript-eslint/naming-convention */

import { describe, expect, it } from 'vitest';

import { getResume } from './resume.js';

describe('getResume', () => {
  it('returns undefined when no session metadata exists', () => {
    expect(getResume([{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], 'claude-haiku-4-5')).toBeUndefined();
  });

  it('reads session metadata from providerMetadata and assistant parts', () => {
    expect(
      getResume(
        [
          {
            content: [{ text: 'done', type: 'text' }],
            providerMetadata: {
              'claude-code': {
                modelId: 'claude-haiku-4-5',
                sessionId: 'sess_meta',
              },
            },
            role: 'assistant',
          },
        ] as never,
        'claude-haiku-4-5',
      ),
    ).toBe('sess_meta');

    expect(
      getResume(
        [
          {
            content: [
              {
                providerOptions: {
                  'claude-code': {
                    modelId: 'claude-haiku-4-5',
                    sessionId: 'sess_part',
                  },
                },
                text: 'chunk',
                type: 'text',
              },
            ],
            role: 'assistant',
          },
        ] as never,
        'claude-haiku-4-5',
      ),
    ).toBe('sess_part');
  });

  it('stops when the last session belongs to a different model', () => {
    expect(
      getResume(
        [
          {
            content: [{ text: 'older', type: 'text' }],
            providerOptions: {
              'claude-code': {
                modelId: 'claude-haiku-4-5',
                sessionId: 'sess_old',
              },
            },
            role: 'assistant',
          },
          {
            content: [{ text: 'done', type: 'text' }],
            providerOptions: {
              'claude-code': {
                modelId: 'claude-sonnet-4-5',
                sessionId: 'sess_other',
              },
            },
            role: 'assistant',
          },
        ] as never,
        'claude-haiku-4-5',
      ),
    ).toBeUndefined();
  });

  it('ignores invalid metadata containers', () => {
    expect(
      getResume(
        [
          {
            content: [
              {
                providerOptions: {
                  'claude-code': 'invalid' as never,
                },
                text: 'chunk',
                type: 'text',
              },
            ],
            providerMetadata: {
              'claude-code': 123,
            },
            role: 'assistant',
          },
        ] as never,
        'claude-haiku-4-5',
      ),
    ).toBeUndefined();

    expect(
      getResume(
        [
          {
            content: [{ text: 'done', type: 'text' }],
            providerOptions: {
              'claude-code': {
                modelId: 123,
                sessionId: 456,
              },
            },
            role: 'assistant',
          },
        ] as never,
        'claude-haiku-4-5',
      ),
    ).toBeUndefined();
  });
});
