import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().positive().optional().default(8787),
  // Public base URL used to build absolute share URLs (og:url, og:image, etc).
  // In production behind nginx/CF, you can leave this unset and rely on forwarded headers,
  // but setting it makes sharing more deterministic.
  SOGO_PUBLIC_BASE_URL: z.string().url().optional(),
  // Pro / entitlements (x402 paywall)
  ENTITLEMENT_JWT_SECRET: z.string().optional(),
  // Session cookie for wallet-auth (EVM signature). Required in production.
  SOGO_SESSION_JWT_SECRET: z.string().optional(),
  // Session max age (days). Used when issuing sogo_session cookie.
  SOGO_SESSION_MAX_AGE_DAYS: z.coerce.number().int().min(1).max(365).optional().default(30),
  // Local persistent store for BRIEF agent profiles + chat history.
  AGENTS_DATA_DIR: z.string().optional().default("./.data"),
  // Deployed BRIEF NFA contract address (optional, used as default agent binding).
  BRIEF_NFA_CONTRACT: z.string().optional(),
  // NFA chain id (56 mainnet / 97 testnet).
  BRIEF_NFA_CHAIN_ID: z.coerce.number().int().optional().default(56),
  // Optional dedicated RPC for NFA verification/interactions.
  BRIEF_NFA_RPC_URL: z.string().url().optional(),
  // Persistent data dir for sogo.db (SQLite). In production, prefer a stable volume like /opt/sogo.
  SOGO_DATA_DIR: z.string().optional().default("/opt/sogo"),
  // Development bypass for Pro paywall. MUST NOT be enabled in production.
  SOGO_PRO_BYPASS: z
    .preprocess((v) => (typeof v === "string" ? v.toLowerCase().trim() : v), z.any())
    .optional()
    .transform((v) => v === "true" || v === true)
    .default(false),
  // Temporary switch: treat all users as PRO (public access). Keep off in production unless intentionally opening PRO.
  SOGO_PRO_PUBLIC: z
    .preprocess((v) => (typeof v === "string" ? v.toLowerCase().trim() : v), z.any())
    .optional()
    .transform((v) => v === "true" || v === true)
    .default(false),
  // Per-IP per-minute limit for PRO start endpoints (used by limiter bucket "proStart").
  // Default is 60/min; lower it (e.g. 10) to reduce cost/pressure during public access.
  SOGO_PRO_START_RPM: z.coerce.number().int().min(1).max(600).optional().default(60),

  // Per-IP per-minute limits for heavy PRO modules.
  // These are used to make user-facing rate limiting more predictable:
  // fast single-run latency, but bounded number of starts per minute.
  SOGO_PRO_DEVTRACE_START_RPM: z.coerce.number().int().min(1).max(120).optional().default(12),
  SOGO_PRO_WHALES_START_RPM: z.coerce.number().int().min(1).max(120).optional().default(12),
  SOGO_PRO_REVERSE_START_RPM: z.coerce.number().int().min(1).max(120).optional().default(12),

  // Free tiers (kept low by default).
  SOGO_FREE_DEVTRACE_START_RPM: z.coerce.number().int().min(1).max(60).optional().default(2),
  SOGO_FREE_WHALES_START_RPM: z.coerce.number().int().min(1).max(60).optional().default(2),
  SOGO_FREE_REVERSE_START_RPM: z.coerce.number().int().min(1).max(60).optional().default(3),
  // Cloudflare Turnstile (optional). When set, start endpoints require a valid Turnstile token.
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // OpenRouter (LLM gateway) - server-side only
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().optional().default("https://openrouter.ai/api/v1"),
  // Default to fast Grok for speed/cost. Override as needed, e.g. "x-ai/grok-4".
  OPENROUTER_MODEL_ID: z.string().optional().default("x-ai/grok-4-fast"),
  OPENROUTER_HTTP_REFERER: z.string().optional(),
  OPENROUTER_X_TITLE: z.string().optional(),

  // CT Cleaner (x.ai Responses API) - server-side only
  // Kept compatible with hackathon naming: AI_API_KEY / AI_MODEL.
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional().default("grok-4-1-fast"),
  // Caching (ms)
  CT_CLEANER_CACHE_TTL_MS: z.coerce.number().int().positive().optional().default(30 * 60 * 1000),
  CT_CLEANER_SHARE_TTL_MS: z.coerce.number().int().positive().optional().default(60 * 60 * 1000),
  PRO_INSIGHT_CACHE_TTL_MS: z
    .coerce
    .number()
    .int()
    .min(1000)
    .max(24 * 60 * 60 * 1000)
    .optional()
    .default(30 * 60 * 1000),
  PRO_INSIGHT_MAX_TOKENS: z.coerce.number().int().min(200).max(4000).optional().default(900),
  // Dune is required only for the legacy "resolve" feature. Keep optional so DevTrace can run standalone.
  DUNE_API_KEY: z.string().optional(),
  // Optional: Team-context Dune API key. If provided, it takes precedence over DUNE_API_KEY.
  DUNE_TEAM_API_KEY: z.string().optional(),
  // Default to the query you created: https://dune.com/queries/6465261
  DUNE_QUERY_ID_SOL_RESOLVE: z.coerce.number().int().positive().optional().default(6465261),
  // Optional: token-constrained resolver query (Solana mint filter). Leave unset until you create/test the query.
  DUNE_QUERY_ID_SOL_RESOLVE_TOKEN: z.coerce.number().int().positive().optional(),
  // Optional: BSC (BNB Chain) resolver query id (prefix/suffix/limit). Create this query in Dune first.
  // Reference SQL: reference/sol-address-complete/dune-real-sql/bsc_resolver_param.sql
  DUNE_QUERY_ID_BSC_RESOLVE: z.coerce.number().int().positive().optional(),
  // Optional: token-constrained BSC resolver query (not used when Moralis token mode is enabled).
  DUNE_QUERY_ID_BSC_RESOLVE_TOKEN: z.coerce.number().int().positive().optional(),
  // Helius (used for token-scoped Solana resolution; supports Token-2022 like pump.fun).
  HELIUS_API_KEY: z.string().optional(),
  // Optional: some users keep a separate RPC-only key; EnhancedTx REST may require HELIUS_API_KEY.
  HELIUS_RPC_API_KEY: z.string().optional(),
  // Optional override, e.g. https://mainnet.helius-rpc.com/?api-key=...
  HELIUS_RPC_URL: z.string().url().optional(),
  // Helius pagination knobs for large mints (getProgramAccountsV2).
  HELIUS_GPA_V2_PAGE_LIMIT: z.coerce.number().int().min(1).max(10_000).optional().default(1000),
  // Hard timeout for token-mode scans (ms). Prevents runaway costs on very large mints.
  HELIUS_TOKEN_SCAN_TIMEOUT_MS: z
    .coerce
    .number()
    .int()
    .min(1000)
    .max(30 * 60 * 1000)
    .optional()
    .default(90_000),
  // Whether the configured Dune query accepts a `days` parameter for time-window pruning.
  // Keep false for the legacy query to avoid Dune parameter validation errors.
  DUNE_QUERY_SUPPORTS_DAYS: z
    .preprocess((v) => (typeof v === "string" ? v.toLowerCase().trim() : v), z.any())
    .optional()
    .transform((v) => v === "true" || v === true)
    .default(false),

  // Server-side safety knobs.
  RESOLVE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(30 * 60 * 1000)
    .optional()
    .default(120_000),
  RESOLVE_CACHE_TTL_MS: z.coerce.number().int().min(1000).max(24 * 60 * 60 * 1000).optional().default(30 * 60 * 1000),

  // Arkham (address intelligence / labels / transfers).
  // Env name in use: ARKM_API_KEY. We also accept ARKHAM_API_KEY as an alias.
  ARKM_API_KEY: z.string().optional(),
  ARKHAM_BASE: z.string().url().optional(),

  // Birdeye (price API; used by whales module for historical price)
  BIRDEYE_API_KEY: z.string().optional(),

  // BscScan / Etherscan v2 API for BNB Chain readable activity summaries.
  BSCSCAN_API_KEY: z.string().optional(),
  ETHERSCAN_API_KEY: z.string().optional(),
  ETHERSCAN_V2_API_KEY: z.string().optional(),
  BSCSCAN_BASE: z.string().url().optional(),

  // Moralis (EVM token holders, etc.)
  MORALIS_API_KEY: z.string().optional(),
  // Frontrun / MemeRadar adapters for Brief mode.
  FR_BASE: z.string().url().optional(),
  FR_TOKEN: z.string().optional(),
  FR_COOKIE: z.string().optional(),
  FR_CLIENT_VERSION: z.string().optional(),
  FR_ORIGIN: z.string().optional(),
  FR_FETCH_ALT_WALLETS: z.string().optional(),
  MR_BASE: z.string().url().optional(),
  MR_TOKEN: z.string().optional(),
  MR_CHAIN: z.string().optional(),
  // BSC token-scan safety knobs (Moralis holders mode).
  // Moralis owners endpoint typically caps per-page at 100.
  BSC_HOLDERS_PAGE_LIMIT: z.coerce.number().int().min(1).max(100).optional().default(100),
  // Prevent runaway pagination on huge tokens.
  BSC_HOLDERS_MAX_PAGES: z.coerce.number().int().min(1).max(10_000).optional().default(80),
  // Hard timeout for BSC token-mode scans (ms). Mirrors Solana's HELIUS_TOKEN_SCAN_TIMEOUT_MS.
  BSC_TOKEN_SCAN_TIMEOUT_MS: z
    .coerce
    .number()
    .int()
    .min(1000)
    .max(30 * 60 * 1000)
    .optional()
    .default(90_000),

  // BSC RPC (used for contract/EOA filtering via eth_getCode)
  // Optional override; defaults to a public BSC endpoint in code.
  BSC_RPC_URL: z.string().url().optional(),

  // GMGN (3rd-party wallet intelligence; used for "reverse cluster" PoC)
  // WARNING: GMGN endpoints may require cookies/session; treat as best-effort and for PoC unless you have explicit authorization.
  GMGN_MODE: z.enum(["browser", "http"]).optional().default("browser"),
  GMGN_DEVICE_ID: z.string().optional(),
  GMGN_FP_DID: z.string().optional(),
  GMGN_CLIENT_ID: z.string().optional(),
  GMGN_APP_VER: z.string().optional(),
  GMGN_BROWSER_HEADLESS: z
    .preprocess((v) => (typeof v === "string" ? v.toLowerCase().trim() : v), z.any())
    .optional()
    .transform((v) => v === "true" || v === true)
    .default(true),
  GMGN_TZ_NAME: z.string().optional().default("Asia/Shanghai"),
  GMGN_TZ_OFFSET: z.string().optional().default("28800"),
  GMGN_APP_LANG: z.string().optional().default("zh-CN"),
  GMGN_OS: z.string().optional().default("web"),
  GMGN_WORKER: z.string().optional().default("0"),
  // Optional: send as Cookie header when calling GMGN by HTTP.
  GMGN_COOKIE: z.string().optional(),
  GMGN_BASE: z.string().url().optional(),

  // DevTrace cache TTL
  DEVTRACE_CACHE_TTL_MS: z
    .coerce
    .number()
    .int()
    .min(1000)
    .max(24 * 60 * 60 * 1000)
    .optional()
    .default(30 * 60 * 1000),

  // DevTrace: concurrency for heavy upstream calls inside a single trace run.
  // Higher = faster first-run, but increases upstream pressure/cost.
  DEVTRACE_TRACE_CONCURRENCY: z.coerce.number().int().min(1).max(20).optional().default(4),

  // DevTrace: ATH lookback window (days). Used when computing "historical highest market cap".
  // Note: For very old tokens, we cap the scanned window for performance and rate-limit safety.
  // For meme / short-cycle tokens, 1y is often unnecessary and increases API load.
  // Default to ~6 months for a better cost/latency tradeoff; can be overridden via env.
  DEVTRACE_ATH_LOOKBACK_DAYS: z.coerce.number().int().min(7).max(3650).optional().default(180),

  // DevTrace: cap the number of tokens to scan when computing ATH/highest market cap.
  // Set to 0 to skip ATH scan entirely for fastest first-run.
  DEVTRACE_ATH_MAX_TOKENS: z.coerce.number().int().min(0).max(500).optional().default(40),

  // DevTrace: concurrency for ATH token scanning (Birdeye OHLCV / price).
  // Higher = faster, but more likely to hit rate limits.
  DEVTRACE_ATH_CONCURRENCY: z.coerce.number().int().min(1).max(20).optional().default(5),

  // Whales cache TTL
  WHALES_CACHE_TTL_MS: z
    .coerce
    .number()
    .int()
    .min(1000)
    .max(24 * 60 * 60 * 1000)
    .optional()
    .default(30 * 60 * 1000),

  // Lottery (SOGO LastBuyerWins campaign)
  LOTTERY_ENABLED: z
    .preprocess((v) => (typeof v === "string" ? v.toLowerCase().trim() : v), z.any())
    .optional()
    .transform((v) => v === "true" || v === true)
    .default(false),
  // Admin token for config updates (Authorization: Bearer ...)
  LOTTERY_ADMIN_TOKEN: z.string().optional(),
  // Path to activity hot-wallet keypair JSON file (NOT the creator wallet)
  LOTTERY_KEYPAIR_PATH: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function readEnv(): Env {
  // Allow a few alias env var names to reduce friction.
  const env = {
    ...process.env,
    ARKM_API_KEY: process.env.ARKM_API_KEY ?? process.env.ARKHAM_API_KEY,
    // Dune: allow Team key to override user key without changing code.
    DUNE_API_KEY: process.env.DUNE_TEAM_API_KEY ?? process.env.DUNE_API_KEY,
    // When running under a Team API key, default to Team-owned resolver queries,
    // unless explicitly overridden by env.
    DUNE_QUERY_ID_SOL_RESOLVE:
      process.env.DUNE_QUERY_ID_SOL_RESOLVE ??
      (process.env.DUNE_TEAM_API_KEY ? "6613704" : undefined),
    DUNE_QUERY_ID_BSC_RESOLVE:
      process.env.DUNE_QUERY_ID_BSC_RESOLVE ??
      (process.env.DUNE_TEAM_API_KEY ? "6613699" : undefined),
    // Backward/alt naming for x.ai
    AI_API_KEY: process.env.AI_API_KEY ?? process.env.XAI_API_KEY ?? process.env.REAL_GROK_API_KEY,
    AI_MODEL: process.env.AI_MODEL ?? process.env.XAI_MODEL,
    // Etherscan/BscScan v2 key aliases.
    ETHERSCAN_API_KEY:
      process.env.ETHERSCAN_API_KEY ?? process.env.ETHERSCAN_V2_API_KEY ?? process.env.BSCSCAN_API_KEY,
  };

  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}
