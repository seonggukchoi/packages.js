import { normalizeClaudeCodeEffort } from './effort.js';

type ChatParamsInput = {
  agent: string;
  model: {
    providerID: string;
  };
  sessionID: string;
};

type ChatParamsOutput = {
  options: Record<string, unknown>;
};

export function normalizeChatParams(input: ChatParamsInput, output: ChatParamsOutput): void {
  if (input.model?.providerID !== 'claude-code') {
    return;
  }

  output.options = {
    ...output.options,
    effort: normalizeClaudeCodeEffort(output.options.effort),
    env: normalizeRecord(output.options.env) ?? {},
    pathToClaudeCodeExecutable: normalizeString(output.options.pathToClaudeCodeExecutable) ?? 'claude',
    sessionId: input.agent === 'title' ? `title-${input.sessionID}` : input.sessionID,
  };
}

function normalizeRecord(value: unknown): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string');

  return Object.fromEntries(entries);
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
