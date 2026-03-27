# @seonggukchoi/opencode-claude-code-plugin

OpenCode plugin helpers for the Claude Code CLI based provider.

## What it does

- Normalizes `chat.params` output for the `claude-code` provider
- Keeps provider options flat so OpenCode can namespace them under `providerOptions["claude-code"]`
- Adds a short Claude Code system note through `experimental.chat.system.transform`
- Exposes CLI health-check command suggestions

## Normalized options

- `cwd`
- `env`
- `effort`
- `maxTurns`
- `permissionMode`
- `pathToClaudeCodeExecutable`
- `loadClaudeMd`
- `claudeMdPath`

## Health checks

- `claude --version`
- `claude auth status || claude doctor`

## Notes

- The plugin does not own authentication
- The plugin does not store API keys or OAuth tokens
- The plugin only adjusts OpenCode-to-provider contract values
