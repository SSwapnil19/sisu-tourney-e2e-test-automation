import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export const environment = {
  configUiUrl: required("CONFIG_UI_URL", "http://localhost:3001"),
  userUiUrl: required("USER_UI_URL", "http://localhost:3002"),
  apiUrl: required("API_URL", "http://localhost:8080"),
  browser: required("BROWSER", "chromium"),
  headless: required("HEADLESS", "true").toLowerCase() !== "false",
  timeoutMs: positiveInteger("TEST_TIMEOUT_MS", 30_000),
  database: {
    host: required("DB_HOST", "127.0.0.1"),
    port: positiveInteger("DB_PORT", 3306),
    database: required("DB_NAME", "tourney"),
    user: required("DB_USER", "tourney"),
    password: required("DB_PASSWORD", "tourney"),
  },
} as const;

