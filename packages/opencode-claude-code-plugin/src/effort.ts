export const CLAUDE_CODE_EFFORT_VALUES = ['low', 'medium', 'high', 'max'] as const;

export type ClaudeCodeEffort = (typeof CLAUDE_CODE_EFFORT_VALUES)[number];

export function normalizeClaudeCodeEffort(value: unknown): ClaudeCodeEffort | undefined {
  return CLAUDE_CODE_EFFORT_VALUES.find((item) => item === value);
}
