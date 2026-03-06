# @seonggukchoi/opencode-notifier

macOS desktop notification plugin for [OpenCode](https://opencode.ai). Sends native notifications via [terminal-notifier](https://github.com/julienXX/terminal-notifier) when sessions start, complete, error out, or when tool executions occur.

## Prerequisites

- **macOS** only
- **terminal-notifier** must be installed:

```bash
brew install terminal-notifier
```

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
  }
}
```

| Option   | Type     | Default | Description                            |
| -------- | -------- | ------- | -------------------------------------- |
| `locale` | `string` | `"en"`  | Notification language (`"en"`, `"ko"`) |
| `events` | `object` | —       | Per-event configuration (see below)    |

If the config file is missing or contains an invalid locale, the plugin falls back to English.

### Event configuration

Each event can be configured with:

| Property  | Type      | Default | Description                       |
| --------- | --------- | ------- | --------------------------------- |
| `enabled` | `boolean` | `true`  | Whether to send this notification |
| `message` | `string`  | —       | Custom message (overrides i18n)   |

Available event keys:

| Key                 | Description                     | Template variable |
| ------------------- | ------------------------------- | ----------------- |
| `sessionStarted`    | Session started (busy)          | —                 |
| `sessionCompleted`  | Session completed               | —                 |
| `sessionError`      | An error occurred               | —                 |
| `sessionCompacted`  | Session compacted               | —                 |
| `permissionChanged` | Permission changed              | —                 |
| `decisionNeeded`    | Question tool (decision needed) | `{{question}}`    |
| `subagentStarted`   | Subagent task started           | `{{description}}` |
| `subagentCompleted` | Subagent task completed         | —                 |
| `toolExecuting`     | MCP tool executing              | `{{toolName}}`    |
| `toolCompleted`     | MCP tool completed              | `{{toolName}}`    |

Omitted events default to `{ "enabled": true }` with the i18n message.

## Notifications

### Session events

| Event                | Title       | Sound | Description            |
| -------------------- | ----------- | ----- | ---------------------- |
| `session.status`     | ⚡ OpenCode | Pop   | Session started (busy) |
| `session.idle`       | ✅ OpenCode | Hero  | Session completed      |
| `session.error`      | ❌ OpenCode | Basso | An error occurred      |
| `session.compacted`  | 📦 OpenCode | Purr  | Session compacted      |
| `permission.updated` | 🔐 OpenCode | Glass | Permission changed     |

### Tool events

| Event                 | Title       | Sound     | Description                     |
| --------------------- | ----------- | --------- | ------------------------------- |
| `tool.execute.before` | 🙋 OpenCode | Glass     | Question tool (decision needed) |
| `tool.execute.before` | 🤖 OpenCode | Submarine | Subagent task started           |
| `tool.execute.before` | 🔧 OpenCode | Tink      | MCP tool executing              |
| `tool.execute.after`  | 🤖 OpenCode | Hero      | Subagent task completed         |
| `tool.execute.after`  | ✓ OpenCode  | Blow      | MCP tool completed              |

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
