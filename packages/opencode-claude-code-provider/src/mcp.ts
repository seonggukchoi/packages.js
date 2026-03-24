import { isRecord } from './types.js';

import type { OpenCodeMcpConfig } from './types.js';
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

export function toAgentMcp(input: OpenCodeMcpConfig | undefined): {
  servers: Record<string, McpServerConfig>;
  warnings: string[];
} {
  if (!input) {
    return { servers: {}, warnings: [] };
  }

  const warnings: string[] = [];
  const servers: Record<string, McpServerConfig> = {};

  for (const [name, value] of Object.entries(input)) {
    if (value.enabled === false) {
      continue;
    }

    if (value.type === 'local') {
      const [command, ...args] = value.command;

      if (!command) {
        warnings.push(`MCP server "${name}" is skipped because no command was provided.`);
        continue;
      }

      servers[name] = { args, command, env: value.environment, type: 'stdio' };
      continue;
    }

    if (value.oauth !== undefined && value.oauth !== false) {
      warnings.push(`MCP server "${name}" is skipped because OAuth bridging is not supported yet.`);
      continue;
    }

    if (!isRecord(value)) {
      continue;
    }

    const transport = value.transport === 'sse' ? 'sse' : 'http';
    servers[name] = { headers: value.headers, type: transport, url: value.url };
  }

  return { servers, warnings };
}
