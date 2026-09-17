# @seonggukchoi/opencode-notifier

[English](../README.md)

[OpenCode](https://opencode.ai)용 멀티 채널 알림 플러그인입니다. 세션 시작, 완료, 오류 발생, 도구 실행 시 macOS 네이티브 알림([terminal-notifier](https://github.com/julienXX/terminal-notifier)) 및/또는 Telegram Bot API를 통해 알림을 전송합니다.

## 사전 요구 사항

- **macOS 채널**: [terminal-notifier](https://github.com/julienXX/terminal-notifier) 설치 필요:

```bash
brew install terminal-notifier
```

- **Telegram 채널**: [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) 토큰과 채팅 ID 필요

## 설치

OpenCode 설정 파일(`~/.config/opencode/opencode.json`)에 플러그인을 추가합니다:

```json
{
  "plugin": ["@seonggukchoi/opencode-notifier@latest"]
}
```

다음 실행 시 OpenCode가 플러그인을 자동으로 설치합니다.

## 설정

`~/.config/opencode/opencode-notifier.json`에 설정 파일을 생성합니다:

```json
{
  "locale": "ko",
  "workspace": "home-workspace",
  "events": {
    "toolExecuting": { "enabled": false },
    "toolCompleted": { "enabled": false },
    "sessionCompleted": { "message": "작업 완료!" },
    "decisionNeeded": { "message": "입력 필요: {{question}}" }
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

| 옵션        | 타입     | 기본값      | 설명                                                                |
| ----------- | -------- | ----------- | ------------------------------------------------------------------- |
| `locale`    | `string` | `"en"`      | 알림 언어 (`"en"`, `"ko"`)                                          |
| `workspace` | `string` | OS hostname | Telegram 알림 타이틀에 `[workspace]`로 덧붙는 기기 라벨 (아래 참고) |
| `events`    | `object` | —           | 전역 이벤트별 설정 (아래 참고)                                      |
| `channels`  | `object` | —           | 알림 채널 설정                                                      |

설정 파일이 없거나 유효하지 않은 locale이면 영어로 폴백합니다.

### v1에서 마이그레이션

설정 파일에 `channels` 키가 없는 경우(v1 형식), 플러그인이 자동으로 `channels.macos.enabled: true`를 추가하고 업데이트된 설정을 디스크에 저장합니다.

### 채널

#### macOS (`macos`)

| 속성      | 타입      | 기본값 | 설명                                |
| --------- | --------- | ------ | ----------------------------------- |
| `enabled` | `boolean` | `true` | macOS 네이티브 알림 활성화/비활성화 |
| `events`  | `object`  | —      | 이 채널의 이벤트별 오버라이드       |

#### Telegram (`telegram`)

| 속성       | 타입      | 기본값  | 설명                            |
| ---------- | --------- | ------- | ------------------------------- |
| `enabled`  | `boolean` | `false` | Telegram 알림 활성화/비활성화   |
| `botToken` | `string`  | —       | **필수.** Telegram Bot API 토큰 |
| `chatId`   | `string`  | —       | **필수.** 대상 채팅/그룹 ID     |
| `events`   | `object`  | —       | 이 채널의 이벤트별 오버라이드   |

> **보안 참고**: `botToken`은 로컬 설정 파일에 저장됩니다. 파일 권한을 적절히 설정하고 버전 관리에 커밋하지 마세요.

### 이벤트 설정

이벤트는 두 단계에서 설정됩니다:

1. **전역** (`events`): 기본적으로 모든 채널에 적용됩니다.
2. **채널별** (`channels.<name>.events`): 해당 채널의 전역 설정을 오버라이드합니다.

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

이 예시에서:

- **macOS**는 `sessionCompleted`를 수신하지만 `toolExecuting`은 수신하지 않음 (전역 설정 따름).
- **Telegram**은 `toolExecuting`을 수신하지만 `sessionCompleted`는 수신하지 않음 (채널 오버라이드 우선).

각 이벤트는 다음으로 설정할 수 있습니다:

| 속성      | 타입      | 기본값 | 설명                             |
| --------- | --------- | ------ | -------------------------------- |
| `enabled` | `boolean` | `true` | 이 알림의 전송 여부              |
| `message` | `string`  | —      | 커스텀 메시지 (i18n 메시지 대체) |

사용 가능한 이벤트 키:

| 키                    | 설명                     | 템플릿 변수       |
| --------------------- | ------------------------ | ----------------- |
| `sessionStarted`      | 세션 시작됨 (작업 중)    | —                 |
| `sessionCompleted`    | 세션 완료됨              | —                 |
| `sessionError`        | 오류 발생                | —                 |
| `sessionCompacted`    | 세션 압축됨              | —                 |
| `permissionRequested` | 권한 승인 요청됨         | —                 |
| `decisionNeeded`      | 질문 도구 (결정 필요)    | `{{question}}`    |
| `subagentStarted`     | 서브에이전트 작업 시작됨 | `{{description}}` |
| `subagentCompleted`   | 서브에이전트 작업 완료됨 | —                 |
| `toolExecuting`       | MCP 도구 실행 중         | `{{toolName}}`    |
| `toolCompleted`       | MCP 도구 완료됨          | `{{toolName}}`    |

생략된 이벤트는 `{ "enabled": true }`와 i18n 메시지가 기본값입니다.

## 플러그인 훅

이 플러그인은 OpenCode의 [플러그인 API](https://opencode.ai/docs/plugins/)를 사용합니다. 훅과 이벤트 키의 대응은 다음과 같습니다:

| 훅                                  | 이벤트 키             | 설명                     |
| ----------------------------------- | --------------------- | ------------------------ |
| `event` (`session.status` = `busy`) | `sessionStarted`      | 세션 시작됨              |
| `event` (`session.idle`)            | `sessionCompleted`    | 세션 완료됨              |
| `event` (`session.error`)           | `sessionError`        | 오류 발생                |
| `event` (`session.compacted`)       | `sessionCompacted`    | 세션 압축됨              |
| `event` (`permission.asked`)        | `permissionRequested` | 권한 승인 요청됨         |
| `tool.execute.before` (`question`)  | `decisionNeeded`      | 사용자 결정 필요         |
| `tool.execute.before` (`task`)      | `subagentStarted`     | 서브에이전트 작업 시작됨 |
| `tool.execute.after` (`task`)       | `subagentCompleted`   | 서브에이전트 작업 완료됨 |
| `tool.execute.before` (`mcp_*`)     | `toolExecuting`       | MCP 도구 실행 중         |
| `tool.execute.after` (`mcp_*`)      | `toolCompleted`       | MCP 도구 완료됨          |

세션 이벤트는 메인 세션에 대해서만 전송됩니다. `task` 도구는 서브에이전트를 자식 세션에서 실행하는데, 이 세션들은 서브에이전트 이벤트가 대신 다루므로 위임 한 건마다 시작 알림과 완료 알림이 하나씩만 전송됩니다.

전송 중인 알림은 플러그인의 `dispose` 훅에서 완료를 기다리므로, 마지막 이벤트 직후 OpenCode 서버가 종료되어도 Telegram 알림이 유실되지 않습니다.

## 알림

### 세션 이벤트

| 이벤트 키          | 타이틀      | 사운드 | 설명                  |
| ------------------ | ----------- | ------ | --------------------- |
| `sessionStarted`   | ⚡ OpenCode | Pop    | 세션 시작됨 (작업 중) |
| `sessionCompleted` | ✅ OpenCode | Hero   | 세션 완료됨           |
| `sessionError`     | ❌ OpenCode | Basso  | 오류 발생             |
| `sessionCompacted` | 📦 OpenCode | Purr   | 세션 압축됨           |

### 권한 이벤트

| 이벤트 키             | 타이틀      | 사운드 | 설명             |
| --------------------- | ----------- | ------ | ---------------- |
| `permissionRequested` | 🔐 OpenCode | Glass  | 권한 승인 요청됨 |

### 결정 및 서브에이전트 이벤트

| 이벤트 키           | 타이틀      | 사운드    | 설명                     |
| ------------------- | ----------- | --------- | ------------------------ |
| `decisionNeeded`    | 🙋 OpenCode | Glass     | 질문 도구 (결정 필요)    |
| `subagentStarted`   | 🤖 OpenCode | Submarine | 서브에이전트 작업 시작됨 |
| `subagentCompleted` | 🤖 OpenCode | Hero      | 서브에이전트 작업 완료됨 |

### 도구 이벤트

| 이벤트 키       | 타이틀      | 사운드 | 설명             |
| --------------- | ----------- | ------ | ---------------- |
| `toolExecuting` | 🔧 OpenCode | Tink   | MCP 도구 실행 중 |
| `toolCompleted` | ✓ OpenCode  | Blow   | MCP 도구 완료됨  |

## 알림 컨텍스트

모든 알림 메시지에는 세션을 한눈에 구분할 수 있도록 컨텍스트 라벨이 접두사로 붙습니다:

- **세션 타이틀** — 세션에 타이틀이 있으면(첫 응답 후 OpenCode가 생성한 것, 또는 `/rename`으로 설정한 것) 해당 타이틀을 사용합니다.
- **작업 디렉토리** — 그렇지 않으면 현재 디렉토리 이름을 폴백으로 사용합니다. OpenCode의 자리 표시 타이틀(`New session - <timestamp>`)만 있는 세션은 타이틀이 없는 것으로 취급합니다.
- **위임된 에이전트** — 서브에이전트 이벤트(`subagentStarted` / `subagentCompleted`)에서는 `task` 도구에 전달된 `subagent_type`이 부모 세션 컨텍스트에 `세션(에이전트종류)` 형식으로 덧붙습니다(예: `my-project(explore)`). 권한 요청처럼 서브에이전트의 자식 세션 안에서 발생한 이벤트도 루트 세션의 타이틀로 해석됩니다.

컨텍스트는 이벤트마다 해석되므로, 세션 이름을 변경하면 OpenCode를 재시작하지 않아도 이후 알림에 반영됩니다.

## 워크스페이스 라벨 (Telegram)

Telegram 알림은 원격으로 전달되므로 어느 기기에서 온 알림인지 한눈에 알기 어렵습니다. 이를 구분할 수 있도록 Telegram 알림 타이틀에 워크스페이스 라벨이 덧붙습니다 — 예: `⚡ OpenCode [home-workspace]`.

- `opencode-notifier.json`의 `workspace`에 원하는 라벨을 지정합니다.
- `workspace`를 생략하면 OS hostname이 폴백으로 사용됩니다.

이 라벨은 **Telegram에만** 적용됩니다. macOS 알림은 로컬에 표시되므로 타이틀이 그대로 유지됩니다.

## Telegram 설정

1. [@BotFather](https://t.me/BotFather)를 통해 봇을 생성하고 봇 토큰을 복사합니다.
2. 채팅 ID를 확인합니다:
   - 봇에게 메시지를 보냅니다.
   - `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`에 접속하여 응답에서 `chat.id`를 찾습니다.
   - 그룹 채팅의 경우 채팅 ID는 보통 음수입니다.
3. `opencode-notifier.json`에 설정을 추가합니다:

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

## 터미널 감지

플러그인은 현재 터미널 앱을 감지하여 알림에 아이콘을 포함합니다. 지원 터미널:

- iTerm2
- Cursor
- VS Code
- Zed
- Terminal.app
- Warp
- Hyper

아이콘은 `.icns`에서 `.png`로 변환되어 `~/.cache/opencode/icons/`에 캐시됩니다.

## 라이선스

MIT
