# @seonggukchoi/opencode-claude-code-plugin

[한국어](./docs/README_KO.md)

Companion [OpenCode](https://opencode.ai) plugin for [`@seonggukchoi/opencode-claude-code-provider`](https://www.npmjs.com/package/@seonggukchoi/opencode-claude-code-provider).

## Overview

This plugin bridges OpenCode's chat lifecycle with the Claude Code provider. It normalizes provider options on every chat request, maps OpenCode's session ID to the provider's session model, isolates title-generation sessions to prevent them from interfering with the main conversation, and appends a short system note for CLI-aware behavior.

## Installation

```bash
npm install @seonggukchoi/opencode-claude-code-plugin
```

Register it alongside the provider in `opencode.json`:

```json
{
  "plugin": ["@seonggukchoi/opencode-claude-code-plugin"],
  "provider": {
    "claude-code": {
      "npm": "@seonggukchoi/opencode-claude-code-provider",
      "models": {
        "sonnet": { "id": "claude-sonnet-4-6[1m]" },
        "opus": { "id": "claude-opus-4-6[1m]" },
        "haiku": { "id": "claude-haiku-4-5" }
      }
    }
  }
}
```

## What it does

### Parameter normalization (`chat.params`)

On every chat request targeting the `claude-code` provider, the plugin validates and normalizes the following options before they reach the provider:

| Option                       | Behavior                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| `effort`                     | Validated against `low`, `medium`, `high`, `max`; invalid values dropped |
| `env`                        | Ensured to be a string-valued record; non-string entries filtered out    |
| `pathToClaudeCodeExecutable` | Defaults to `"claude"` if empty or missing                               |
| `sessionId`                  | Mapped from OpenCode's `sessionID` (see below)                           |

Other options already present in `output.options` (e.g. `logFile`) are preserved as-is via spread.

### Session ID mapping

The plugin forwards OpenCode's `sessionID` to the provider so that the Claude Code CLI session can be resumed across turns, keeping the prompt cache warm.

For **title-generation requests** (where `agent === "title"`), the session ID is prefixed with `title-` to produce a separate Claude CLI session. Without this, the title agent and the main conversation would share the same CLI session, causing messages to be mixed.

### System note (`experimental.chat.system.transform`)

Appends a short instruction reminding Claude that it is running through the CLI provider and should keep tool narration concise.

## Important notes

- The plugin only activates for requests where `providerID === "claude-code"`. Other providers are unaffected.
- The plugin does not handle authentication. Claude Code CLI must be authenticated separately via `claude auth login`.
- The plugin does not store API keys or OAuth tokens.

## Development

```bash
pnpm --filter @seonggukchoi/opencode-claude-code-plugin build
pnpm --filter @seonggukchoi/opencode-claude-code-plugin test
pnpm --filter @seonggukchoi/opencode-claude-code-plugin lint
```

## License

MIT
