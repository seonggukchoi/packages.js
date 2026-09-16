# @seonggukchoi/codex-notifier

[한국어](./docs/README_KO.md)

Multi-channel notification plugin for the [Codex CLI](https://developers.openai.com/codex/cli). Sends notifications via macOS native notifications ([terminal-notifier](https://github.com/julienXX/terminal-notifier)) and/or Telegram Bot API when sessions start, complete, get interrupted, or when subagent/tool executions occur.

This is the Codex counterpart of [`@seonggukchoi/claude-code-notifier`](../claude-code-notifier): same channels, same configuration format, same notification layout. The differences that come from Codex itself are listed under [Differences from claude-code-notifier](#differences-from-claude-code-notifier).

## Prerequisites

- **Codex CLI** 0.154.0 or later (plugin hooks and the `codex plugin` commands).
- **macOS channel**: Requires [terminal-notifier](https://github.com/julienXX/terminal-notifier):

```bash
brew install terminal-notifier
```

- **Telegram channel**: Requires a [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) token and chat ID.

## Installation

Codex installs plugins from a marketplace, not from npm directly. The [packages.js](https://github.com/seonggukchoi/packages.js) repository is a Codex marketplace named `seonggukchoi` whose `codex-notifier` entry points at this npm package, so add the repository as a marketplace and install from it:

```bash
codex plugin marketplace add seonggukchoi/packages.js
codex plugin add codex-notifier@seonggukchoi
```

Codex downloads the published package with `npm pack`, copies it into `~/.codex/plugins/cache/seonggukchoi/codex-notifier/<version>/` and registers the hooks from `hooks/hooks.json`. `npm` must be on your `PATH` for this.

Alternatively, install the package with npm and point Codex at the installed directory; the package ships the same marketplace file for that:

```bash
npm install -g @seonggukchoi/codex-notifier
codex plugin marketplace add "$(npm root -g)/@seonggukchoi/codex-notifier"
codex plugin add codex-notifier@seonggukchoi
```

Plugin hooks do not run until you trust them. The next time you start `codex`, it shows **Hooks need review**; choose **Review hooks** or **Trust all and continue**. You can revisit the list at any time with `/hooks`.

To upgrade, run `codex plugin remove codex-notifier@seonggukchoi` and `codex plugin add codex-notifier@seonggukchoi` again (after installing the new npm version, if you used the second method); Codex asks you to trust the hooks again because their commands changed.

## Configuration

Create a configuration file at `~/.codex/plugins/codex-notifier/config.json` (under `$CODEX_HOME/plugins/codex-notifier/` when `CODEX_HOME` is set):

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

If the config file is missing or contains an invalid locale, the plugin falls back to English. A config file without a `channels` key enables the macOS channel only.

### Channels

#### macOS (`macos`)

| Property  | Type      | Default | Description                               |
| --------- | --------- | ------- | ----------------------------------------- |
| `enabled` | `boolean` | `true`  | Enable/disable macOS native notifications |
| `events`  | `object`  | —       | Per-event overrides for this channel      |

#### Telegram (`telegram`)

| Property                  | Type      | Default | Description                                                         |
| ------------------------- | --------- | ------- | ------------------------------------------------------------------- |
| `enabled`                 | `boolean` | `false` | Enable/disable Telegram notifications                               |
| `botToken`                | `string`  | —       | **Required.** Telegram Bot API token                                |
| `chatId`                  | `string`  | —       | **Required.** Target chat/group ID                                  |
| `connectAttemptTimeoutMs` | `number`  | `2000`  | Milliseconds allowed per address family when connecting (see below) |
| `events`                  | `object`  | —       | Per-event overrides for this channel                                |

> **Slow networks**: `api.telegram.org` resolves to both an IPv4 and an IPv6 address, and Node tries them one after another. Node's own budget for each attempt is 250 ms, which is short enough to abandon a working IPv4 connection on a slow link; if the host has no global IPv6 route, the fallback attempt fails too and no notification is delivered. This plugin raises the budget to 2000 ms by default. Increase `connectAttemptTimeoutMs` further if delivery still fails on a very slow link. Accepted values are integers from 1 to 2147483647; a value outside that range, or one that is not an integer, is ignored and the 2000 ms default applies, while Node raises any accepted value below 10 ms up to 10 ms.

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

| Key                   | Description                                   | Template variable |
| --------------------- | --------------------------------------------- | ----------------- |
| `sessionStarted`      | Session started (busy)                        | —                 |
| `sessionCompleted`    | Turn completed                                | —                 |
| `sessionInterrupted`  | Turn interrupted by the user                  | —                 |
| `sessionCompacted`    | Session compacted                             | —                 |
| `permissionRequested` | Permission approval requested                 | —                 |
| `decisionNeeded`      | Codex asked a question (`request_user_input`) | `{{question}}`    |
| `subagentStarted`     | Subagent task started                         | `{{description}}` |
| `subagentCompleted`   | Subagent task completed                       | —                 |
| `toolExecuting`       | MCP tool executing                            | `{{toolName}}`    |
| `toolCompleted`       | MCP tool completed                            | `{{toolName}}`    |

Omitted events default to `{ "enabled": true }` with the i18n message.

## Hooks

This plugin uses Codex's [hooks system](https://developers.openai.com/codex/hooks). The following hooks are registered from `hooks/hooks.json`, which `.codex-plugin/plugin.json` points at:

Every hook runs in the background (`async`) except `Stop`: Codex aborts background hooks that are still running when it exits, which would drop the `sessionCompleted` notification of a one-shot `codex exec` run, so that hook runs synchronously.

| Hook                | Matcher                                        | Event Key             | Description                     |
| ------------------- | ---------------------------------------------- | --------------------- | ------------------------------- |
| `SessionStart`      | —                                              | `sessionStarted`      | Session started                 |
| `Stop`              | —                                              | `sessionCompleted`    | Turn completed                  |
| `Interrupt`         | —                                              | `sessionInterrupted`  | Turn interrupted by the user    |
| `PostCompact`       | —                                              | `sessionCompacted`    | Session compacted               |
| `PermissionRequest` | —                                              | `permissionRequested` | Permission approval requested   |
| `PreToolUse`        | `request_user_input\|request_user_input_async` | `decisionNeeded`      | Codex asked the user a question |
| `SubagentStart`     | —                                              | `subagentStarted`     | Subagent task started           |
| `SubagentStop`      | —                                              | `subagentCompleted`   | Subagent task completed         |
| `PreToolUse`        | `mcp__.*`                                      | `toolExecuting`       | MCP tool executing              |
| `PostToolUse`       | `mcp__.*`                                      | `toolCompleted`       | MCP tool completed              |

## Notifications

### Session events

| Event Key            | Title    | Sound | Description                  |
| -------------------- | -------- | ----- | ---------------------------- |
| `sessionStarted`     | ⚡ Codex | Pop   | Session started (busy)       |
| `sessionCompleted`   | ✅ Codex | Hero  | Turn completed               |
| `sessionInterrupted` | ⏹️ Codex | Funk  | Turn interrupted by the user |
| `sessionCompacted`   | 📦 Codex | Purr  | Session compacted            |

### Permission events

| Event Key             | Title    | Sound | Description               |
| --------------------- | -------- | ----- | ------------------------- |
| `permissionRequested` | 🔐 Codex | Glass | Permission approval asked |

### Decision & subagent events

| Event Key           | Title    | Sound     | Description                     |
| ------------------- | -------- | --------- | ------------------------------- |
| `decisionNeeded`    | 🙋 Codex | Glass     | Question tool (decision needed) |
| `subagentStarted`   | 🤖 Codex | Submarine | Subagent task started           |
| `subagentCompleted` | 🤖 Codex | Hero      | Subagent task completed         |

### Tool events

| Event Key       | Title    | Sound | Description        |
| --------------- | -------- | ----- | ------------------ |
| `toolExecuting` | 🔧 Codex | Tink  | MCP tool executing |
| `toolCompleted` | ✓ Codex  | Blow  | MCP tool completed |

## Notification context

Every notification message is prefixed with a context label so you can tell sessions apart at a glance:

- **Thread name** — if the thread has a name (the one Codex generates from your first message, or the one you set with `/rename`), that name is used. Codex records thread names in `~/.codex/session_index.jsonl`, and the plugin reads the newest record for the session.
- **Working directory** — otherwise, the current directory name is used as a fallback.
- **Delegated agent** — for subagent events (`subagentStarted` / `subagentCompleted`), the agent role is appended to the parent session's context as `session(role)` — for example, `my-project(explorer)`. Agents spawned with `spawn_agent` run under the parent session, so this makes it clear which session, and which delegated agent, the alert came from instead of showing a bare thread id.

The context is resolved per hook event, so renaming a thread is reflected on subsequent notifications without restarting it.

## Workspace label (Telegram)

Telegram notifications are delivered remotely, so it is not always obvious which machine a notification came from. To make this clear, a workspace label is appended to the Telegram notification title — for example, `⚡ Codex [home-workspace]`.

- Set `workspace` in `config.json` to use a custom label.
- When `workspace` is omitted, the OS hostname is used as a fallback.

The label is applied to **Telegram only**. macOS notifications are shown locally, so their titles are left unchanged.

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

Icons are converted from `.icns` to `.png` and cached at `~/.codex/plugins/codex-notifier/icons/`.

## Differences from claude-code-notifier

The event keys, config format and notification layout match `@seonggukchoi/claude-code-notifier`, with these exceptions that come from what Codex exposes to hooks:

- **`sessionError` does not exist.** Codex has no `StopFailure` hook and runs no hook at all when a turn fails with an error, so there is nothing to attach the event to.
- **`sessionInterrupted` is new.** Codex runs `Interrupt` instead of `Stop` when you interrupt a turn, so without it a remote watcher would never learn that the turn ended. Disable it with `"sessionInterrupted": { "enabled": false }` if you find it noisy on the local channel.
- **`decisionNeeded` comes from `PreToolUse`.** Codex has no `Notification` hook; the plugin matches the `request_user_input` tool (and its `request_user_input_async` variant) instead, which is the tool Codex uses to ask you a question. The `{{question}}` template variable still expands to the localized "Decision required." text.
- **`Stop` fires per turn**, so `sessionCompleted` arrives after every turn the model finishes, the same way Claude Code's `Stop` does.
- **Thread names** are read from Codex's `session_index.jsonl`; Codex names every thread automatically, so the fallback to the working-directory name is rarely used.

## License

MIT
