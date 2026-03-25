# @seonggukchoi/opencode-claude-code-provider

Claude Agent SDK based provider for OpenCode.

## What it does

- Exposes a custom `LanguageModelV2` provider named `claude-code`
- Uses `@anthropic-ai/claude-agent-sdk` as the runtime adapter behind OpenCode
- Prefers OpenCode-hosted tools through an in-process MCP bridge when a provider-side executor is attached
- Falls back to Claude built-ins for overlapping tools (`bash`, `read`, `write`, `edit`, `glob`, `grep`) when no OpenCode executor is available
- Persists the Claude session id in `providerMetadata["claude-code"].sessionId`

## Supported bridge tools

- `question`
- `task`
- `todowrite`
- `webfetch`
- `websearch`
- `oc_websearch`
- `oc_apply_patch`
- `oc_codesearch`
- JSON Schema based custom tools when the schema is a basic object shape

## Fallback rules

- Prefer `websearch` when OpenCode exposes it directly
- Use `oc_websearch` when the default `websearch` name is hidden by tool gating
- Keep `webfetch` bridged through OpenCode so the host-side formatting and fallback behavior stay consistent

## Known limits

- Remote OAuth MCP servers are skipped and surfaced as warnings
- Non-streaming generation is intentionally not supported
- JSON Schema to Zod conversion is best-effort and currently supports common object, array, string, number, integer, and boolean shapes
- Claude Code CLI currently rejects Agent SDK `effort` values, so configured effort variants are ignored at runtime for stability
- OpenCode custom providers still need a `models` block in config for model discovery
- OpenCode 1.3.0 currently breaks direct `file:` package loading by appending `@latest`
- OpenCode-first routing requires provider-side executors for bridged tools such as `question`
- Permission mode defaults to `bypassPermissions` only when no Claude native tools are active; native fallback sessions default to Claude's standard permission flow

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

The provider defaults to `toolPreference: "opencode-first"`. Bridged OpenCode tools remain available through `mcp__opencode__*`, but Claude permission prompts stay on the default SDK flow for now.

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
- Unsupported tool schema: the provider skips bridging unless a curated or generic Zod shape can be built
- Unbridgeable MCP server: the provider includes a diagnostic warning in the `stream-start` part and continues

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
