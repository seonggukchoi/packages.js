# @seonggukchoi/codex-notifier

[English](../README.md)

[Codex CLI](https://developers.openai.com/codex/cli)용 멀티 채널 알림 플러그인입니다. 세션 시작, 턴 완료, 턴 중단, 서브에이전트/도구 실행 시 macOS 네이티브 알림([terminal-notifier](https://github.com/julienXX/terminal-notifier)) 및/또는 Telegram Bot API를 통해 알림을 전송합니다.

[`@seonggukchoi/claude-code-notifier`](../../claude-code-notifier)의 Codex 판입니다. 채널, 설정 파일 형식, 알림 구성이 같으며, Codex 자체에서 비롯된 차이점은 [claude-code-notifier와의 차이](#claude-code-notifier와의-차이)에 정리했습니다.

## 사전 요구 사항

- **Codex CLI** 0.154.0 이상 (플러그인 훅과 `codex plugin` 명령 지원)
- **macOS 채널**: [terminal-notifier](https://github.com/julienXX/terminal-notifier) 설치 필요:

```bash
brew install terminal-notifier
```

- **Telegram 채널**: [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) 토큰과 채팅 ID 필요

## 설치

Codex는 npm에서 플러그인을 직접 설치하지 않고 마켓플레이스에서 설치합니다. [packages.js](https://github.com/seonggukchoi/packages.js) 저장소는 `seonggukchoi`라는 이름의 Codex 마켓플레이스이고, 그 `codex-notifier` 항목이 이 npm 패키지를 가리키므로, 저장소를 마켓플레이스로 등록한 뒤 설치합니다:

```bash
codex plugin marketplace add seonggukchoi/packages.js
codex plugin add codex-notifier@seonggukchoi
```

Codex가 배포된 패키지를 `npm pack`으로 내려받아 `~/.codex/plugins/cache/seonggukchoi/codex-notifier/<version>/`에 복사하고 `hooks/hooks.json`의 훅을 등록합니다. 이 과정에는 `PATH`에 `npm`이 있어야 합니다.

또는 패키지를 npm으로 설치한 뒤 설치된 디렉토리를 Codex에 등록할 수도 있습니다. 패키지에도 같은 마켓플레이스 파일이 들어 있습니다:

```bash
npm install -g @seonggukchoi/codex-notifier
codex plugin marketplace add "$(npm root -g)/@seonggukchoi/codex-notifier"
codex plugin add codex-notifier@seonggukchoi
```

플러그인 훅은 신뢰하기 전까지 실행되지 않습니다. 다음에 `codex`를 시작하면 **Hooks need review** 화면이 표시되므로 **Review hooks** 또는 **Trust all and continue**를 선택합니다. 목록은 언제든 `/hooks`로 다시 볼 수 있습니다.

업그레이드하려면 `codex plugin remove codex-notifier@seonggukchoi`와 `codex plugin add codex-notifier@seonggukchoi`를 다시 실행합니다(두 번째 방식을 썼다면 새 npm 버전을 먼저 설치합니다). 훅 명령이 바뀌므로 Codex가 훅 신뢰를 다시 요청합니다.

## 설정

`~/.codex/plugins/codex-notifier/config.json`에 설정 파일을 생성합니다 (`CODEX_HOME`을 지정한 경우 `$CODEX_HOME/plugins/codex-notifier/` 아래):

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

설정 파일이 없거나 유효하지 않은 locale이면 영어로 폴백합니다. `channels` 키가 없는 설정 파일은 macOS 채널만 활성화합니다.

### 채널

#### macOS (`macos`)

| 속성      | 타입      | 기본값 | 설명                                |
| --------- | --------- | ------ | ----------------------------------- |
| `enabled` | `boolean` | `true` | macOS 네이티브 알림 활성화/비활성화 |
| `events`  | `object`  | —      | 이 채널의 이벤트별 오버라이드       |

#### Telegram (`telegram`)

| 속성                      | 타입      | 기본값  | 설명                                                 |
| ------------------------- | --------- | ------- | ---------------------------------------------------- |
| `enabled`                 | `boolean` | `false` | Telegram 알림 활성화/비활성화                        |
| `botToken`                | `string`  | —       | **필수.** Telegram Bot API 토큰                      |
| `chatId`                  | `string`  | —       | **필수.** 대상 채팅/그룹 ID                          |
| `connectAttemptTimeoutMs` | `number`  | `2000`  | 연결 시 주소 계열 하나에 허용하는 밀리초 (아래 참고) |
| `events`                  | `object`  | —       | 이 채널의 이벤트별 오버라이드                        |

> **느린 네트워크**: `api.telegram.org`는 IPv4 주소와 IPv6 주소를 함께 반환하며, Node는 두 주소를 차례로 시도합니다. Node가 각 시도에 배정하는 기본 시간은 250밀리초인데, 느린 회선에서는 정상적으로 연결되던 IPv4 시도까지 포기할 만큼 짧습니다. 이때 호스트에 외부로 나가는 IPv6 경로가 없으면 이어지는 시도마저 실패해 알림이 전달되지 않습니다. 이 플러그인은 기본값을 2000밀리초로 올려 둡니다. 회선이 매우 느려서 여전히 전달되지 않는다면 `connectAttemptTimeoutMs`를 더 키우십시오. 받아들여지는 값은 1 이상 2147483647 이하의 정수이며, 이 범위를 벗어나거나 정수가 아닌 값은 무시되고 기본값 2000밀리초가 적용되고, 10밀리초 미만으로 지정한 값은 Node가 10밀리초로 올려서 사용합니다.

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

| 키                    | 설명                                  | 템플릿 변수       |
| --------------------- | ------------------------------------- | ----------------- |
| `sessionStarted`      | 세션 시작됨 (작업 중)                 | —                 |
| `sessionCompleted`    | 턴 완료됨                             | —                 |
| `sessionInterrupted`  | 사용자가 턴을 중단함                  | —                 |
| `sessionCompacted`    | 세션 압축됨                           | —                 |
| `permissionRequested` | 권한 승인 요청됨                      | —                 |
| `decisionNeeded`      | Codex가 질문함 (`request_user_input`) | `{{question}}`    |
| `subagentStarted`     | 서브에이전트 작업 시작됨              | `{{description}}` |
| `subagentCompleted`   | 서브에이전트 작업 완료됨              | —                 |
| `toolExecuting`       | MCP 도구 실행 중                      | `{{toolName}}`    |
| `toolCompleted`       | MCP 도구 완료됨                       | `{{toolName}}`    |

생략된 이벤트는 `{ "enabled": true }`와 i18n 메시지가 기본값입니다.

## 훅

이 플러그인은 Codex의 [훅 시스템](https://developers.openai.com/codex/hooks)을 사용합니다. `.codex-plugin/plugin.json`이 가리키는 `hooks/hooks.json`을 통해 다음 훅이 등록됩니다:

`Stop`을 제외한 모든 훅은 백그라운드(`async`)로 실행됩니다. Codex는 종료 시 아직 실행 중인 백그라운드 훅을 중단하므로, 한 번 실행하고 끝나는 `codex exec`에서는 `sessionCompleted` 알림이 사라집니다. 그래서 `Stop` 훅만 동기로 실행합니다.

| 훅                  | 매처                                           | 이벤트 키             | 설명                      |
| ------------------- | ---------------------------------------------- | --------------------- | ------------------------- |
| `SessionStart`      | —                                              | `sessionStarted`      | 세션 시작됨               |
| `Stop`              | —                                              | `sessionCompleted`    | 턴 완료됨                 |
| `Interrupt`         | —                                              | `sessionInterrupted`  | 사용자가 턴을 중단함      |
| `PostCompact`       | —                                              | `sessionCompacted`    | 세션 압축됨               |
| `PermissionRequest` | —                                              | `permissionRequested` | 권한 승인 요청됨          |
| `PreToolUse`        | `request_user_input\|request_user_input_async` | `decisionNeeded`      | Codex가 사용자에게 질문함 |
| `SubagentStart`     | —                                              | `subagentStarted`     | 서브에이전트 작업 시작됨  |
| `SubagentStop`      | —                                              | `subagentCompleted`   | 서브에이전트 작업 완료됨  |
| `PreToolUse`        | `mcp__.*`                                      | `toolExecuting`       | MCP 도구 실행 중          |
| `PostToolUse`       | `mcp__.*`                                      | `toolCompleted`       | MCP 도구 완료됨           |

## 알림

### 세션 이벤트

| 이벤트 키            | 타이틀   | 사운드 | 설명                  |
| -------------------- | -------- | ------ | --------------------- |
| `sessionStarted`     | ⚡ Codex | Pop    | 세션 시작됨 (작업 중) |
| `sessionCompleted`   | ✅ Codex | Hero   | 턴 완료됨             |
| `sessionInterrupted` | ⏹️ Codex | Funk   | 사용자가 턴을 중단함  |
| `sessionCompacted`   | 📦 Codex | Purr   | 세션 압축됨           |

### 권한 이벤트

| 이벤트 키             | 타이틀   | 사운드 | 설명             |
| --------------------- | -------- | ------ | ---------------- |
| `permissionRequested` | 🔐 Codex | Glass  | 권한 승인 요청됨 |

> **알려진 한계 (자동 승인 검토)**: Codex는 `PermissionRequest` 훅을 자동 승인 검토자(Guardian)보다 먼저 실행합니다. 따라서 `config.toml`에 `approvals_reviewer = "auto_review"`를 설정하면, 검토자가 스스로 승인하거나 거부해서 사용자가 할 일이 없는 요청에도 `permissionRequested` 알림이 전송됩니다. 훅 입력에는 검토자 설정과 검토 결과가 없고, 실제로 승인 창이 표시되는 시점에 실행되는 훅도 없어서 플러그인은 두 경우를 구분할 수 없습니다 (Codex 0.156.0 기준으로 확인).
>
> 알림이 너무 많다면 `"events": { "permissionRequested": { "enabled": false } }`로 이 이벤트를 끌 수 있습니다. 이 경우 검토자가 사용자에게 판단을 넘기는 드문 요청(예: 검토 입력이 컨텍스트 한도를 넘는 경우)에도 알림이 오지 않습니다. Codex TUI 자체 설정인 `[tui] notifications = ["approval-requested"]`는 실제로 승인 창이 표시될 때만 터미널 알림(OSC 9 / BEL)을 보냅니다.

### 결정 및 서브에이전트 이벤트

| 이벤트 키           | 타이틀   | 사운드    | 설명                     |
| ------------------- | -------- | --------- | ------------------------ |
| `decisionNeeded`    | 🙋 Codex | Glass     | 질문 도구 (결정 필요)    |
| `subagentStarted`   | 🤖 Codex | Submarine | 서브에이전트 작업 시작됨 |
| `subagentCompleted` | 🤖 Codex | Hero      | 서브에이전트 작업 완료됨 |

### 도구 이벤트

| 이벤트 키       | 타이틀   | 사운드 | 설명             |
| --------------- | -------- | ------ | ---------------- |
| `toolExecuting` | 🔧 Codex | Tink   | MCP 도구 실행 중 |
| `toolCompleted` | ✓ Codex  | Blow   | MCP 도구 완료됨  |

## 알림 컨텍스트

모든 알림 메시지에는 세션을 한눈에 구분할 수 있도록 컨텍스트 라벨이 접두사로 붙습니다:

- **스레드 이름** — 스레드에 이름이 있으면(Codex가 첫 메시지에서 자동으로 생성한 이름, 또는 `/rename`으로 지정한 이름) 해당 이름을 사용합니다. Codex는 스레드 이름을 `~/.codex/session_index.jsonl`에 기록하며, 플러그인은 해당 세션의 가장 최근 기록을 읽습니다.
- **작업 디렉토리** — 그렇지 않으면 현재 디렉토리 이름을 폴백으로 사용합니다.
- **위임된 에이전트** — 서브에이전트 이벤트(`subagentStarted` / `subagentCompleted`)에서는 부모 세션 컨텍스트에 에이전트 역할이 `세션(역할)` 형식으로 덧붙습니다(예: `my-project(explorer)`). `spawn_agent`로 생성된 에이전트는 부모 세션 아래에서 실행되므로, 단순 스레드 ID 대신 어느 세션에서 어떤 위임 에이전트가 보낸 알림인지 분명하게 구분할 수 있습니다.

컨텍스트는 훅 이벤트마다 해석되므로, 스레드 이름을 변경하면 재시작 없이 이후 알림에 반영됩니다.

## 워크스페이스 라벨 (Telegram)

Telegram 알림은 원격으로 전달되므로 어느 기기에서 온 알림인지 한눈에 알기 어렵습니다. 이를 구분할 수 있도록 Telegram 알림 타이틀에 워크스페이스 라벨이 덧붙습니다 — 예: `⚡ Codex [home-workspace]`.

- `config.json`의 `workspace`에 원하는 라벨을 지정합니다.
- `workspace`를 생략하면 OS hostname이 폴백으로 사용됩니다.

이 라벨은 **Telegram에만** 적용됩니다. macOS 알림은 로컬에 표시되므로 타이틀이 그대로 유지됩니다.

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

아이콘은 `.icns`에서 `.png`로 변환되어 `~/.codex/plugins/codex-notifier/icons/`에 캐시됩니다.

## claude-code-notifier와의 차이

이벤트 키, 설정 형식, 알림 구성은 `@seonggukchoi/claude-code-notifier`와 같습니다. 다음 차이는 Codex가 훅에 제공하는 정보에서 비롯됩니다:

- **`sessionError`가 없습니다.** Codex에는 `StopFailure` 훅이 없고, 턴이 오류로 끝날 때 어떤 훅도 실행하지 않으므로 이 이벤트를 연결할 대상이 없습니다.
- **`sessionInterrupted`가 추가되었습니다.** Codex는 턴을 중단하면 `Stop` 대신 `Interrupt`를 실행하므로, 이 이벤트가 없으면 원격에서 지켜보는 쪽은 턴이 끝났다는 사실을 알 수 없습니다. 로컬 채널에서 번거롭다면 `"sessionInterrupted": { "enabled": false }`로 끕니다.
- **`decisionNeeded`는 `PreToolUse`에서 옵니다.** Codex에는 `Notification` 훅이 없으므로, Codex가 사용자에게 질문할 때 쓰는 `request_user_input` 도구(및 `request_user_input_async` 변형)를 매처로 잡습니다. `{{question}}` 템플릿 변수는 전과 같이 "결정이 필요합니다." 문구로 치환됩니다.
- **`Stop`은 턴마다 실행되므로**, 모델이 턴을 마칠 때마다 `sessionCompleted`가 전송됩니다. Claude Code의 `Stop`과 같은 동작입니다.
- **스레드 이름**은 Codex의 `session_index.jsonl`에서 읽습니다. Codex는 모든 스레드에 자동으로 이름을 붙이므로 작업 디렉토리 이름으로 폴백하는 일은 드뭅니다.

## 라이선스

MIT
