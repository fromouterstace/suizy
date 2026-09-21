# Configuration and environment boundaries

Phase 1.3 establishes a validated application-shell contract, not live integrations.
No database, webhook, OAuth client, grant, or provider registration is provisioned
by this change. No Google or Fathom API is called at startup or during tests.

## Startup contract

`src/config.ts` validates an explicit allowlist with Zod before Fastify is created.
Unknown platform variables are ignored. Explicit blank values are invalid, not
silently replaced with defaults. Failures report approved field names only,
never supplied values, raw Zod errors, credentials, or the process environment.

| Variable                    | Contract                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `APP_ENV`                   | `development` (default), `test`, or `production`                                                                   |
| `NODE_ENV`                  | Must match APP_ENV when supplied; production requires both explicitly                                              |
| `PORT`                      | Decimal integer 1–65535; default 3000; malformed/partial numbers rejected                                          |
| `RESOURCE_NAMESPACE`        | Exactly `suizy-<APP_ENV>`; derived if omitted                                                                      |
| `PUBLIC_BASE_URL`           | Origin-only URL, no credentials/query/fragment; HTTPS or local HTTP; required HTTPS and non-loopback in production |
| `DATABASE_ENV`              | Must match APP_ENV, required when DATABASE_URL is supplied                                                         |
| `DATABASE_URL`              | Optional secret PostgreSQL URI; never returned by the public config object or logged                               |
| `PROVIDER_GRANT_ENV`        | Must match APP_ENV, required for configured provider identifiers/callbacks                                         |
| `GOOGLE_CLOUD_PROJECT_ID`   | Optional lowercase label prefixed `suizy-<APP_ENV>-`                                                               |
| `GOOGLE_OAUTH_REDIRECT_URI` | Optional; same origin as PUBLIC_BASE_URL and exact path `/<APP_ENV>/oauth/google/callback`                         |
| `FATHOM_WEBHOOK_URL`        | Optional; same origin as PUBLIC_BASE_URL and exact path `/<APP_ENV>/webhooks/fathom`                               |

Callback paths are reserved contracts, **not implemented HTTP routes**. Do not
register them until the corresponding adapter, request verification, consent,
and replay checks are delivered. Production configuration does not imply that
Suizy is ready for production use.

## Isolation and provisioning policy

| Resource                      | Development                                          | Test                                                                | Production                                                                    |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Database                      | Dedicated development database and role              | No database in shell tests; later disposable test database and role | Separate database and least-privilege role, never shared with development     |
| Google project / OAuth client | Dedicated development project and client             | Synthetic fixtures, no grants                                       | Dedicated production project, OAuth client and consent approval               |
| OAuth redirects               | Development origin and `/development/` path          | No live redirect registration                                       | Production origin and `/production/` path, exact allowlist                    |
| Webhooks                      | Separate development registration and signing secret | Synthetic signed requests only                                      | Separate registration and signing secret; never reuse development destination |
| Provider grants               | Development-only principal/scopes and refresh tokens | No real credentials or outbound provider requests                   | Separately authorized principal/scopes and connector binding                  |

The environment labels are fail-closed configuration guards, not proof of actual
provider ownership. Before any adapter is enabled, verify its database principal,
provider account/project, webhook registration and grant against the intended
environment. Do not relabel a production resource as development. Never copy
production snapshots, transcripts, participant data or credentials into tests.
Test configuration rejects database URLs and live provider identifiers/callbacks.
Adapters must add runtime ownership checks and negative isolation tests in their
own delivery step. There is no feature flag in this change that enables providers.

## Secret inventory and storage

The shell requires **no secrets** in any environment. These names are reserved
for later adapters and must remain unset until needed:

- `DATABASE_URL`: future database connection; pair with DATABASE_ENV.
- `GOOGLE_OAUTH_CLIENT_ID`: non-secret, environment-specific OAuth client identifier.
- `GOOGLE_OAUTH_CLIENT_SECRET`: future OAuth adapter secret.
- Google access/refresh tokens: connector-managed or future encrypted token storage,
  not static environment variables or committed files.
- `FATHOM_API_KEY`: future Fathom provider credential.
- `FATHOM_WEBHOOK_SECRET`: future webhook verification secret, subject to the
  verified provider signature contract.

Keep production secrets only in Replit Secrets or connector-managed storage.
Do not put production secrets in shared development/test settings. Use separate
projects/environments and grants when a connector cannot isolate credentials.
Never log config objects or secret values. Future enabled adapters must validate
required secret presence and fail with field names only; do not add dummy secrets
merely to satisfy startup. Rotate/revoke credentials independently by environment.

## Local and test commands

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm check:security
pnpm start
```

Default startup needs no `.env` file. To explicitly use the placeholder-only
example, copy `.env.example` to ignored `.env`, leave deferred entries commented,
build, then run `node --env-file=.env dist/src/server.js`. The app does not
automatically load `.env` files. Do not use production credentials locally.

Production must explicitly set APP_ENV=production, NODE_ENV=production, and the
actual approved HTTPS PUBLIC_BASE_URL. No production URL is guessed or registered
by this change. PORT may be supplied by the hosting environment.

## Recovery and acceptance

Validation failures exit nonzero before opening a listener, with approved field
names only. Correct the deployment's environment settings; do not disable the
schema. Reverting the atomic config commit restores prior startup behavior; this
step performs no migrations or external writes. The previous startup did not
validate configuration, so rollback needs explicit risk review.

Tests cover defaults, all environments, invalid ports and URLs, mismatched
resource labels, synthetic-only test boundaries, redaction and actual process
startup/shutdown. These checks cannot certify ownership of resources that have
not yet been provisioned.
