# Suizy Code Quality Audit and Enforcement Protocol

**Audit date:** 2026-09-20

**Scope:** `guidelines-initial.md`, `github-hygiene.md`, the frozen vertical slice, and the Phase 1.1 repository foundation

**Purpose:** Identify quality requirements that existed only as prose, close the enforceable gaps before repository policy and CI are established in Phase 1.2, and record intentional deferrals.

## Executive Result

The canon already required strict naming, deterministic tests, type checking, linting, formatting, dependency review, security scanning, focused smoke tests, and clean atomic commits. Before this change, only TypeScript type checking, one smoke test, build verification, and a lockfile were executable.

The repository had no:

- linter;
- formatter;
- warning budget;
- executable filename-canon check;
- explicit smoke command;
- dependency-audit command;
- documented local/CI quality-gate order;
- compatibility check between TypeScript and the selected lint ecosystem.

This change closes those gaps with ESLint, typescript-eslint, Prettier, a canonical test-filename checker, explicit check scripts, and a documented gate protocol.

Zod is intentionally deferred to roadmap Step 1.3. The canon assigns Zod to configuration and runtime-boundary validation. Adding it before a real schema exists would create an unused dependency and would not enforce a meaningful invariant.

## Findings and Resolutions

| Finding | Risk | Resolution | Status |
|---|---|---|---|
| Naming rules existed only in prose | Backend camelCase or inconsistent type names could enter unnoticed | ESLint enforces backend `snake_case` variable-like identifiers and PascalCase types | Closed |
| No lint engine | Unsafe promise, type, import, equality, and control-flow patterns could pass review | ESLint strict type-checked and stylistic type-checked configurations | Closed |
| No warning policy | Warnings could accumulate and be ignored | `eslint --max-warnings 0` | Closed |
| No formatter | Review churn and inconsistent output | Prettier with a committed configuration and check/fix scripts | Closed |
| Canonical test filename was manual | Generic or noncanonical tests could bypass naming policy | Recursive filename checker runs before smoke tests | Closed |
| Smoke test was hidden under generic `test` | CI/review could not name the focused foundation check | Explicit `pnpm smoke`; `pnpm test` validates names then runs smoke | Closed |
| Quality gate omitted lint/format | The deterministic `check` script did not satisfy the canon | `pnpm check` runs format, lint, typecheck, tests, and build in a fixed order | Closed |
| Dependency security command absent | Audit behavior depended on an agent/tool rather than repository protocol | `pnpm check:security` runs the high-severity dependency gate | Closed |
| TypeScript 7 exceeded typescript-eslint's supported peer range | Typed lint results would be unsupported and potentially unreliable | Pin TypeScript 6.0.3, which is inside typescript-eslint 8.70.0's declared range | Closed |
| Coverage threshold undefined | A premature percentage would reward trivial tests in a nearly empty app | Define purpose-driven coverage later when domain code exists | Deferred with gate below |
| Runtime configuration has no schema | Invalid environment values can reach startup | Add Zod schema and safe failure tests in Step 1.3 | Deferred to roadmap |
| No CI workflow | Local quality gates are not remotely enforced | Wire the same commands into required GitHub checks in Step 1.2 | Deferred to next step |
| No automated secret scanner in repository scripts | Regex-only checks are incomplete | Enable GitHub secret scanning/push protection and add approved CI scanner in Step 1.2 | Deferred to next step |

## Required Toolchain

All versions are exact in `package.json` and resolved by `pnpm-lock.yaml`.

- TypeScript for strict compile-time checks.
- ESLint for semantic and typed lint rules.
- typescript-eslint for TypeScript parsing and type-aware rules.
- Prettier for deterministic formatting.
- Node's test runner through `tsx` for TypeScript tests.
- pnpm audit for the repository-owned dependency vulnerability gate.

Do not add overlapping formatters or linters without replacing, rather than duplicating, an existing responsibility.

## Canonical Commands

| Command | Purpose | Network-dependent |
|---|---|---|
| `pnpm format:check` | Verify deterministic formatting | No |
| `pnpm lint` | Run typed linting with zero warnings | No |
| `pnpm typecheck` | Run strict TypeScript analysis without emitting | No |
| `pnpm check:test-filenames` | Enforce canonical test filenames | No |
| `pnpm smoke` | Run the focused application-factory smoke test | No |
| `pnpm test` | Validate test names and run the current focused suite | No |
| `pnpm build` | Produce the deployable TypeScript output | No |
| `pnpm check` | Run format, lint, typecheck, tests, and build in order | No |
| `pnpm check:security` | Fail on high or critical dependency advisories | Yes |

`pnpm check` is deterministic and must remain runnable without provider credentials or network access after dependencies are installed.

## Gate Protocol

### Local change gate

Before committing:

