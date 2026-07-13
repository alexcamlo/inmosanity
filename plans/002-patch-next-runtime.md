# Plan 002: Patch Next.js to a secure 16.2 release

> **Executor instructions**: Execute every step and verification gate. Stop rather than crossing a major version or suppressing an audit/build failure. Update `plans/README.md` when complete unless a reviewer owns the index.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- package.json yarn.lock next.config.mjs proxy.ts`
> Compare live dependency versions with this plan before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: `plans/001-add-verification-baseline.md`
- **Category**: security / migration
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The public server is pinned to Next.js 16.1.6. On 2026-07-13, `yarn audit` reported eight high-severity advisories against that version, including Server Component denial-of-service and App Router Proxy bypass issues; the highest required patched version was 16.2.6. This app uses both Server Components and `proxy.ts`, so the affected surfaces are reachable.

## Current state

- `package.json:55` pins `next` to `16.1.6`.
- `package.json:79` pins `eslint-config-next` to `16.1.6`.
- `yarn.lock:10701-10703` resolves `next@16.1.6`.
- The latest compatible 16.2 patch observed during planning was `16.2.10`; do not cross to a future major without a new migration plan.
- `next.config.mjs` uses stable image and redirect configuration; `proxy.ts` uses the Next 16 Proxy convention.
- Exact repo gates are `yarn verify` after Plan 001 and `yarn build`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Inspect | `yarn outdated next eslint-config-next` | shows current and available versions |
| Upgrade | `yarn add next@16.2.10 && yarn add -D eslint-config-next@16.2.10` | exit 0 |
| Verify | `yarn verify` | exit 0 |
| Build | `yarn build` | exit 0 |
| Audit | `yarn audit --groups dependencies --level high` | no advisory whose module is `next` |

## Scope

**In scope**:
- `package.json`
- `yarn.lock`
- `next.config.mjs` only if a documented 16.2 compatibility correction is required
- `proxy.ts` only if a documented 16.2 type/API correction is required

**Out of scope**:
- Next 17 or React upgrades
- Refactoring locale redirect behavior (Plan 003)
- General dependency cleanup (Plan 010)
- Suppressing advisories with resolutions
- Unrelated formatting

## Git workflow

- Branch: `advisor/002-patch-next-runtime`
- Commit message: `chore: patch Next.js runtime`
- Do not push unless instructed.

## Steps

### Step 1: Confirm the patch target

Run `yarn outdated next eslint-config-next` and inspect current Next security guidance. Use `16.2.10` if still available and within the supported 16.2 line. If a newer 16.2 patch supersedes it, use the newest 16.2 patch and record the reason in the commit/PR; do not use a new major.

**Verify**: `node -e "const p=require('./package.json'); console.log(p.dependencies.next, p.devDependencies['eslint-config-next'])"` → both print the same `16.2.x` version, at least 16.2.6.

### Step 2: Update the lockfile through Yarn

Use Yarn commands, not manual lockfile editing. Keep Next and `eslint-config-next` aligned. Do not update unrelated direct dependencies in this plan.

**Verify**: `yarn list --pattern '^(next|eslint-config-next)$' --depth=0` → one aligned 16.2.x version for each.

### Step 3: Run regression gates

Run the complete local verification and production build. Read any migration error before changing configuration; only documented compatibility corrections belong here.

**Verify**: `yarn verify && yarn build` → exit 0.

### Step 4: Re-run focused audit

Capture the complete audit as JSON and prove the registry/audit command completed before accepting the absence of Next advisories. Yarn 1 exits `30` when advisories exist elsewhere, so both `0` and `30` are valid completed-audit statuses; any other status is failure.

**Verify**:

```bash
audit_file=$(mktemp)
set +e
yarn audit --groups dependencies --json > "$audit_file"
audit_status=$?
set -e
test "$audit_status" -eq 0 -o "$audit_status" -eq 30
rg -q '"type":"auditSummary"' "$audit_file"
if rg -q '"module_name":"next"' "$audit_file"; then
  echo 'Next advisories remain'
  trash "$audit_file"
  exit 1
fi
trash "$audit_file"
echo 'Completed audit contains no Next advisory'
```

Expected: final line prints `Completed audit contains no Next advisory` and the block exits 0. Registry failure, malformed output, or a remaining Next advisory must fail the gate. The broader audit may still report Sanity/Vercel findings owned by Plan 010.

## Test plan

- Existing pure tests through `yarn test`.
- TypeScript and ESLint through `yarn verify`.
- Production route generation through `yarn build`; expected routes include `/[lang]`, `/[lang]/propiedades`, `/[lang]/propiedad/[slug]`, `/api/revalidate`, and Proxy.
- No new test is required unless a compatibility code change is necessary; if one is needed, add the smallest regression test next to the affected concern.

## Done criteria

- [ ] Next and `eslint-config-next` are aligned on a patched 16.2.x release.
- [ ] No Next advisory remains in focused audit output.
- [ ] `yarn verify` passes.
- [ ] `yarn build` passes.
- [ ] No dependency outside Next's transitive graph was intentionally upgraded.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- The available fix requires Next 17 or a React major upgrade.
- The patch changes Proxy or caching semantics beyond a documented compatibility fix.
- A build failure requires disabling type checks, lint, or security behavior.
- Focused Next advisories remain after the selected patch.

## Maintenance notes

Next and `eslint-config-next` should remain version-aligned. Review the lockfile for unexpected unrelated churn. Plan 010 handles the separate CLI/tooling advisory backlog.
