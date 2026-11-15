# Deploying FlameBridge to Vercel

The app is a standard Next.js 16 project; Vercel detects it, installs with pnpm
(`packageManager` in `package.json`) and runs `pnpm build`. No `vercel.json` is needed.

## 1. Import the project

1. vercel.com → **Add New… → Project** → import `eventhorizontr/FlameBridge-Dashboard`.
2. Framework preset: **Next.js** (auto). Root directory: repository root. Build and install
   commands: leave the defaults.

## 2. Add the shared counter for the AI limit (required)

The assistant allows **10 questions per visitor IP in total** (ADR-028). On Vercel many server
instances run at once, so the count must live in one shared store:

1. Project → **Storage** → **Create / Connect** → **Upstash for Redis** (Marketplace, free tier is
   enough) → connect it to the project for Production and Preview.
2. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to the project automatically.

Without these variables the counter falls back to memory per instance, which is **not** a reliable
limit; with them, every instance counts together and the counter is incremented atomically before
the model is called. If Redis is configured but unreachable, the assistant refuses requests
instead of running without a limit.

## 3. Environment variables

Project → **Settings → Environment Variables** (Production and Preview):

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | your OpenAI key (keep it only here and in `.env.local`) |
| `ANTHROPIC_API_KEY` | optional, enables Claude |
| `AI_DEFAULT_PROVIDER` | `openai` |
| `AI_QUOTA_LIMIT` | `10` |
| `AI_QUOTA_WINDOW_HOURS` | `0` (a total that never resets; `24` would make it per day) |
| `AI_QUOTA_SALT` | any long random string (used to hash IPs; raw IPs are never stored) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | added by step 2 |

Never commit keys: `.env.local` is gitignored and `src/config/env-example.test.ts` fails if a value
appears in `.env.example`.

## 4. Deploy and check

Deploy, then on the production URL:

- `/` shows the landing page; **Go to dashboard** opens `/overview`.
- `/experiments/PSI-25%3AB1` opens a run page (its data is bundled through
  `outputFileTracingIncludes` in `next.config.ts`).
- `/api/ai/providers` returns the available providers and `"quota": {"limit": 10, "remaining": 10, …}`.
- Ask the Research AI one question: the composer then reads "9 of 10 questions left".

To reset a visitor's count, delete keys starting `fb:ai-quota:v1:` in the Upstash console.

## Security summary of `/api/ai`

1. Cross-site browser requests are refused (`Origin` / `Sec-Fetch-Site`).
2. Request bodies are capped at 512 KB and validated with Zod.
3. A burst limit (20 per 5 minutes per IP) stops loops.
4. The per-IP quota is counted only for valid requests and before the model runs; the 11th
   question gets HTTP 429 `quota_exceeded`. The IP comes from Vercel's edge headers, which a client
   cannot override.

## GitHub Actions

CI currently shows ✗ on every push because GitHub does not start the jobs ("recent account
payments have failed or your spending limit needs to be increased"). Nothing in the code fails;
fix it in GitHub → Settings → Billing and plans. Until then the local gate is
`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, and Vercel runs the build on every deploy.
