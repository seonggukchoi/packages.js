# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0](https://github.com/seonggukchoi/packages.js/compare/%40seonggukchoi%2Ftoolkit%401.4.1...%40seonggukchoi%2Ftoolkit%402.0.0) (2026-08-07)

### Features

- **toolkit:** draw the value passed to random --max ([8dc4415](https://github.com/seonggukchoi/packages.js/commit/8dc4415567b0d825ad71c6d4d898309114b87028)), closes [#89](https://github.com/seonggukchoi/packages.js/issues/89)

### BREAKING CHANGES

- **toolkit:** `random --number --max <value>` now includes `<value>` in the
  range it draws from. A caller relying on `--min 1 --max 10` yielding 1 through 9
  has to pass `--max 9` to keep that range.

## [1.4.1](https://github.com/seonggukchoi/packages.js/compare/%40seonggukchoi%2Ftoolkit%401.4.0...%40seonggukchoi%2Ftoolkit%401.4.1) (2026-08-06)

### Bug Fixes

- **toolkit:** report a non-zero exit code when a command fails ([38de0d4](https://github.com/seonggukchoi/packages.js/commit/38de0d4db7973fcea96fa88735a03bb81eec15a6)), closes [#87](https://github.com/seonggukchoi/packages.js/issues/87)

# 1.4.0 (2026-08-06)

### Features

- **toolkit:** draw random numbers over an unbounded range ([498869f](https://github.com/seonggukchoi/packages.js/commit/498869f67dbee2e7f9ebbb790c8ec51f9033c4a9))
- **toolkit:** migrate the CLI from seonggukchoi/toolkit ([9101b83](https://github.com/seonggukchoi/packages.js/commit/9101b836ea302bda61b9610a4e5c25246be71c37))

# [1.3.0](https://github.com/seonggukchoi/toolkit/compare/v1.2.0...v1.3.0) (2023-10-22)

### Features

- add en/decoder for URL encoding ([60f3a02](https://github.com/seonggukchoi/toolkit/commit/60f3a0223414f2d32fcb95f3fd74af5ec998bc5a))

# [1.2.0](https://github.com/seonggukchoi/toolkit/compare/v1.1.0...v1.2.0) (2023-09-09)

### Features

- aggregate encode and decode command and rename the module ([86a2ee5](https://github.com/seonggukchoi/toolkit/commit/86a2ee57ca98333a5221711c42c989d7fbdcab99))

# [1.1.0](https://github.com/seonggukchoi/toolkit/compare/v1.0.0...v1.1.0) (2023-09-09)

### Features

- implement JWT en/decoding command ([c626b45](https://github.com/seonggukchoi/toolkit/commit/c626b45834ebdac3e7a3c5b2dd88e1ce3ae34a25))

# 1.0.0 (2023-09-09)

### Features

- implement first features ([8559fb4](https://github.com/seonggukchoi/toolkit/commit/8559fb45cffd0ae7d5bd2591424fc848dca61c52))
