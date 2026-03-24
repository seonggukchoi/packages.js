import { describe, expect, it } from 'vitest';

import { buildBridge } from './bridge.js';
import { jsonSchemaToZodObjectShape } from './schema.js';

describe('jsonSchemaToZodObjectShape', () => {
  it('converts a basic JSON schema object for generic custom tool bridging', () => {
    const shape = jsonSchemaToZodObjectShape({
      properties: {
        query: { type: 'string' },
        timeout: { type: 'integer' },
      },
      required: ['query'],
      type: 'object',
    });

    expect(shape).toBeDefined();
    expect(() =>
      buildBridge({
        bridgeTools: ['custom_search'],
        prompt: [],
        tools: [
          {
            description: 'Search custom data.',
            inputSchema: {
              properties: {
                query: { type: 'string' },
              },
              required: ['query'],
              type: 'object',
            },
            name: 'custom_search',
            type: 'function',
          },
        ],
      }),
    ).not.toThrow();
  });
});
