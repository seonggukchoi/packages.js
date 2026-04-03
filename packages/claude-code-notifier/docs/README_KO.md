# @seonggukchoi/claude-code-notifier

[English](../README.md)

[Claude Code](https://docs.anthropic.com/en/docs/claude-code)용 멀티 채널 알림 플러그인입니다. 세션 시작, 완료, 오류 발생, 서브에이전트/도구 실행 시 macOS 네이티브 알림([terminal-notifier](https://github.com/julienXX/terminal-notifier)) 및/또는 Telegram Bot API를 통해 알림을 전송합니다.

## 사전 요구 사항

- **macOS 채널**: [terminal-notifier](https://github.com/julienXX/terminal-notifier) 설치 필요:

```bash
brew install terminal-notifier
```

- **Telegram 채널**: [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) 토큰과 채팅 ID 필요

## 설치

Claude Code CLI를 통해 플러그인을 설치합니다:

```bash
claude plugin add @seonggukchoi/claude-code-notifier@latest
```

Claude Code가 플러그인을 설치하고 훅을 자동으로 등록합니다.

## 설정

`~/.claude/plugins/claude-code-notifier/config.json`에 설정 파일을 생성합니다:

```json
{
  "locale": "ko",
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

| 옵션       | 타입     | 기본값  | 설명                                   |
| ---------- | -------- | ------- | -------------------------------------- |
| `locale`   | `string` | `"en"`  | 알림 언어 (`"en"`, `"ko"`)             |
| `events`   | `object` | —       | 전역 이벤트별 설정 (아래 참고)         |
| `channels` | `object` | —       | 알림 채널 설정                         |

설정 파일이 없거나 유효하지 않은 locale이면 영어로 폴백합니다.

### v1에서 마이그레이션

설정 파일에 `channels` 키가 없는 경우(v1 형식), 플러그인이 자동으로 `channels.macos.enabled: true`를 추가하고 업데이트된 설정을 디스크에 저장합니다.

### 채널

#### macOS (`macos`)

| 속성      | 타입      | 기본값 | 설명                              |
| --------- | --------- | ------ | --------------------------------- |
| `enabled` | `boolean` | `true` | macOS 네이티브 알림 활성화/비활성화 |
| `events`  | `object`  | —      | 이 채널의 이벤트별 오버라이드     |

#### Telegram (`telegram`)

| 속성       | 타입      | 기본값  | 설명                                 |
| ---------- | --------- | ------- | ------------------------------------ |
| `enabled`  | `boolean` | `false` | Telegram 알림 활성화/비활성화        |
| `botToken` | `string`  | —       | **필수.** Telegram Bot API 토큰      |
| `chatId`   | `string`  | —       | **필수.** 대상 채팅/그룹 ID          |
| `events`   | `object`  | —       | 이 채널의 이벤트별 오버라이드        |

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

| 속성      | 타입      | 기본값 | 설명                              |
| --------- | --------- | ------ | --------------------------------- |
| `enabled` | `boolean` | `true` | 이 알림의 전송 여부               |
| `message` | `string`  | —      | 커스텀 메시지 (i18n 메시지 대체)  |

사용 가능한 이벤트 키:

| 키                    | 설명                        | 템플릿 변수       |
| --------------------- | --------------------------- | ----------------- |
| `sessionStarted`      | 세션 시작됨 (작업 중)       | —                 |
| `sessionCompleted`    | 세션 완료됨                 | —                 |
| `sessionError`        | 오류 발생                   | —                 |
| `sessionCompacted`    | 세션 압축됨                 | —                 |
| `permissionRequested` | 권한 승인 요청됨            | —                 |
| `decisionNeeded`      | 질문 도구 (결정 필요)       | `{{question}}`    |
| `subagentStarted`     | 서브에이전트 작업 시작됨    | `{{description}}` |
| `subagentCompleted`   | 서브에이전트 작업 완료됨    | —                 |
| `toolExecuting`       | MCP 도구 실행 중            | `{{toolName}}`    |
| `toolCompleted`       | MCP 도구 완료됨             | `{{toolName}}`    |

생략된 이벤트는 `{ "enabled": true }`와 i18n 메시지가 기본값입니다.

## 훅

이 플러그인은 Claude Code의 [훅 시스템](https://docs.anthropic.com/en/docs/claude-code/hooks)을 사용합니다. 다음 훅이 `plugin.json`을 통해 자동으로 등록됩니다:

| 훅                  | 이벤트 키             | 설명                       |
| ------------------- | --------------------- | -------------------------- |
| `SessionStart`      | `sessionStarted`      | 세션 시작됨                |
| `Stop`              | `sessionCompleted`    | 세션 완료됨                |
| `StopFailure`       | `sessionError`        | 오류 발생                  |
| `PostCompact`       | `sessionCompacted`    | 세션 압축됨                |
| `PermissionRequest` | `permissionRequested` | 권한 승인 요청됨           |
| `Notification`      | `decisionNeeded`      | 유휴 프롬프트 (결정 필요)  |
| `SubagentStart`     | `subagentStarted`     | 서브에이전트 작업 시작됨   |
| `SubagentStop`      | `subagentCompleted`   | 서브에이전트 작업 완료됨   |
| `PreToolUse`        | `toolExecuting`       | MCP 도구 실행 중 (`mcp__*`) |
| `PostToolUse`       | `toolCompleted`       | MCP 도구 완료됨 (`mcp__*`) |

## 알림

### 세션 이벤트

| 이벤트 키          | 타이틀             | 사운드 | 설명                 |
| ------------------ | ------------------ | ------ | -------------------- |
| `sessionStarted`   | ⚡ Claude Code     | Pop    | 세션 시작됨 (작업 중) |
| `sessionCompleted` | ✅ Claude Code     | Hero   | 세션 완료됨          |
| `sessionError`     | ❌ Claude Code     | Basso  | 오류 발생            |
| `sessionCompacted` | 📦 Claude Code     | Purr   | 세션 압축됨          |

### 권한 이벤트

| 이벤트 키            | 타이틀             | 사운드 | 설명              |
| -------------------- | ------------------ | ------ | ----------------- |
| `permissionRequested` | 🔐 Claude Code    | Glass  | 권한 승인 요청됨  |

### 결정 및 서브에이전트 이벤트

| 이벤트 키          | 타이틀             | 사운드    | 설명                       |
| ------------------ | ------------------ | --------- | -------------------------- |
| `decisionNeeded`   | 🙋 Claude Code    | Glass     | 질문 도구 (결정 필요)      |
| `subagentStarted`  | 🤖 Claude Code    | Submarine | 서브에이전트 작업 시작됨   |
| `subagentCompleted` | 🤖 Claude Code   | Hero      | 서브에이전트 작업 완료됨   |

### 도구 이벤트

| 이벤트 키       | 타이틀             | 사운드 | 설명              |
| --------------- | ------------------ | ------ | ----------------- |
| `toolExecuting` | 🔧 Claude Code    | Tink   | MCP 도구 실행 중  |
| `toolCompleted` | ✓ Claude Code     | Blow   | MCP 도구 완료됨   |

## Telegram 설정

1. [@BotFather](https://t.me/BotFather)를 통해 봇을 생성하고 봇 토큰을 복사합니다.
2. 채팅 ID를 확인합니다:
   - 봇에게 메시지를 보냅니다.
   - `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`에 접속하여 응답에서 `chat.id`를 찾습니다.
   - 그룹 채팅의 경우 채팅 ID는 보통 음수입니다.
3. `config.json`에 설정을 추가합니다:

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

아이콘은 `.icns`에서 `.png`로 변환되어 `~/.claude/plugins/claude-code-notifier/icons/`에 캐시됩니다.

## 라이선스

MIT
