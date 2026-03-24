import { describe, expect, it } from 'vitest';

import { normalizeClaudeCodeEffort } from './effort.js';

describe('normalizeClaudeCodeEffort', () => {
  it('returns only valid effort values', () => {
    expect(normalizeClaudeCodeEffort('low')).toBe('low');
    expect(normalizeClaudeCodeEffort('max')).toBe('max');
    expect(normalizeClaudeCodeEffort('invalid')).toBeUndefined();
  });
});
