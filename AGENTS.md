# AGENTS.md

## Language Policy

All written content in this repository **must** be in **English**, including:

- Commit messages
- Code comments
- Documentation and README files
- Pull request titles and descriptions
- Issue titles and descriptions
- Inline TODOs and FIXMEs
- CHANGELOG entries

> Reason: This is a public npm package repository. English ensures accessibility for all contributors and consumers.

## Project Structure

This is a **monorepo** with independent versioning per package.

```
packages/   # Published npm packages
templates/  # Project templates (not published)
```

- Each package is independently versioned and published.
- Refer to `pnpm-workspace.yaml` for workspace configuration.

## Commit Conventions

This project enforces **Conventional Commits** via commitlint. The commit message is validated by a git hook on every commit.

### Format

```
<type>(<scope>): <description>
```

- **type**: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`, `perf`, `style`, `build`, `revert`, etc.
- **scope**: **Required**. Must match one of the allowed scopes defined in `.commitlintrc`.
- **description**: Imperative mood, lowercase, no period at the end.

```
# Good
feat(datee): add timezone conversion support
fix(regex): handle unicode escape sequences
chore(packages): update dependencies

# Bad - these will be rejected
update code            # missing type, scope, and proper description
fix: handle error      # missing scope
feat(datee): Add date. # uppercase start, period at end
```

### Rules

- Scope is **mandatory** (severity level 2 = error). A commit without a scope **will be rejected**.
- When adding a new package, add its name to the `scope-enum` in `.commitlintrc`.
  > Reason: Without this, commitlint rejects all commits scoped to the new package.

## Branch Strategy

| Branch                  | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `main`                  | Production release branch. Merging triggers a stable release. |
| `beta`                  | Pre-release branch. Merging triggers a beta release.          |
| `feat/*`, `fix/*`, etc. | Feature/fix branches. Merged into `main` via pull request.    |

- **Never** push directly to `main` or `beta`. Always use pull requests.
  > Reason: Direct pushes bypass CI validation and trigger unintended releases.

## Pull Request Conventions

- PR titles **must** follow Semantic PR format: `<type>(<scope>): <description>` (same as Conventional Commits).
  - PR titles are validated by CI on open and edit.
  - Example: `feat(types): add generic utility types`
- The PR author is automatically assigned as the assignee.
- PRs with `wip` in the title skip reviewer assignment.

## Git Hooks

Two hooks run automatically on every commit:

1. **pre-commit**: Runs lint-staged, which auto-fixes linting issues on staged files.
2. **commit-msg**: Validates the commit message against Conventional Commits rules.

Do **not** skip these hooks (`--no-verify`) unless explicitly instructed.

> Reason: Skipping hooks allows malformed commits and unformatted code into the repository.

## Code Style

Code style is enforced by **ESLint** (flat config) and **Prettier**. Refer to `eslint.config.ts` and `.prettierrc` for the full rule set.

### Naming Conventions

| Target                | Convention                   | Example                       |
| --------------------- | ---------------------------- | ----------------------------- |
| Variables, parameters | `strictCamelCase`            | `userName`, `maxRetryCount`   |
| Types, classes        | `StrictPascalCase`           | `UserProfile`, `HttpClient`   |
| Constants             | `UPPER_CASE` or `PascalCase` | `MAX_RETRY`, `DefaultTimeout` |

### Import Ordering

Imports are ordered by group with newlines between each group, alphabetized within each group:

1. Node.js builtins
2. External packages
3. Internal (`@seonggukchoi/*`)
4. Parent / sibling / index
5. Type imports

### Other Rules

- **Unused imports**: Automatically removed by ESLint.
- **Class members**: Ordered by visibility and kind — fields > constructors > getters/setters > methods.
- **Curly braces**: Always required, even for single-line blocks.

  ```typescript
  // Bad
  if (condition) return;

  // Good
  if (condition) {
    return;
  }
  ```

## CI/CD Workflow

### On Pull Request

CI runs **only on affected packages** (those changed in the PR):

- Build verification
- Test execution
- Lint check

> Reason: Running all packages on every PR wastes CI time. Affected detection keeps feedback fast.

### On Merge to `main` / `beta`

- Automatic version bump based on commit types (Conventional Commits).
- Automatic npm publish.
- Automatic GitHub Release creation.
- `main` produces stable releases; `beta` produces pre-releases.

### Versioning

Each package is versioned **independently**. Version bumps are determined automatically from commit messages:

| Commit type       | Version bump |
| ----------------- | ------------ |
| `feat`            | minor        |
| `fix`             | patch        |
| `BREAKING CHANGE` | major        |

## Build System

- The monorepo uses a **task runner** for parallel execution and caching.
- Build tasks respect dependency order (`dependsOn: [^build]`).
- CI uses **affected** detection to only run tasks on changed packages.
- Build/test/lint results are cached locally to speed up repeated runs.
