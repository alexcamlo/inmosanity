# Plan 010: Prune unused deployment tooling and refresh Sanity dependencies

> **Executor instructions**: Treat audit output as evidence to triage, not a mandate for unsafe blanket resolutions. Remove only confirmed-unused direct packages and remain within current framework majors. Update the index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- package.json yarn.lock sanity.config.ts sanity.cli.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-add-verification-baseline.md`, `plans/002-patch-next-runtime.md`
- **Category**: security / migration
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The installed dependency graph reported 18 critical and 157 high advisories. Seventeen critical paths came from the unused Vercel 29 CLI dependency; one came from Sanity 5.7 import tooling. The app deploys on Vercel through platform integration and has no `vercel` import or package script, while Sanity CLI/Studio tooling is genuinely used and should be refreshed within major 5.

## Current state

- `package.json:71` declares `vercel: ^29.3.6`; `yarn.lock:14246-14248` resolves 29.4.0.
- Repository-wide search excluding manifest/lock/docs found no `vercel` usage. No package script invokes it.
- `package.json:62` declares `sanity: ^5.0.0`; `yarn.lock:12419-12421` resolves 5.7.0 even though a newer compatible v5 was available.
- `sanity.config.ts` configures the hosted Studio and `sanity.cli.ts` configures deploy/import, so Sanity tooling is reachable in authoring/deployment workflows.
- `eslint` is currently a production dependency at `package.json:51`, although it is only invoked by the lint script.
- Planning-time compatible versions observed: Sanity 5.31.1, `@sanity/types`/`@sanity/vision` 5.31.1, `@sanity/client` 7.23.0, `next-sanity` 12.4.5. Re-check before execution; do not cross majors.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Baseline audit | `yarn audit --groups dependencies --level high` | capture counts/paths; may exit 30 |
| Usage check | `if rg -q "\\bvercel\\b" --glob '!package.json' --glob '!yarn.lock' --glob '!docs/**' --glob '!plans/**' .; then exit 1; else echo 'No Vercel CLI usage'; fi` | prints `No Vercel CLI usage` |
| Full gates | `yarn verify && yarn build` | exit 0 |
| Studio schema | `yarn sanity schema validate` | exit 0, `0 errors`, `0 warnings`, no deployment |

## Scope

**In scope**:
- `package.json`
- `yarn.lock`
- `sanity.config.ts` or `sanity.cli.ts` only for documented compatible v5 API adjustments

**Out of scope**:
- Sanity 6, next-sanity 13, Next/React major upgrades
- Deploying Studio or app
- Forced transitive `resolutions` to silence audit
- Removing Sanity packages based only on missing text imports
- Broad cleanup of every possibly-unused dependency
- Reading or committing `.env.local`

## Git workflow

- Branch: `advisor/010-prune-vulnerable-tooling`
- Commit: `chore: refresh deployment tooling dependencies`
- Do not push or deploy unless instructed.

## Steps

### Step 1: Capture and classify the baseline

Run the audit in JSON form and summarize unique critical/high paths by direct dependency. Save no secret/environment output. Confirm Vercel remains unused in scripts/source and Sanity remains used.

**Verify**: a written terminal summary distinguishes public runtime (`next` handled by Plan 002), used authoring/build tooling (`sanity`), and unused CLI (`vercel`).

### Step 2: Remove unused Vercel CLI and classify lint tooling

Use `yarn remove vercel`. Move `eslint` from dependencies to devDependencies without changing its major. Do not manually edit the lockfile.

If deployment documentation or CI added after planning invokes local `vercel`, STOP and report instead of removing it.

**Verify**:

```bash
node -e "const p=require('./package.json'); if(p.dependencies.vercel || p.devDependencies.vercel) process.exit(1); console.log('direct vercel dependency removed')"
if rg -q '^vercel@' yarn.lock; then
  echo 'Top-level Vercel lock entry remains'
  exit 1
