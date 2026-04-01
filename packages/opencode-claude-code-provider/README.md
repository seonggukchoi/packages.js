# @seonggukchoi/opencode-claude-code-provider

[한국어](./docs/README_KO.md)

A custom AI SDK provider that runs [Claude Code CLI](https://github.com/anthropics/claude-code) as an LLM backend for [OpenCode](https://opencode.ai).

## Overview

This provider runs the Claude Code CLI as a subprocess and bridges it to OpenCode. Claude's built-in tools are disabled; instead, OpenCode's own tool definitions are injected into the system prompt. When Claude needs to use a tool, it outputs a `<tool_call>` XML block, which the provider parses and hands back to OpenCode for execution.

The provider resumes the same Claude Code session across turns, so the Anthropic API's prompt cache stays warm and most of the system prompt and conversation history is served from cache on every request.

## Prerequisites

- **Claude Code CLI** installed and accessible (or specify a custom path via `pathToClaudeCodeExecutable`)

  ```bash
  npm install -g @anthropic-ai/claude-code
  ```

- **Claude Code authenticated** via OAuth

  ```bash
  claude auth login
  ```

  Verify with `claude auth status` or `claude doctor`.

- **OpenCode** with plugin support

## Installation

```bash
npm install @seonggukchoi/opencode-claude-code-provider @seonggukchoi/opencode-claude-code-plugin
```

## Configuration

### Minimal

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
  },
  "model": "claude-code/sonnet"
}
```

### Full example

See [`docs/config.example.json`](./docs/config.example.json) for a complete configuration including cost, limits, effort variants, and logging.

### Model IDs and the `[1m]` suffix

Append `[1m]` to the model ID to enable the **1-million-token context window**. Without it, Claude Code CLI defaults to 200k and may compact the conversation prematurely.

| Model ID                  | Context window |
| ------------------------- | -------------- |
| `claude-opus-4-6`        | 200k           |
| `claude-opus-4-6[1m]`    | **1M**         |
| `claude-sonnet-4-6`      | 200k           |
| `claude-sonnet-4-6[1m]`  | **1M**         |
| `claude-haiku-4-5`       | 200k           |

Haiku does not support the 1M context window.

### Cost tracking

Add a `cost` block ($/MTok) so OpenCode can display accurate spend:

```json
"cost": {
  "input": 5,
  "output": 25,
  "cache_read": 0.5,
  "cache_write": 6.25
}
```

Current pricing: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### Provider options

Options can be set at the provider level (`options`) or per-model level (`models.*.options`).

| Option                        | Type     | Default    | Description                                  |
| ----------------------------- | -------- | ---------- | -------------------------------------------- |
| `pathToClaudeCodeExecutable`  | `string` | `"claude"` | Path to the Claude Code CLI binary           |
| `effort`                      | `string` | —          | Effort level: `low`, `medium`, `high`, `max` |
| `logFile`                     | `string` | —          | File path to log raw CLI JSON stream (JSONL) |
| `env`                         | `object` | —          | Extra environment variables for the CLI      |

### Effort variants

Variants let users switch effort levels from the OpenCode model picker:

```json
"variants": {
  "low":    { "effort": "low" },
  "medium": { "effort": "medium" },
  "high":   { "effort": "high" },
  "max":    { "effort": "max" }
}
```

The top-level `options.effort` sets the default when no variant is selected.

## How it works

### Tools

Claude's native tools are disabled. Instead, OpenCode's tool definitions (bash, edit, read, etc.) are embedded in the system prompt as text. When Claude wants to call a tool, it wraps a JSON payload in `<tool_call>` / `</tool_call>` XML tags. The provider detects these tags in the streamed text, extracts the tool name and arguments, and converts them into standard tool-call events that OpenCode understands. OpenCode then executes the tool and feeds the result back on the next turn. Multiple independent tool calls can be emitted in a single response for parallel execution.

### Sessions and caching

Each conversation reuses the same Claude Code CLI session. The provider stores the session ID in response metadata and automatically resumes it on the next turn using the CLI's `--resume` flag. This keeps the Anthropic API prompt cache warm: the system prompt and conversation history stay cached, so only new content incurs full input token costs. If a resume fails (e.g. session expired), the provider silently falls back to a new session.

Cache is per-model. Switching models mid-session rebuilds the cache from scratch. Changing effort level does not affect the cache.

## Companion plugin

[`@seonggukchoi/opencode-claude-code-plugin`](https://www.npmjs.com/package/@seonggukchoi/opencode-claude-code-plugin) is strongly recommended. It handles:

- **Parameter normalization**: validates options and maps OpenCode's session ID to the provider
- **Title session isolation**: prevents title generation from sharing the main conversation's Claude session
- **System note**: appends a short instruction for the CLI context

## Important notes

- **`tool_call: true` is required** in the model config. Without it, OpenCode will not send tool definitions and tool execution will be completely disabled.
- **`[1m]` suffix matters**. Without it, the CLI caps context at 200k and compacts early, even if OpenCode's `limit.context` is higher.
- **Do not mix models in a session** for best cache efficiency. Each model has its own cache; switching forces a full rebuild.
- **The plugin is effectively required**. Without it, session resume and title session isolation do not work.

## Known limitations

- Only streaming responses are supported
- The CLI does not execute tools directly; all tools are routed through OpenCode
- Claude Code's own `CLAUDE.md` is not loaded; OpenCode provides its own context
- Permission checks are bypassed (`--dangerously-skip-permissions`)
- Context window size is determined by the CLI; use `[1m]` for the full 1M window
- **No cross-model conversation continuity.** Unlike standard API providers that send the full conversation history on every request, this provider resumes a stateful CLI session. When switching to another model (e.g. GPT) mid-session and then switching back, Claude has no awareness of the messages exchanged with the other model. The AI SDK does not forward provider metadata on messages, so the provider cannot identify which messages belong to Claude and which were produced by other models.

## Failure handling

| Scenario                    | Behavior                                                    |
| --------------------------- | ----------------------------------------------------------- |
| CLI not found               | Spawn error (`ENOENT`)                                      |
| CLI not authenticated       | CLI exits with non-zero code; stderr surfaced as error      |
| Invalid JSONL output        | Stream fails with a parsing error                           |
| Invalid `<tool_call>` JSON  | Surfaced as plain text; tool is not executed                 |
| Session resume fails        | Automatic fallback to a new session; no data loss           |

## Development

```bash
pnpm --filter @seonggukchoi/opencode-claude-code-provider build
pnpm --filter @seonggukchoi/opencode-claude-code-provider test
pnpm --filter @seonggukchoi/opencode-claude-code-provider test:smoke
pnpm --filter @seonggukchoi/opencode-claude-code-provider lint
```

## License

MIT
