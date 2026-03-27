# @seonggukchoi/opencode-claude-code-provider

Claude Code CLI based provider for OpenCode.

## What it does

- Exposes a custom `LanguageModelV2` provider named `claude-code`
- Runs `claude -p --tools "" --output-format stream-json` as a pure LLM client
- Injects OpenCode tool schemas into the Claude system prompt and converts `<tool_call>` text blocks into AI SDK tool-call parts
- Keeps all tool execution inside OpenCode, including OpenCode-only tools such as `todowrite` and `task`
- Persists the Claude session id in `providerMetadata["claude-code"].sessionId`

## Tool behavior

- Claude native tools are disabled for every request
- Claude must emit exactly one `<tool_call>{"name":"...","arguments":{...}}</tool_call>` block when a tool is needed
- OpenCode executes the tool and feeds the result back through its normal tool loop

## Known limits

- Non-streaming generation is intentionally not supported
- `effort` is retained for config compatibility but is not sent to the CLI yet
- `maxTurns` defaults to `1` because Claude does not execute tools directly in this mode
- OpenCode custom providers still need a `models` block in config for model discovery
- OpenCode 1.3.0 currently breaks direct `file:` package loading by appending `@latest`

## Configuration examples

```json
{
  "plugin": ["@seonggukchoi/opencode-claude-code-plugin"],
  "provider": {
    "claude-code": {
      "npm": "@seonggukchoi/opencode-claude-code-provider",
      "models": {
        "sonnet": { "id": "claude-sonnet-4-6" },
        "opus": { "id": "claude-opus-4-6" },
        "haiku": { "id": "claude-haiku-4-5" }
      }
    }
  },
  "model": "claude-code/sonnet"
}
```

- Full config example: `packages/opencode-claude-code-provider/docs/config.example.json`
- Minimal config example: `packages/opencode-claude-code-provider/docs/config.minimal.example.json`

OpenCode custom providers still require a `models` block for model discovery, so the minimal example keeps only the model ids.

For local unpublished testing, replace the package names in those examples with your local install strategy such as a tarball or registry override.

## Local testing

- Build:
  - `pnpm --filter @seonggukchoi/opencode-claude-code-provider build`
  - `pnpm --filter @seonggukchoi/opencode-claude-code-plugin build`
- Smoke test:
  - `pnpm --filter @seonggukchoi/opencode-claude-code-provider test:smoke`
- Smoke script:
  - `packages/opencode-claude-code-provider/test/smoke.mjs`
- Current limitation:
  - OpenCode 1.3.0 breaks direct `file:` package loading by appending `@latest`

## Failure handling

- Missing CLI executable: expect a process spawn failure such as `ENOENT`
- Unsupported auth status command on older CLI builds: use `claude auth status || claude doctor`
- Invalid CLI JSONL output: the provider fails the stream with a parsing error
- Invalid `<tool_call>` payloads are surfaced back as plain text instead of being executed

## Release checklist

- `pnpm --filter @seonggukchoi/opencode-claude-code-provider test`
- `pnpm --filter @seonggukchoi/opencode-claude-code-provider build`
- `pnpm --filter @seonggukchoi/opencode-claude-code-provider test:smoke`
- Verify `packages/opencode-claude-code-provider/docs/config.example.json`
- Verify `packages/opencode-claude-code-provider/docs/config.minimal.example.json`

## Internal docs

- Full config example: `packages/opencode-claude-code-provider/docs/config.example.json`
- Minimal config example: `packages/opencode-claude-code-provider/docs/config.minimal.example.json`
- Smoke test: `packages/opencode-claude-code-provider/test/smoke.mjs`