1. run `pnpm format:check`;
2. run `pnpm lint`;
3. run `pnpm typecheck`;
4. run the narrowest affected test directly;
5. run `pnpm test`;
6. run `pnpm build`;
7. review the complete staged diff;
8. run the staged secret/sensitive-data check.

`pnpm check` performs steps 1 through 6 for the current repository.

### Dependency-change gate

When `package.json` or `pnpm-lock.yaml` changes:

1. install with `pnpm install --frozen-lockfile --ignore-scripts` from a clean dependency directory;
2. inspect direct and transitive changes;
3. run `pnpm check`;
4. run `pnpm check:security`;
5. run Replit dependency, SAST, and privacy/dataflow scans;
6. confirm no unexpected lifecycle scripts, registries, Git dependencies, or unpinned tarballs were introduced.

### CI gate for Phase 1.2

CI must:

1. use the declared Node and pnpm versions;
2. install with the frozen lockfile and disabled dependency scripts;
3. run `pnpm check`;
4. run `pnpm check:security`;
5. run secret scanning using an approved scanner;
6. use minimum workflow permissions;
7. retain no logs or artifacts containing provider data;
8. become a required status check before protected-branch merge.

CI must invoke repository scripts rather than reimplementing their commands in workflow YAML.

## ESLint Policy

The base policy uses:

- ESLint recommended rules;
- typescript-eslint strict type-checked rules;
- typescript-eslint stylistic type-checked rules;
- type-only import consistency;
- no type-only import side effects;
- no unnecessary conditions;
- required braces;
- strict equality;
- no console output;
- backend `snake_case` variable-like identifiers;
- PascalCase types.

Framework or external-provider fields may retain external spelling only at a documented boundary. Do not disable naming rules across a whole file to accommodate one external field.

Lint suppressions must:

- name the exact rule;
- cover the smallest possible expression or line;
- include a reason when the need is not obvious;
- never suppress authentication, authorization, validation, promise-handling, or unsafe-type findings merely to make CI pass.

## Formatting Policy

Prettier is authoritative for whitespace and layout in code and supported configuration files.

- Use `pnpm format` to change formatting.
- Use `pnpm format:check` in gates.
- Do not mix manual style rewrites with behavior changes.
- Markdown planning documents are excluded from automatic whole-repository formatting to avoid unrelated prose churn.

## Test Protocol

- Test filenames must match the canonical lowercase kebab-case form with a concrete module and purpose: `module-testpurpose-test.ts` or `.tsx`.
- Every bug fix requires a regression test that fails before the fix.
- Security controls require negative tests.
- Tests must be deterministic and must not call live providers.
- Tests must not require production credentials.
- Tests use synthetic data only.
- A focused smoke test proves that the Fastify application factory reaches ready state and closes without opening a public listener.
- Route, database, and provider work must add focused tests in the same atomic change.

## Coverage Protocol

No global percentage is imposed while only the application shell exists.

A coverage threshold becomes mandatory before Phase 4 domain implementation. The threshold must:

- measure statements, branches, functions, and lines;
- exclude generated code and type-only files;
- never replace required negative/security scenarios;
- be ratcheted upward or held, not silently reduced;
- record any narrow exclusion with an owner and reason.

Until then, acceptance is scenario-based: each roadmap step must enumerate and pass its focused positive, negative, failure, replay, and authorization cases as applicable.

## Zod Decision

Zod makes sense when Suizy first accepts configuration or untrusted runtime data.

Add Zod in Step 1.3 to validate:

- port and environment name;
- non-secret configuration;
- required secret presence without printing values;
- environment-specific provider identifiers;
- bounded numeric and URL settings.

Provider payload schemas belong at their adapter boundaries. Domain services must receive normalized validated values, not raw provider objects.

Do not add Zod solely to restate static TypeScript types or to parse values that do not yet exist.

## Measures

Each completed implementation step reports:

- formatter result;
- lint errors and warnings, both required to be zero;
- type-check result;
- focused tests run and pass/fail counts;
- build result;
- dependency audit counts by severity when dependencies change;
- SAST and privacy/dataflow finding counts;
- staged secret-scan result;
- known deferrals with their roadmap owner.

Flaky tests, skipped checks, warning-budget increases, disabled rules, reduced coverage, or audit exceptions are not silent. They require an owner, reason, compensating control, and expiration or follow-up step.

## Acceptance

This protocol is complete when:

- a frozen install succeeds;
- `pnpm check` succeeds;
- `pnpm check:security` reports no high or critical vulnerabilities;
- the canonical filename checker accepts the smoke test and rejects a malformed test filename in a controlled negative check;
- Replit dependency, SAST, and privacy/dataflow scans report no unresolved findings;
- the staged diff contains no secret-like or generated sensitive data;
- Phase 1.2 uses these commands as required repository checks.