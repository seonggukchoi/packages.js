# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.7.4](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.7.3...@seonggukchoi/opencode-claude-code-provider@0.7.4) (2026-04-01)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

## [0.7.3](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.7.2...@seonggukchoi/opencode-claude-code-provider@0.7.3) (2026-04-01)

### Bug Fixes

- **opencode-claude-code-provider:** skip --system-prompt when resuming a session ([55c95f5](https://github.com/seonggukchoi/packages.js/commit/55c95f51ec3d75c80b33799a59d6a0d517b17b06))

## [0.7.2](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.7.1...@seonggukchoi/opencode-claude-code-provider@0.7.2) (2026-04-01)

### Bug Fixes

- **opencode-claude-code-provider:** add v8 ignore for fallback abort listener coverage ([c8639df](https://github.com/seonggukchoi/packages.js/commit/c8639dfbea843ea4c9717f07d4cd60d4a8a7b735))
- **opencode-claude-code-provider:** fall back to new session when resume fails ([9c14ddd](https://github.com/seonggukchoi/packages.js/commit/9c14ddd251083270491920b11ba79107d2ff5b70))

## [0.7.1](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.7.0...@seonggukchoi/opencode-claude-code-provider@0.7.1) (2026-03-31)

### Bug Fixes

- **opencode-claude-code-provider:** correct V3 usage token mapping for cache tokens ([fde7777](https://github.com/seonggukchoi/packages.js/commit/fde7777f0879bcd552c3b7d10a97766e985451e9))

# [0.7.0](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.6.0...@seonggukchoi/opencode-claude-code-provider@0.7.0) (2026-03-31)

### Bug Fixes

- **opencode-claude-code-provider:** cache model instances to preserve session across calls ([f924d71](https://github.com/seonggukchoi/packages.js/commit/f924d71c0c8ca090a002614043ac1c22a7a3f203))

### Features

- **opencode-claude-code-provider:** support explicit sessionId for persistent session resume ([4da28b1](https://github.com/seonggukchoi/packages.js/commit/4da28b1372001fef03c37c87466e4c7ee9584d95))

# [0.6.0](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.5.2...@seonggukchoi/opencode-claude-code-provider@0.6.0) (2026-03-31)

### Features

- **opencode-claude-code-provider:** migrate to AI SDK v3 specification ([9854477](https://github.com/seonggukchoi/packages.js/commit/98544777cc1065198a8326b3de115110312a445e))

## [0.5.2](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.5.1...@seonggukchoi/opencode-claude-code-provider@0.5.2) (2026-03-31)

### Bug Fixes

- **opencode-claude-code-provider:** include assistant tool-call context in resume prompt ([2a61330](https://github.com/seonggukchoi/packages.js/commit/2a61330d55a984160feb612f360aefcdaef22ef7))
- **opencode-claude-code-provider:** track session ID on model instance for reliable resume ([37a0b77](https://github.com/seonggukchoi/packages.js/commit/37a0b77a09ac2afa67f83aec9bca874e96df1eac))

## [0.5.1](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.5.0...@seonggukchoi/opencode-claude-code-provider@0.5.1) (2026-03-31)

### Bug Fixes

- **opencode-claude-code-provider:** let CLI complete its turn before exiting on tool calls ([152f50f](https://github.com/seonggukchoi/packages.js/commit/152f50ff6b315862be32b2ee31e089e547f9b8b7))

# [0.5.0](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.4.2...@seonggukchoi/opencode-claude-code-provider@0.5.0) (2026-03-31)

### Features

- **opencode-claude-code-provider:** restore --effort and --strict-mcp-config CLI options ([7e84d11](https://github.com/seonggukchoi/packages.js/commit/7e84d11142f5f7e206e3ad32e9e02db4aa1f2319)), closes [#54](https://github.com/seonggukchoi/packages.js/issues/54) [#55](https://github.com/seonggukchoi/packages.js/issues/55)

## [0.4.2](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.4.1...@seonggukchoi/opencode-claude-code-provider@0.4.2) (2026-03-30)

### Bug Fixes

- **opencode-claude-code-provider:** remove --effort cli option ([bf2d48a](https://github.com/seonggukchoi/packages.js/commit/bf2d48ad9f158c0372838c09eecf113a1a6bc9c3))

## [0.4.1](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.4.0...@seonggukchoi/opencode-claude-code-provider@0.4.1) (2026-03-30)

### Bug Fixes

- **opencode-claude-code-provider:** remove --strict-mcp-config flag causing infinite turn loop ([290d9b2](https://github.com/seonggukchoi/packages.js/commit/290d9b2c150be0382c08df61216b12ce8639539e))

# [0.4.0](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.7...@seonggukchoi/opencode-claude-code-provider@0.4.0) (2026-03-30)

### Features

- **opencode-claude-code-provider:** add --effort flag and --strict-mcp-config for MCP isolation ([c03f951](https://github.com/seonggukchoi/packages.js/commit/c03f95155f52ead5fbd95388ddf8cbb1c21cff6f))

## [0.3.7](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.6...@seonggukchoi/opencode-claude-code-provider@0.3.7) (2026-03-30)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

## [0.3.6](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.5...@seonggukchoi/opencode-claude-code-provider@0.3.6) (2026-03-30)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

## [0.3.5](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.4...@seonggukchoi/opencode-claude-code-provider@0.3.5) (2026-03-30)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

## [0.3.4](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.3...@seonggukchoi/opencode-claude-code-provider@0.3.4) (2026-03-30)

### Bug Fixes

- **opencode-claude-code-provider:** remove deprecated bare cli flag ([0e25da2](https://github.com/seonggukchoi/packages.js/commit/0e25da2465ca2624efb1883ecb8491d9b79543a9))

## [0.3.3](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.2...@seonggukchoi/opencode-claude-code-provider@0.3.3) (2026-03-29)

### Bug Fixes

- **opencode-claude-code-provider:** detect closing tags to prevent silent tool call drops ([e7a32b6](https://github.com/seonggukchoi/packages.js/commit/e7a32b6bf49ba1dd12de1e5d4eea79937f47197c))

## [0.3.2](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.1...@seonggukchoi/opencode-claude-code-provider@0.3.2) (2026-03-29)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

## [0.3.1](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.3.0...@seonggukchoi/opencode-claude-code-provider@0.3.1) (2026-03-28)

### Bug Fixes

- **opencode-claude-code-provider:** normalize tool-call input across all stream paths ([a11774b](https://github.com/seonggukchoi/packages.js/commit/a11774b72fcc50a7a756b3f9d2795d9158773ad8))

# [0.3.0](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.11...@seonggukchoi/opencode-claude-code-provider@0.3.0) (2026-03-28)

### Features

- **opencode-claude-code-provider:** support parallel tool calls in a single response ([86dc092](https://github.com/seonggukchoi/packages.js/commit/86dc0924057aa0618d1f4c415e52cb8ab76a7b42))

## [0.2.11](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.10...@seonggukchoi/opencode-claude-code-provider@0.2.11) (2026-03-28)

### Bug Fixes

- **opencode-claude-code-provider:** resume session after tool call results ([b84111a](https://github.com/seonggukchoi/packages.js/commit/b84111a370d4fecd7e71ee656a1a37d519e798a2))
- **opencode-claude-code-provider:** satisfy branch coverage threshold ([9cbc9fc](https://github.com/seonggukchoi/packages.js/commit/9cbc9fca8fa3e4f87a55ae6c5272474d33dda66f))

## [0.2.10](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.9...@seonggukchoi/opencode-claude-code-provider@0.2.10) (2026-03-28)

### Bug Fixes

- **opencode-claude-code-provider:** robust type coercion for stringified tool arguments ([3879a88](https://github.com/seonggukchoi/packages.js/commit/3879a88d96e24dbd2552555f247ce104d8fc7b3e))

## [0.2.9](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.8...@seonggukchoi/opencode-claude-code-provider@0.2.9) (2026-03-28)

### Bug Fixes

- **opencode-claude-code-provider:** deep-parse stringified JSON values in tool arguments ([f691ca9](https://github.com/seonggukchoi/packages.js/commit/f691ca998239a6be447963680ee902a3f8fff52c))

## [0.2.8](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.7...@seonggukchoi/opencode-claude-code-provider@0.2.8) (2026-03-27)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

## [0.2.7](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.6...@seonggukchoi/opencode-claude-code-provider@0.2.7) (2026-03-27)

### Bug Fixes

- **opencode-claude-code-provider:** handle native tool-use streams ([e050dd7](https://github.com/seonggukchoi/packages.js/commit/e050dd75f7f37f42aac3b6d785f16c3f70912a54))

## [0.2.6](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.5...@seonggukchoi/opencode-claude-code-provider@0.2.6) (2026-03-27)

### Bug Fixes

- **opencode-claude-code-provider:** fix provider test typings ([fcd7dbb](https://github.com/seonggukchoi/packages.js/commit/fcd7dbb2624165b576295d8f41634cd02425d68f))
- **opencode-claude-code-provider:** send prompts over stdin ([1d983ff](https://github.com/seonggukchoi/packages.js/commit/1d983ff212ecd4c3d47be7113c4eec77cf6a06b3))

## [0.2.5](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.4...@seonggukchoi/opencode-claude-code-provider@0.2.5) (2026-03-27)

### Bug Fixes

- **opencode-claude-code-provider:** preserve context token totals ([7d280f3](https://github.com/seonggukchoi/packages.js/commit/7d280f3505221e8de6725970d3e7a6d5776ed9f3))
- **opencode-claude-code-provider:** restore streamed text around tool calls ([be1e8be](https://github.com/seonggukchoi/packages.js/commit/be1e8be2900be56a89978f7c6f75808578b7790b))

## [0.2.4](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.3...@seonggukchoi/opencode-claude-code-provider@0.2.4) (2026-03-27)

### Bug Fixes

- **opencode-claude-code-provider:** stream text before buffering tool calls ([d205168](https://github.com/seonggukchoi/packages.js/commit/d205168abed6d6ff0e57b6767cc0132bcaf4de2c))

## [0.2.3](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.2...@seonggukchoi/opencode-claude-code-provider@0.2.3) (2026-03-27)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

## [0.2.2](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.1...@seonggukchoi/opencode-claude-code-provider@0.2.2) (2026-03-27)

### Bug Fixes

- **opencode-claude-code-provider:** stream parts immediately instead of buffering until process exit ([a92d7a0](https://github.com/seonggukchoi/packages.js/commit/a92d7a0fbd9153e50e4754088ccdb4b70bf30940))

## [0.2.1](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.2.0...@seonggukchoi/opencode-claude-code-provider@0.2.1) (2026-03-27)

**Note:** Version bump only for package @seonggukchoi/opencode-claude-code-provider

# [0.2.0](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.13...@seonggukchoi/opencode-claude-code-provider@0.2.0) (2026-03-26)

### Features

- **opencode-claude-code-provider:** add opencode-only tool preference to bypass native tools ([f1db42c](https://github.com/seonggukchoi/packages.js/commit/f1db42ca35bc6ab53ec03ead4a314b56933cc077))

## [0.1.13](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.12...@seonggukchoi/opencode-claude-code-provider@0.1.13) (2026-03-26)

### Bug Fixes

- **opencode-claude-code-provider:** avoid claude cli runtime exits ([ac9fa38](https://github.com/seonggukchoi/packages.js/commit/ac9fa385cbf5241a2a028f79c13f09b6cd1926fe))
- **opencode-claude-code-provider:** normalize native tool session flow ([3a52102](https://github.com/seonggukchoi/packages.js/commit/3a52102e2647f46a589cca8ea24df68941f14690))

## [0.1.12](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.11...@seonggukchoi/opencode-claude-code-provider@0.1.12) (2026-03-25)

### Bug Fixes

- **opencode-claude-code-provider:** stop provider-executed tool turns ([5f52b4c](https://github.com/seonggukchoi/packages.js/commit/5f52b4cc7e2994e338c61ba933b5932a6f39040d))

## [0.1.11](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.10...@seonggukchoi/opencode-claude-code-provider@0.1.11) (2026-03-25)

### Bug Fixes

- **opencode-claude-code-provider:** move bridge warnings to stream-start ([374009a](https://github.com/seonggukchoi/packages.js/commit/374009a5e79fa6840e46e6989bb406a8ac4986c8))

## [0.1.10](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.9...@seonggukchoi/opencode-claude-code-provider@0.1.10) (2026-03-25)

### Bug Fixes

- **packages:** prefer opencode tool routing for claude code ([1fd49ab](https://github.com/seonggukchoi/packages.js/commit/1fd49ab1fc3adf8332b47c824aa4574694231e12))

## [0.1.9](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.8...@seonggukchoi/opencode-claude-code-provider@0.1.9) (2026-03-25)

### Bug Fixes

- **opencode-claude-code-provider:** defer early tool results ([025d427](https://github.com/seonggukchoi/packages.js/commit/025d42702b1554ebe63d8ca425723220516fce4a))

## [0.1.8](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.7...@seonggukchoi/opencode-claude-code-provider@0.1.8) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** normalize native tool names ([bad0622](https://github.com/seonggukchoi/packages.js/commit/bad06229ecbc8fa3d038320994d090414aae57b8))

## [0.1.7](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.6...@seonggukchoi/opencode-claude-code-provider@0.1.7) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** support string-compatible tool inputs ([3c21a04](https://github.com/seonggukchoi/packages.js/commit/3c21a04daef733e89b1f6bd04a6ec45a2bb5ef6b))

## [0.1.6](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.5...@seonggukchoi/opencode-claude-code-provider@0.1.6) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** normalize tool call inputs for opencode ([7aba2cc](https://github.com/seonggukchoi/packages.js/commit/7aba2cc34fcebedcc3d672a0e133155861560b12))

## [0.1.5](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.4...@seonggukchoi/opencode-claude-code-provider@0.1.5) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** normalize server tool results ([da69899](https://github.com/seonggukchoi/packages.js/commit/da69899e6b1b4b4802fb36ed6fa0e052c7275a11))

## [0.1.4](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.3...@seonggukchoi/opencode-claude-code-provider@0.1.4) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** restore claude session and server tool state ([262d67b](https://github.com/seonggukchoi/packages.js/commit/262d67b5e0f2e7013f5ec798d3570e23f6f2516d))

## [0.1.3](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.2...@seonggukchoi/opencode-claude-code-provider@0.1.3) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** stream claude thinking deltas ([8164420](https://github.com/seonggukchoi/packages.js/commit/81644207dcc6176139374313fc129defe7fcc0d0))

## [0.1.2](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.1...@seonggukchoi/opencode-claude-code-provider@0.1.2) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** restore runtime coverage and defaults ([97000bb](https://github.com/seonggukchoi/packages.js/commit/97000bb78c35a3ef0a149203c9185aceb22e4f61))

## [0.1.1](https://github.com/seonggukchoi/packages.js/compare/@seonggukchoi/opencode-claude-code-provider@0.1.0...@seonggukchoi/opencode-claude-code-provider@0.1.1) (2026-03-24)

### Bug Fixes

- **opencode-claude-code-provider:** preserve claude runtime environment ([4cb3262](https://github.com/seonggukchoi/packages.js/commit/4cb32620c859975a06460faa78b35e0bce5a8e24))

# 0.1.0 (2026-03-24)

### Features

- add packages to use Claude Code CLI with OpenCode ([714a1bb](https://github.com/seonggukchoi/packages.js/commit/714a1bbba631a743b45e99073c73a44b55deae59))

# Changelog

## 0.0.0

- Initialize the Claude Code provider package.
