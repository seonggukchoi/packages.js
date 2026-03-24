import { describe, expect, it } from 'vitest';

import { toAgentMcp } from './mcp.js';

describe('toAgentMcp', () => {
  it('converts local and remote MCP configs and skips oauth servers', () => {
    const result = toAgentMcp({
      github: {
        command: ['npx', '-y', '@modelcontextprotocol/server-github'],
        environment: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
        type: 'local',
      },
      remoteHttp: {
        headers: { Authorization: 'Bearer test' },
        transport: 'http',
        type: 'remote',
        url: 'https://example.com/mcp',
      },
      remoteOauth: {
        oauth: { issuer: 'https://example.com' },
        type: 'remote',
        url: 'https://example.com/oauth-mcp',
      },
    });

    expect(result.servers.github).toEqual({
      args: ['-y', '@modelcontextprotocol/server-github'],
      command: 'npx',
      env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
      type: 'stdio',
    });
    expect(result.servers.remoteHttp).toEqual({
      headers: { Authorization: 'Bearer test' },
      type: 'http',
      url: 'https://example.com/mcp',
    });
    expect(result.servers.remoteOauth).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
  });
});
