export function getClaudeCodeHealthcheckCommands(): string[] {
  return ['claude --version', 'claude auth status || claude doctor'];
}
