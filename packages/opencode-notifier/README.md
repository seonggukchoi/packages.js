# @seonggukchoi/opencode-notifier

[한국어](./docs/README_KO.md)

Multi-channel notification plugin for [OpenCode](https://opencode.ai). Sends notifications via macOS native notifications ([terminal-notifier](https://github.com/julienXX/terminal-notifier)) and/or Telegram Bot API when sessions start, complete, error out, or when tool executions occur.

## Prerequisites

- **macOS channel**: Requires [terminal-notifier](https://github.com/julienXX/terminal-notifier):

```bash
brew install terminal-notifier
```

- **Telegram channel**: Requires a [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) token and chat ID.

## Installation

Add the plugin to your OpenCode configuration (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["@seonggukchoi/opencode-notifier@latest"]
}
```

OpenCode will install the plugin automatically on next launch.

## Configuration

Create a configuration file at `~/.config/opencode/opencode-notifier.json`:

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

## Notifications

### Session events

| Event               | Title       | Sound | Description            |
| ------------------- | ----------- | ----- | ---------------------- |
| `session.status`    | ⚡ OpenCode | Pop   | Session started (busy) |
| `session.idle`      | ✅ OpenCode | Hero  | Session completed      |
| `session.error`     | ❌ OpenCode | Basso | An error occurred      |
| `session.compacted` | 📦 OpenCode | Purr  | Session compacted      |

### Permission events

| Event              | Title       | Sound | Description               |
| ------------------ | ----------- | ----- | ------------------------- |
| `permission.asked` | 🔐 OpenCode | Glass | Permission approval asked |

### Tool events

| Event                 | Title       | Sound     | Description                     |
| --------------------- | ----------- | --------- | ------------------------------- |
| `tool.execute.before` | 🙋 OpenCode | Glass     | Question tool (decision needed) |
| `tool.execute.before` | 🤖 OpenCode | Submarine | Subagent task started           |
| `tool.execute.before` | 🔧 OpenCode | Tink      | MCP tool executing              |
| `tool.execute.after`  | 🤖 OpenCode | Hero      | Subagent task completed         |
| `tool.execute.after`  | ✓ OpenCode  | Blow      | MCP tool completed              |

## Telegram setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the bot token.
2. Get your chat ID:
   - Send a message to your bot.
   - Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and find `chat.id` in the response.
   - For group chats, the chat ID is typically a negative number.
3. Add the configuration to your `opencode-notifier.json`:

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
- Terminal.app
- Warp
- Hyper

Icons are converted from `.icns` to `.png` and cached at `~/.cache/opencode/icons/`.

## License

MIT
