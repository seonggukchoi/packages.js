import { describe, expect, it } from 'vitest';

import { normalizeMcpServers } from './mcp.js';

describe('normalizeMcpServers', () => {
  it('returns undefined for invalid values and returns objects unchanged', () => {
    expect(normalizeMcpServers(undefined)).toBeUndefined();
    expect(normalizeMcpServers(null)).toBeUndefined();
    expect(normalizeMcpServers([])).toBeUndefined();
    expect(normalizeMcpServers('bad')).toBeUndefined();
    expect(normalizeMcpServers({ github: { type: 'local' } })).toEqual({ github: { type: 'local' } });
  });
});
