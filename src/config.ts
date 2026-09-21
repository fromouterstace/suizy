import { z } from "zod";

const environment_schema = z.enum(["development", "test", "production"]);
const optional_label = z
  .string()
  .regex(/^[a-z][a-z0-9-]{2,62}$/u)
  .optional();
const web_url = z.url().refine((value) => {
  const url = URL.parse(value);
  return (
    url !== null &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "" &&
    (url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  );
});

const config_schema = z
  .object({
    app_env: environment_schema.default("development"),
    node_env: environment_schema.optional(),
    port: z
      .string()
      .regex(/^[0-9]{1,5}$/u)
      .transform(Number)
      .pipe(z.number().int().min(1).max(65535))
      .default(3000),
    resource_namespace: optional_label,
    public_base_url: web_url.optional(),
    database_env: environment_schema.optional(),
    database_url: z
      .url()
      .refine((value) => ["postgres:", "postgresql:"].includes(URL.parse(value)?.protocol ?? ""))
      .optional(),
    provider_grant_env: environment_schema.optional(),
    google_cloud_project_id: optional_label,
    google_oauth_redirect_uri: web_url.optional(),
    fathom_webhook_url: web_url.optional(),
  })
  .superRefine((config, context) => {
    const invalid = (field: string): void => {
      context.addIssue({ code: "custom", path: [field], message: "Invalid configuration" });
    };
    if (config.node_env !== undefined && config.node_env !== config.app_env) {
      invalid("node_env");
    }
    if (config.app_env === "production" && config.node_env !== "production") {
      invalid("node_env");
    }
    if (
      config.resource_namespace !== undefined &&
      config.resource_namespace !== `suizy-${config.app_env}`
    ) {
      invalid("resource_namespace");
    }
    if (config.app_env === "production" && config.public_base_url === undefined) {
      invalid("public_base_url");
    }
    if (config.public_base_url !== undefined) {
      const url = URL.parse(config.public_base_url);
      if (url === null) {
        invalid("public_base_url");
      } else {
        if (url.pathname !== "/") {
          invalid("public_base_url");
        }
      }
      if (
        config.app_env === "production" &&
        url !== null &&
        (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      ) {
        invalid("public_base_url");
      }
    }
    if (config.database_env !== undefined && config.database_env !== config.app_env) {
      invalid("database_env");
    }
    if (config.database_url !== undefined && config.database_env !== config.app_env) {
      invalid("database_env");
    }
    if (config.provider_grant_env !== undefined && config.provider_grant_env !== config.app_env) {
      invalid("provider_grant_env");
    }
    if (config.google_cloud_project_id !== undefined) {
      if (!config.google_cloud_project_id.startsWith(`suizy-${config.app_env}-`)) {
        invalid("google_cloud_project_id");
      }
      if (config.provider_grant_env !== config.app_env) {
        invalid("provider_grant_env");
      }
    }
    for (const [field, value, suffix] of [
      ["google_oauth_redirect_uri", config.google_oauth_redirect_uri, "oauth/google/callback"],
      ["fathom_webhook_url", config.fathom_webhook_url, "webhooks/fathom"],
    ] as const) {
      if (value !== undefined) {
        if (config.public_base_url === undefined) {
          invalid("public_base_url");
        } else {
          const url = URL.parse(value);
          if (
            url === null ||
            url.origin !== URL.parse(config.public_base_url)?.origin ||
            url.pathname !== `/${config.app_env}/${suffix}`
          ) {
            invalid(field);
          }
        }
        if (config.provider_grant_env !== config.app_env) {
          invalid("provider_grant_env");
        }
      }
    }
    if (
      config.app_env === "test" &&
      (config.database_url !== undefined ||
        config.google_cloud_project_id !== undefined ||
        config.google_oauth_redirect_uri !== undefined ||
        config.fathom_webhook_url !== undefined)
    ) {
      invalid("app_env");
    }
  });

export class ConfigurationError extends Error {
  constructor(fields: string[]) {
    super(
      `Invalid configuration: ${[...new Set(fields)].sort().join(", ")}. See docs/environment-policy.md.`,
    );
    this.name = "ConfigurationError";
  }
}

export function load_config(environment: Readonly<Record<string, string | undefined>>) {
  // Explicit allowlist: never pass the process environment or raw Zod errors to a logger.
  const result = config_schema.safeParse({
    app_env: environment.APP_ENV,
    node_env: environment.NODE_ENV,
    port: environment.PORT,
    resource_namespace: environment.RESOURCE_NAMESPACE,
    public_base_url: environment.PUBLIC_BASE_URL,
    database_env: environment.DATABASE_ENV,
    database_url: environment.DATABASE_URL,
    provider_grant_env: environment.PROVIDER_GRANT_ENV,
    google_cloud_project_id: environment.GOOGLE_CLOUD_PROJECT_ID,
    google_oauth_redirect_uri: environment.GOOGLE_OAUTH_REDIRECT_URI,
    fathom_webhook_url: environment.FATHOM_WEBHOOK_URL,
  });
  if (!result.success) {
    throw new ConfigurationError(
      result.error.issues.map((issue) => String(issue.path[0]).toUpperCase()),
    );
  }
  const { database_url: _database_url, ...config } = result.data;
  return Object.freeze({
    ...config,
    node_env: config.node_env ?? config.app_env,
    resource_namespace: config.resource_namespace ?? `suizy-${config.app_env}`,
    database_configured: _database_url !== undefined,
  });
}
