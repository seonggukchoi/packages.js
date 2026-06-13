# @seonggukchoi/opencode-claude-code-plugin

[English](../README.md)

> [!CAUTION]
> **지원 종료(Deprecated) — 더 이상 유지보수하지 않으며, npm에서 내렸습니다.**
>
> 이 플러그인은 [`@seonggukchoi/opencode-claude-code-provider`](https://www.npmjs.com/package/@seonggukchoi/opencode-claude-code-provider)의 컴패니언으로, 해당 프로바이더는 Claude **구독** 로그인으로 Claude Code를 실행해 서드파티 도구(OpenCode)의 백엔드로 사용합니다. **2026년 6월 15일부터** Anthropic은 `claude -p` 및 Claude Agent SDK 사용량을 — **Claude 구독으로 인증하는 서드파티 앱을 포함하여** — 구독 사용량 한도에 포함하지 않고, 표준 API 요율이 적용되는 별도의 월간 _Agent SDK 크레딧_에서 차감합니다. 프로바이더가 지원 종료되면서 이 플러그인도 존재 이유가 사라졌으므로, 지원을 종료하고 npm에서 패키지를 내렸으며 이후 업데이트도 제공하지 않습니다.
>
> 근거: [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) · [Claude Code legal & compliance](https://code.claude.com/docs/en/legal-and-compliance)

[`@seonggukchoi/opencode-claude-code-provider`](https://www.npmjs.com/package/@seonggukchoi/opencode-claude-code-provider)를 위한 [OpenCode](https://opencode.ai) 컴패니언 플러그인입니다.

## 개요

이 플러그인은 OpenCode의 채팅 라이프사이클과 Claude Code 프로바이더를 연결합니다. 매 채팅 요청마다 프로바이더 옵션을 정규화하고, OpenCode의 세션 ID를 프로바이더의 세션 모델에 매핑하며, 제목 생성 세션을 격리하여 메인 대화에 간섭하지 않도록 하고, CLI 동작을 위한 짧은 시스템 노트를 추가합니다.

## 설치

`opencode.json`에서 프로바이더와 함께 등록합니다:

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

## 기능

### 파라미터 정규화 (`chat.params`)

`claude-code` 프로바이더를 대상으로 하는 모든 채팅 요청에서, 프로바이더에 전달되기 전에 다음 옵션을 검증하고 정규화합니다:

| 옵션                          | 동작                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| `effort`                      | `low`, `medium`, `high`, `max` 중 하나로 검증; 유효하지 않으면 제거 |
| `env`                         | 문자열 값의 레코드로 보장; 문자열이 아닌 항목은 필터링             |
| `pathToClaudeCodeExecutable`  | 비어있거나 없으면 `"claude"`로 기본 설정                           |
| `sessionId`                   | OpenCode의 `sessionID`에서 매핑 (아래 참조)                        |

`output.options`에 이미 존재하는 다른 옵션(예: `logFile`)은 스프레드를 통해 그대로 유지됩니다.

### 세션 ID 매핑

플러그인은 OpenCode의 `sessionID`를 프로바이더에 전달하여, Claude Code CLI 세션이 턴 간에 재사용되고 프롬프트 캐시가 유지되도록 합니다.

**제목 생성 요청**(agent가 `"title"`인 경우)에는 세션 ID에 `title-` 접두사를 추가하여 별도의 Claude CLI 세션을 생성합니다. 이 처리가 없으면 제목 에이전트와 메인 대화가 같은 CLI 세션을 공유하여 메시지가 혼선될 수 있습니다.

### 시스템 노트 (`experimental.chat.system.transform`)

Claude가 CLI 프로바이더를 통해 실행 중임을 알리고, 도구 설명을 간결하게 유지하도록 짧은 지시를 추가합니다.

## 주의 사항

- 플러그인은 `providerID === "claude-code"`인 요청에만 활성화됩니다. 다른 프로바이더에는 영향을 주지 않습니다.
- 플러그인은 인증을 처리하지 않습니다. Claude Code CLI는 `claude auth login`으로 별도 인증해야 합니다.
- 플러그인은 API 키나 OAuth 토큰을 저장하지 않습니다.

## 개발

```bash
pnpm --filter @seonggukchoi/opencode-claude-code-plugin build
pnpm --filter @seonggukchoi/opencode-claude-code-plugin test
pnpm --filter @seonggukchoi/opencode-claude-code-plugin lint
```

## 라이선스

MIT
