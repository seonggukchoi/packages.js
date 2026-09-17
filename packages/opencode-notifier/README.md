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
  "workspace": "home-workspace",
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

| Option      | Type     | Default     | Description                                                                        |
| ----------- | -------- | ----------- | ---------------------------------------------------------------------------------- |
| `locale`    | `string` | `"en"`      | Notification language (`"en"`, `"ko"`)                                             |
| `workspace` | `string` | OS hostname | Device label appended to Telegram notification titles as `[workspace]` (see below) |
| `events`    | `object` | —           | Global per-event configuration (see below)                                         |
| `channels`  | `object` | —           | Notification channel configuration                                                 |

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

## Plugin hooks

This plugin uses OpenCode's [plugin API](https://opencode.ai/docs/plugins/). The following hooks map to event keys:

| Hook                                | Event Key             | Description                   |
| ----------------------------------- | --------------------- | ----------------------------- |
| `event` (`session.status` = `busy`) | `sessionStarted`      | Session started               |
| `event` (`session.idle`)            | `sessionCompleted`    | Session completed             |
| `event` (`session.error`)           | `sessionError`        | An error occurred             |
| `event` (`session.compacted`)       | `sessionCompacted`    | Session compacted             |
| `event` (`permission.asked`)        | `permissionRequested` | Permission approval requested |
| `tool.execute.before` (`question`)  | `decisionNeeded`      | Decision needed from user     |
| `tool.execute.before` (`task`)      | `subagentStarted`     | Subagent task started         |
| `tool.execute.after` (`task`)       | `subagentCompleted`   | Subagent task completed       |
| `tool.execute.before` (`mcp_*`)     | `toolExecuting`       | MCP tool executing            |
| `tool.execute.after` (`mcp_*`)      | `toolCompleted`       | MCP tool completed            |

Session events are reported for the main session only. The `task` tool runs each subagent in a child session, and those are covered by the subagent events instead, so one delegation produces one start and one completion notification.

Deliveries that are still in flight are awaited in the plugin's `dispose` hook, so a Telegram notification is not lost when the OpenCode server shuts down right after the last event.

## Notifications

### Session events

| Event Key          | Title       | Sound | Description            |
| ------------------ | ----------- | ----- | ---------------------- |
| `sessionStarted`   | ⚡ OpenCode | Pop   | Session started (busy) |
| `sessionCompleted` | ✅ OpenCode | Hero  | Session completed      |
| `sessionError`     | ❌ OpenCode | Basso | An error occurred      |
| `sessionCompacted` | 📦 OpenCode | Purr  | Session compacted      |

### Permission events

| Event Key             | Title       | Sound | Description               |
| --------------------- | ----------- | ----- | ------------------------- |
| `permissionRequested` | 🔐 OpenCode | Glass | Permission approval asked |

### Decision & subagent events

| Event Key           | Title       | Sound     | Description                     |
| ------------------- | ----------- | --------- | ------------------------------- |
| `decisionNeeded`    | 🙋 OpenCode | Glass     | Question tool (decision needed) |
| `subagentStarted`   | 🤖 OpenCode | Submarine | Subagent task started           |
| `subagentCompleted` | 🤖 OpenCode | Hero      | Subagent task completed         |

### Tool events

| Event Key       | Title       | Sound | Description        |
| --------------- | ----------- | ----- | ------------------ |
| `toolExecuting` | 🔧 OpenCode | Tink  | MCP tool executing |
| `toolCompleted` | ✓ OpenCode  | Blow  | MCP tool completed |

## Notification context

Every notification message is prefixed with a context label so you can tell sessions apart at a glance:

- **Session title** — if the session has a title (generated by OpenCode after the first response, or set via `/rename`), that title is used.
- **Working directory** — otherwise, the current directory name is used as a fallback. A session that still carries OpenCode's placeholder title (`New session - <timestamp>`) counts as untitled.
- **Delegated agent** — for subagent events (`subagentStarted` / `subagentCompleted`), the `subagent_type` passed to the `task` tool is appended to the parent session's context as `session(agent-type)` — for example, `my-project(explore)`. Events raised inside a subagent's child session, such as a permission request, resolve to the root session's title as well.

The context is resolved per event, so renaming a session is reflected on subsequent notifications without restarting OpenCode.

## Workspace label (Telegram)

Telegram notifications are delivered remotely, so it is not always obvious which machine a notification came from. To make this clear, a workspace label is appended to the Telegram notification title — for example, `⚡ OpenCode [home-workspace]`.

- Set `workspace` in `opencode-notifier.json` to use a custom label.
- When `workspace` is omitted, the OS hostname is used as a fallback.

The label is applied to **Telegram only**. macOS notifications are shown locally, so their titles are left unchanged.

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
- Zed
- Terminal.app
- Warp
- Hyper

Icons are converted from `.icns` to `.png` and cached at `~/.cache/opencode/icons/`.

## License

MIT
