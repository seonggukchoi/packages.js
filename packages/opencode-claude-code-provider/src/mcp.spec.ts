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

  it('handles empty input, disabled servers, and missing local commands', () => {
    expect(toAgentMcp(undefined)).toEqual({ servers: {}, warnings: [] });

    const result = toAgentMcp({
      disabled: {
        command: ['node'],
        enabled: false,
        type: 'local',
      },
      invalid: 123,
      missingCommand: {
        command: [],
        type: 'local',
      },
      remoteSse: {
        transport: 'sse',
        type: 'remote',
        url: 'https://example.com/sse',
      },
    } as unknown as Parameters<typeof toAgentMcp>[0]);

    expect(result.servers).toEqual({
      remoteSse: {
        headers: undefined,
        type: 'sse',
        url: 'https://example.com/sse',
      },
    });
    expect(result.warnings).toEqual(['MCP server "missingCommand" is skipped because no command was provided.']);
  });
});
