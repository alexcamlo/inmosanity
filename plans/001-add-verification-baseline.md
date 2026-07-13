# Plan 001: Add one-command, type-checked CI verification

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving on. If a STOP condition occurs, stop and report; do not improvise. When done, update this plan's row in `plans/README.md` unless a reviewer says they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- package.json yarn.lock tsconfig.json tsconfig.tests.json .github/workflows/ci.yml README.md docs/ARCHITECTURE.md`
> If an in-scope file changed, compare the excerpts below with live code. A material mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The repository has nine passing test scripts, but no `test` or aggregate verification command. Tests are explicitly excluded from TypeScript checking, and no tracked CI workflow runs the available gates. A single deterministic command and CI workflow are prerequisites for safely updating framework and tooling dependencies.

## Current state

- `package.json:3-10` defines `build`, `lint`, and `type-check`, but no test or verify script:

```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "format": "yarn prettier --write . --ignore-path .gitignore",
  "lint": "eslint .",
  "lint:fix": "yarn run format && yarn run lint --fix",
  "start": "next start",
  "type-check": "tsc --noEmit"
}
```

- `tsconfig.json:38` contains `"exclude": ["node_modules", "tests"]`.
- Tests are plain top-level Node scripts, not Jest/Vitest tests. Use `tests/property-search.test.ts` as the structural pattern: Node `assert`, explicit log lines, and execution through `tsx`.
- The README's canonical commands are `node_modules/.bin/tsx tests/<name>.test.ts`, `yarn type-check`, `yarn lint`, and `yarn build`.
- `.env.local` is ignored and must not be read, copied, or committed. CI must use repository variables/secrets for required build-time environment values; never hardcode values.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `yarn install --frozen-lockfile` | exit 0 |
| Existing tests | `for test in tests/*.test.ts; do node_modules/.bin/tsx "$test" || exit 1; done` | all nine files pass |
| Typecheck app | `yarn type-check` | exit 0 |
| Lint | `yarn lint` | exit 0 |
| Build | `yarn build` | exit 0 |

## Scope

**In scope**:
- `package.json`
- `yarn.lock`
- `tsconfig.tests.json` (create)
- `.github/workflows/ci.yml` (create)
- `README.md`
- `docs/ARCHITECTURE.md`

**Out of scope**:
- Rewriting tests into Jest, Vitest, or `node:test`
- Changing application behavior
- Adding browser/E2E tests
- Committing environment values
- Formatting unrelated files

## Git workflow

- Branch from `main`: `advisor/001-verification-baseline`
- Use an imperative conventional commit, e.g. `test: add verification baseline`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Make test tooling explicit

Add `tsx` and `@types/node` as dev dependencies using Yarn. Do not rely on transitive copies from Sanity tooling.

**Verify**: `yarn why tsx && yarn why @types/node` → each package has a direct dev-dependency reason.

### Step 2: Add deterministic scripts

Add scripts with these responsibilities:

- `test`: execute every sorted `tests/*.test.ts` file and fail immediately on the first non-zero exit.
- `type-check:tests`: run `tsc --noEmit -p tsconfig.tests.json`.
- `verify`: run `test`, app type-check, test type-check, and lint in that order.

A POSIX loop is acceptable because supported development and CI environments are macOS/Linux. Do not make `verify` run Prettier because the existing `format` command writes files.

**Verify**: `yarn test` → all nine current tests pass and exit 0.

### Step 3: Type-check tests separately

Create `tsconfig.tests.json` extending the root config. Override `types` to include Node, set `noEmit: true`, set `moduleDetection: "force"` so each existing CommonJS-style test file has its own scope, include only `tests/**/*.ts`, and exclude `node_modules`/`.next`. TypeScript will still follow any future static imports automatically; production `lib/` remains covered by the app typecheck. Keep application `tsconfig.json` unchanged so production compilation scope does not drift.

If existing tests reveal type errors, fix only test typing defects required by the new configuration. That would widen scope beyond this file list, so STOP and report the exact errors before editing tests.

**Verify**: `yarn type-check:tests` → exit 0 with no diagnostics.

### Step 4: Add CI

Create `.github/workflows/ci.yml` for pull requests and pushes to `main` with one always-on `verify` job:

- `actions/checkout@v4`
- `actions/setup-node@v4` with Node `22.x` and Yarn dependency caching
- `yarn install --frozen-lockfile`
- `yarn verify`

Add a separate `build` job that depends on `verify` and is conditional on both repository variables being non-empty: `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`. Pass those two values only through `${{ vars.NEXT_PUBLIC_SANITY_PROJECT_ID }}` and `${{ vars.NEXT_PUBLIC_SANITY_DATASET }}`. The conditional job runs `yarn build`. Never hardcode either value and do not reference `SANITY_API_READ_TOKEN` or the webhook secret.

Verify the workflow structurally and execute the same commands locally:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml"); puts "YAML OK"'
rg -n 'node-version:.*22|yarn install --frozen-lockfile|yarn verify|NEXT_PUBLIC_SANITY_PROJECT_ID|NEXT_PUBLIC_SANITY_DATASET|yarn build' .github/workflows/ci.yml
yarn install --frozen-lockfile && yarn verify
```

Expected: YAML prints `YAML OK`; every required workflow token is present; local install/verification exit 0. The first pushed PR must also show a successful `verify` job; the `build` job may be skipped until maintainers configure both named repository variables.

### Step 5: Update command documentation

Replace the nine-command test list in `README.md` and `docs/ARCHITECTURE.md` with `yarn test`, while retaining a note that one test can be run with `node_modules/.bin/tsx <path>`. Document `yarn verify` and test type-checking.

**Verify**: `rg -n 'yarn test|yarn verify|type-check:tests' README.md docs/ARCHITECTURE.md` → both documents describe the new commands.

## Test plan

- Run the new aggregate test script and confirm all existing test files execute.
- Run the dedicated test TypeScript configuration.
- Run `yarn verify` twice to ensure deterministic behavior.
- Do not add application tests in this plan.

## Done criteria

- [ ] `yarn test` exits 0 and executes all nine test files.
- [ ] `yarn type-check:tests` exits 0.
- [ ] `yarn verify` exits 0.
- [ ] `yarn build` exits 0 in an environment with the existing required variables.
- [ ] CI YAML parses and runs `yarn verify`.
- [ ] `git diff --name-only` contains only in-scope files plus `plans/README.md`.
- [ ] The status row in `plans/README.md` is updated.

## STOP conditions

- Test type-checking requires broad production type changes.
- CI requires committing an environment value.
- The project has switched package manager or test framework since `b0275ac`.
- Any verification command fails twice after one reasonable correction.

## Maintenance notes

Keep `test` as the canonical complete suite whenever a new `tests/*.test.ts` file is added. Reviewers should ensure CI does not silently skip tests or expose environment values. Browser tests remain a separate future decision.
