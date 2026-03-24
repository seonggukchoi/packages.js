import { describe, expect, it } from 'vitest';

import { buildBridge } from './bridge.js';
import { jsonSchemaToZod, jsonSchemaToZodObjectShape } from './schema.js';

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

  it('returns undefined for non-object schemas', () => {
    expect(jsonSchemaToZodObjectShape(undefined)).toBeUndefined();
    expect(jsonSchemaToZodObjectShape({ type: 'string' })).toBeUndefined();
    expect(
      jsonSchemaToZodObjectShape({ properties: [], type: 'object' } as unknown as Parameters<typeof jsonSchemaToZodObjectShape>[0]),
    ).toEqual({});
  });
});

describe('jsonSchemaToZod', () => {
  it('handles boolean, enum, array, object, string format, and fallback schemas', () => {
    expect(jsonSchemaToZod(undefined).parse('anything')).toBe('anything');
    expect(jsonSchemaToZod(true as unknown as Parameters<typeof jsonSchemaToZod>[0]).parse('anything')).toBe('anything');
    expect(jsonSchemaToZod({ enum: ['a'] }).parse('a')).toBe('a');
    expect(jsonSchemaToZod({ enum: ['a', 'b'] }).parse('b')).toBe('b');
    expect(jsonSchemaToZod({ enum: [] }).parse('fallback')).toBe('fallback');
    expect(jsonSchemaToZod({ type: ['string', 'null'] }).parse('text')).toBe('text');
    expect(jsonSchemaToZod({ items: [{ type: 'integer' }], type: 'array' }).parse([1])).toEqual([1]);
    expect(jsonSchemaToZod({ items: { type: 'number' }, type: 'array' }).parse([1.5])).toEqual([1.5]);
    expect(jsonSchemaToZod({ type: 'boolean' }).parse(true)).toBe(true);
    expect(jsonSchemaToZod({ type: 'integer' }).parse(1)).toBe(1);
    expect(jsonSchemaToZod({ type: 'number' }).parse(1.5)).toBe(1.5);
    expect(jsonSchemaToZod({ format: 'url', type: 'string' }).parse('https://example.com')).toBe('https://example.com');
    expect(jsonSchemaToZod({ type: 'string' }).parse('plain')).toBe('plain');
    expect(jsonSchemaToZod({ type: 'object' }).parse({ ok: true })).toEqual({ ok: true });
    expect(jsonSchemaToZod({ properties: { a: { type: 'string' } }, type: 'object' }).parse({ a: 'ok', b: 1 })).toEqual({
      a: 'ok',
      b: 1,
    });
    expect(jsonSchemaToZod({ type: 'null' } as unknown as Parameters<typeof jsonSchemaToZod>[0]).parse('fallback')).toBe('fallback');
  });
});
