# @seonggukchoi/claude-code-notifier

Multi-channel notification plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Sends notifications via macOS native notifications ([terminal-notifier](https://github.com/julienXX/terminal-notifier)) and/or Telegram Bot API when sessions start, complete, error out, or when subagent/tool executions occur.

## Prerequisites

- **macOS channel**: Requires [terminal-notifier](https://github.com/julienXX/terminal-notifier):

```bash
brew install terminal-notifier
```

- **Telegram channel**: Requires a [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) token and chat ID.

## Installation

Install the plugin via the Claude Code CLI:

```bash
claude plugin add @seonggukchoi/claude-code-notifier@latest
```

Claude Code will install the plugin and register the hooks automatically.

## Configuration

Create a configuration file at `~/.claude/plugins/claude-code-notifier/config.json`:

```json
{
  "locale": "ko",
  "events": {
    "toolExecuting": { "enabled": false },
    "toolCompleted": { "enabled": false },
    "sessionCompleted": { "message": "All done!" },
    "decisionNeeded": { "message": "Need input: {{question}}" }
  },
  "channels": {
    "macos": {
      "enabled": true
    },
    "telegram": {
      "enabled": true,
      "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
      "chatId": "987654321"
    }
  }
}
```

| Option     | Type     | Default | Description                                |
| ---------- | -------- | ------- | ------------------------------------------ |
| `locale`   | `string` | `"en"`  | Notification language (`"en"`, `"ko"`)     |
| `events`   | `object` | —       | Global per-event configuration (see below) |
| `channels` | `object` | —       | Notification channel configuration         |

If the config file is missing or contains an invalid locale, the plugin falls back to English.

### Migration from v1

If your config file does not have a `channels` key (v1 format), the plugin will automatically migrate it by adding `channels.macos.enabled: true` and writing the updated config back to disk.

### Channels

#### macOS (`macos`)

| Property  | Type      | Default | Description                               |
| --------- | --------- | ------- | ----------------------------------------- |
| `enabled` | `boolean` | `true`  | Enable/disable macOS native notifications |
| `events`  | `object`  | —       | Per-event overrides for this channel      |

#### Telegram (`telegram`)

| Property   | Type      | Default | Description                           |
| ---------- | --------- | ------- | ------------------------------------- |
| `enabled`  | `boolean` | `false` | Enable/disable Telegram notifications |
| `botToken` | `string`  | —       | **Required.** Telegram Bot API token  |
| `chatId`   | `string`  | —       | **Required.** Target chat/group ID    |
| `events`   | `object`  | —       | Per-event overrides for this channel  |

> **Security note**: Your `botToken` is stored in a local config file. Make sure the file has appropriate permissions and is not committed to version control.

### Event configuration

Events are configured at two levels:

1. **Global** (`events`): Applies to all channels by default.
2. **Per-channel** (`channels.<name>.events`): Overrides the global setting for that specific channel.

```json
{
  "events": {
    "toolExecuting": { "enabled": false },
    "sessionCompleted": { "enabled": true }
  },
  "channels": {
    "macos": {
      "enabled": true
    },
    "telegram": {
      "enabled": true,
      "botToken": "...",
      "chatId": "...",
      "events": {
        "toolExecuting": { "enabled": true },
        "sessionCompleted": { "enabled": false }
      }
    }
  }
}
```

In this example:

- **macOS** receives `sessionCompleted` but not `toolExecuting` (follows global).
- **Telegram** receives `toolExecuting` but not `sessionCompleted` (channel override wins).

Each event can be configured with:

| Property  | Type      | Default | Description                       |
| --------- | --------- | ------- | --------------------------------- |
| `enabled` | `boolean` | `true`  | Whether to send this notification |
| `message` | `string`  | —       | Custom message (overrides i18n)   |

Available event keys:

| Key                   | Description                     | Template variable |
| --------------------- | ------------------------------- | ----------------- |
| `sessionStarted`      | Session started (busy)          | —                 |
| `sessionCompleted`    | Session completed               | —                 |
| `sessionError`        | An error occurred               | —                 |
| `sessionCompacted`    | Session compacted               | —                 |
| `permissionRequested` | Permission approval requested   | —                 |
| `decisionNeeded`      | Question tool (decision needed) | `{{question}}`    |
| `subagentStarted`     | Subagent task started           | `{{description}}` |
| `subagentCompleted`   | Subagent task completed         | —                 |
| `toolExecuting`       | MCP tool executing              | `{{toolName}}`    |
| `toolCompleted`       | MCP tool completed              | `{{toolName}}`    |

Omitted events default to `{ "enabled": true }` with the i18n message.

## Hooks

This plugin uses Claude Code's [hooks system](https://docs.anthropic.com/en/docs/claude-code/hooks). The following hooks are registered automatically via `plugin.json`:

| Hook                | Event Key           | Description                     |
| ------------------- | ------------------- | ------------------------------- |
| `SessionStart`      | `sessionStarted`    | Session started                 |
| `Stop`              | `sessionCompleted`  | Session completed               |
| `StopFailure`       | `sessionError`      | An error occurred               |
| `PostCompact`       | `sessionCompacted`  | Session compacted               |
| `PermissionRequest` | `permissionRequested` | Permission approval requested |
| `Notification`      | `decisionNeeded`    | Idle prompt (decision needed)   |
| `SubagentStart`     | `subagentStarted`   | Subagent task started           |
| `SubagentStop`      | `subagentCompleted` | Subagent task completed         |
| `PreToolUse`        | `toolExecuting`     | MCP tool executing (`mcp__*`)   |
| `PostToolUse`       | `toolCompleted`     | MCP tool completed (`mcp__*`)   |

## Notifications

### Session events

| Event Key          | Title              | Sound | Description            |
| ------------------ | ------------------ | ----- | ---------------------- |
| `sessionStarted`   | ⚡ Claude Code     | Pop   | Session started (busy) |
| `sessionCompleted` | ✅ Claude Code     | Hero  | Session completed      |
| `sessionError`     | ❌ Claude Code     | Basso | An error occurred      |
| `sessionCompacted` | 📦 Claude Code     | Purr  | Session compacted      |

### Permission events

| Event Key            | Title              | Sound | Description               |
| -------------------- | ------------------ | ----- | ------------------------- |
| `permissionRequested` | 🔐 Claude Code    | Glass | Permission approval asked |

### Decision & subagent events

| Event Key          | Title              | Sound     | Description                     |
| ------------------ | ------------------ | --------- | ------------------------------- |
| `decisionNeeded`   | 🙋 Claude Code    | Glass     | Question tool (decision needed) |
| `subagentStarted`  | 🤖 Claude Code    | Submarine | Subagent task started           |
| `subagentCompleted` | 🤖 Claude Code   | Hero      | Subagent task completed         |

### Tool events

| Event Key       | Title              | Sound | Description        |
| --------------- | ------------------ | ----- | ------------------ |
| `toolExecuting` | 🔧 Claude Code    | Tink  | MCP tool executing |
| `toolCompleted` | ✓ Claude Code     | Blow  | MCP tool completed |

## Telegram setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the bot token.
2. Get your chat ID:
   - Send a message to your bot.
   - Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and find `chat.id` in the response.
   - For group chats, the chat ID is typically a negative number.
3. Add the configuration to your `config.json`:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "<YOUR_BOT_TOKEN>",
      "chatId": "<YOUR_CHAT_ID>"
    }
  }
}
```

## Terminal detection

The plugin detects the current terminal app and includes its icon in notifications. Supported terminals:

- iTerm2
- Cursor
- VS Code
- Zed
- Terminal.app
- Warp
- Hyper

Icons are converted from `.icns` to `.png` and cached at `~/.claude/plugins/claude-code-notifier/icons/`.

## License

MIT