fi
echo 'Vercel lock entry removed'
```

Expected: both success lines print and the block exits 0. A differently named transitive `@vercel/*` package is not the direct `vercel` CLI and should be judged by the later audit, not this manifest check.

### Step 3: Refresh compatible Sanity packages

Update used Sanity packages within their current majors, keeping the ecosystem aligned. At minimum evaluate `sanity`, `@sanity/types`, `@sanity/vision`, `@sanity/client`, and `next-sanity`. Use the latest mutually compatible versions in major 5/7/12 respectively. Do not update to Sanity 6 or next-sanity 13.

Let Yarn regenerate the lockfile. Do not add legacy-peer-dependency flags or forced resolutions.

**Verify**: `yarn list --depth=0 | rg 'sanity|@sanity/(client|types|vision)'` → one expected compatible version per direct package.

### Step 4: Validate app and Studio configuration

Run the exact non-deploying schema validation command verified at the planning commit:

```bash
yarn verify
yarn build
yarn sanity schema validate
```

Expected: all commands exit 0; schema validation prints `0 errors` and `0 warnings`. Do not substitute `sanity deploy`, `schema deploy`, `dataset`, `documents`, or any other mutating command. If `schema validate` was removed by the compatible update, STOP and report rather than selecting a command from help.

### Step 5: Re-audit and document residuals

Capture a completed JSON audit and fail on any critical advisory rooted at direct `vercel`, `next`, or `sanity`:

```bash
audit_file=$(mktemp)
set +e
yarn audit --groups dependencies --json > "$audit_file"
audit_status=$?
set -e
test "$audit_status" -eq 0 -o "$audit_status" -eq 30
rg -q '"type":"auditSummary"' "$audit_file"
node - "$audit_file" <<'NODE'
const fs = require('node:fs')
const file = process.argv[2]
const blockedRoots = new Set(['vercel', 'next', 'sanity'])
const blocked = []
for (const line of fs.readFileSync(file, 'utf8').trim().split(/\n/)) {
  const event = JSON.parse(line)
  if (event.type !== 'auditAdvisory') continue
  const advisory = event.data.advisory
  const root = (event.data.resolution?.path || '').split('>')[0]
  if (advisory.severity === 'critical' && blockedRoots.has(root)) {
    blocked.push(`${root} > ${advisory.module_name}: ${advisory.title}`)
  }
}
if (blocked.length) {
  console.error(blocked.join('\n'))
  process.exit(1)
}
console.log('No critical Next, Sanity, or Vercel advisory')
NODE
trash "$audit_file"
```

Expected: audit completion is proved by `auditSummary`, the Node check prints `No critical Next, Sanity, or Vercel advisory`, and the block exits 0. Also confirm Vercel-rooted high paths are gone. High findings in genuinely unreachable optional tooling may remain; record exact package paths and why they are accepted rather than suppressing them. If a used Sanity critical remains with no compatible in-major fix, STOP and report.

## Test plan

No new source test is required. Run all verification, build, and read-only Studio configuration gates. Inspect the package/lock diff for unrelated dependency churn and confirm no deployment occurs.

## Done criteria

- [ ] Unused direct `vercel` package is removed.
- [ ] `eslint` is a dev dependency.
- [ ] Used Sanity packages are refreshed within compatible majors.
- [ ] Vercel-rooted advisory paths are absent.
- [ ] No critical advisory remains on reachable Next/Sanity paths, or execution is BLOCKED with exact path/reason.
- [ ] `yarn verify`, `yarn build`, and Studio config validation pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- Local Vercel CLI is now part of a tracked deploy workflow.
- Fixing a remaining critical requires a major migration or forced resolution.
- Sanity update requires schema/data migration.
- Peer dependency resolution requires bypass flags.
- A command would deploy or mutate hosted content.

## Maintenance notes

Run dependency audits periodically, but prioritize reachable runtime/build paths over raw counts. Keep CLIs in devDependencies unless production execution truly requires them. Renovate configuration should be reviewed separately if it does not keep current majors fresh.
