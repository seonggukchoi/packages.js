# @seonggukchoi/opencode-claude-code-provider

[English](../README.md)

[Claude Code CLI](https://github.com/anthropics/claude-code)를 [OpenCode](https://opencode.ai)의 LLM 백엔드로 사용하는 커스텀 AI SDK 프로바이더입니다.

## 개요

이 프로바이더는 Claude Code CLI를 서브프로세스로 실행하여 OpenCode와 연결합니다. Claude의 내장 도구는 비활성화되고, 대신 OpenCode의 도구 정의가 시스템 프롬프트에 주입됩니다. Claude가 도구를 사용해야 할 때 `<tool_call>` XML 블록을 출력하면, 프로바이더가 이를 파싱하여 OpenCode에 실행을 위임합니다.

프로바이더는 턴 간에 동일한 Claude Code 세션을 재사용하므로, Anthropic API의 프롬프트 캐시가 유지됩니다. 시스템 프롬프트와 대화 히스토리 대부분이 매 요청마다 캐시에서 제공되어 비용과 지연이 크게 줄어듭니다.

## 사전 요구 사항

- **Claude Code CLI** 설치 및 접근 가능 (`pathToClaudeCodeExecutable`로 커스텀 경로 지정 가능)

  ```bash
  npm install -g @anthropic-ai/claude-code
  ```

- **Claude Code OAuth 인증** 완료

  ```bash
  claude auth login
  ```

  `claude auth status` 또는 `claude doctor`로 확인할 수 있습니다.

- 플러그인을 지원하는 **OpenCode**

## 설치

```bash
npm install @seonggukchoi/opencode-claude-code-provider @seonggukchoi/opencode-claude-code-plugin
```

## 설정

### 최소 설정

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

### 전체 예시

비용, 제한, effort 변형, 로깅 등을 포함한 전체 설정은 [`docs/config.example.json`](./config.example.json)을 참고하세요.

### 모델 ID와 `[1m]` 접미사

모델 ID에 `[1m]`을 추가하면 **100만 토큰 컨텍스트 윈도우**가 활성화됩니다. 없으면 Claude Code CLI가 기본 200k로 동작하여 대화를 조기에 압축(compact)할 수 있습니다.

| 모델 ID                    | 컨텍스트 윈도우 |
| -------------------------- | --------------- |
| `claude-opus-4-6`         | 200k            |
| `claude-opus-4-6[1m]`     | **1M**          |
| `claude-sonnet-4-6`       | 200k            |
| `claude-sonnet-4-6[1m]`   | **1M**          |
| `claude-haiku-4-5`        | 200k            |

Haiku는 1M 컨텍스트 윈도우를 지원하지 않습니다.

### 비용 추적

OpenCode에서 정확한 비용을 표시하려면 `cost` 블록($/MTok 단위)을 추가하세요:

```json
"cost": {
  "input": 5,
  "output": 25,
  "cache_read": 0.5,
  "cache_write": 6.25
}
```

최신 가격: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### 프로바이더 옵션

프로바이더 수준(`options`) 또는 모델별(`models.*.options`)로 설정할 수 있습니다.

| 옵션                           | 타입     | 기본값     | 설명                                     |
| ------------------------------ | -------- | ---------- | ---------------------------------------- |
| `pathToClaudeCodeExecutable`   | `string` | `"claude"` | Claude Code CLI 바이너리 경로            |
| `effort`                       | `string` | —          | effort 수준: `low`, `medium`, `high`, `max` |
| `logFile`                      | `string` | —          | CLI JSON 스트림을 로깅할 파일 경로 (JSONL) |
| `env`                          | `object` | —          | CLI에 전달할 추가 환경 변수              |

### Effort 변형(variants)

OpenCode 모델 선택기에서 effort 수준을 전환할 수 있습니다:

```json
"variants": {
  "low":    { "effort": "low" },
  "medium": { "effort": "medium" },
  "high":   { "effort": "high" },
  "max":    { "effort": "max" }
}
```

상위 `options.effort`는 variant를 선택하지 않았을 때의 기본값입니다.

## 동작 원리

### 도구

Claude의 네이티브 도구는 비활성화됩니다. 대신 OpenCode의 도구 정의(bash, edit, read 등)가 시스템 프롬프트에 텍스트로 삽입됩니다. Claude가 도구를 호출하려면 JSON 페이로드를 `<tool_call>` / `</tool_call>` XML 태그로 감싸서 출력합니다. 프로바이더는 스트리밍 텍스트에서 이 태그를 감지하고, 도구 이름과 인자를 추출하여 OpenCode가 이해하는 표준 tool-call 이벤트로 변환합니다. OpenCode가 도구를 실행하고 다음 턴에 결과를 반환합니다. 독립적인 도구 호출 여러 개를 한 응답에서 병렬로 실행할 수 있습니다.

### 세션과 캐싱

각 대화는 동일한 Claude Code CLI 세션을 재사용합니다. 프로바이더가 응답 메타데이터에 세션 ID를 저장하고, 다음 턴에서 CLI의 `--resume` 플래그로 자동 이어갑니다. 이렇게 하면 Anthropic API의 프롬프트 캐시가 유지되어, 시스템 프롬프트와 대화 히스토리가 캐시에서 제공되고 새 콘텐츠만 전체 입력 토큰 비용이 발생합니다. resume이 실패하면(예: 세션 만료) 자동으로 새 세션으로 폴백합니다.

캐시는 모델별로 분리됩니다. 세션 중간에 모델을 변경하면 캐시가 처음부터 재구축됩니다. effort 수준 변경은 캐시에 영향을 주지 않습니다.

## 컴패니언 플러그인

[`@seonggukchoi/opencode-claude-code-plugin`](https://www.npmjs.com/package/@seonggukchoi/opencode-claude-code-plugin)을 함께 사용하는 것을 강력히 권장합니다:

- **파라미터 정규화**: 옵션을 검증하고 OpenCode의 세션 ID를 프로바이더에 매핑
- **제목 세션 격리**: 제목 생성이 메인 대화의 Claude 세션을 공유하는 것을 방지
- **시스템 노트**: CLI 컨텍스트를 위한 짧은 지시를 추가

## 주의 사항

- **`tool_call: true`는 필수입니다.** 모델 설정에 이 값이 없으면 OpenCode가 도구 정의를 전달하지 않아 도구 실행이 완전히 비활성화됩니다.
- **`[1m]` 접미사가 중요합니다.** 없으면 CLI가 컨텍스트를 200k로 제한하고, OpenCode의 `limit.context`가 높아도 조기 압축합니다.
- **세션 내에서 모델을 혼용하지 마세요.** 모델별로 캐시가 분리되어 전환 시 전체 캐시가 재구축됩니다.
- **플러그인은 사실상 필수입니다.** 없으면 세션 이어하기와 제목 세션 격리가 동작하지 않습니다.

## 알려진 제약 사항

- 스트리밍 응답만 지원
- CLI가 직접 도구를 실행하지 않음; 모든 도구는 OpenCode를 통해 라우팅
- Claude Code의 `CLAUDE.md`는 로딩하지 않음; OpenCode가 자체 컨텍스트 제공
- 권한 검사 우회 (`--dangerously-skip-permissions`)
- 컨텍스트 윈도우 크기는 CLI가 결정; 1M 전체를 사용하려면 `[1m]` 필요

## 오류 처리

| 상황                        | 동작                                                        |
| --------------------------- | ----------------------------------------------------------- |
| CLI를 찾을 수 없음          | 스폰 오류 (`ENOENT`)                                       |
| CLI 인증 안 됨              | CLI가 비정상 종료; stderr가 오류로 표시됨                   |
| 잘못된 JSONL 출력           | 파싱 오류로 스트림 실패                                     |
| 잘못된 `<tool_call>` JSON   | 일반 텍스트로 표시됨; 도구가 실행되지 않음                  |
| 세션 resume 실패            | 자동으로 새 세션으로 폴백; 데이터 손실 없음                 |

## 개발

```bash
pnpm --filter @seonggukchoi/opencode-claude-code-provider build
pnpm --filter @seonggukchoi/opencode-claude-code-provider test
pnpm --filter @seonggukchoi/opencode-claude-code-provider test:smoke
pnpm --filter @seonggukchoi/opencode-claude-code-provider lint
```

## 라이선스

MIT
