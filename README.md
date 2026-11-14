# Fire in Freefall

**An AI-powered interactive research dashboard for NASA microgravity combustion data** —
NASA Space Apps Challenge 2026 · *Fire in Freefall*.

Explore 129 real solid-fuel burns flown on the International Space Station (PSI-25 · BASS-II):
filter by oxygen and airflow, watch the original ISS footage frame by frame, compare runs, ask
"what if?" and get the closest *real* experiment — never a fabricated one — and let an AI research
assistant drive the whole dashboard for you.

| | |
|---|---|
| Data | NASA Physical Sciences Informatics — PSI-25 BASS-II (DOI 10.60555/4qc4-de67, CC0) |
| Stack | Next.js 16 · React 19 · TypeScript · Tailwind v4 · D3 · Zustand · OpenAI + Claude (switchable) · Python pipeline |
| Deploy | Vercel, no login |

## Quick start

```bash
pnpm install
cp .env.example .env.local      # add OPENAI_API_KEY (ANTHROPIC_API_KEY optional)
pnpm dev                        # http://localhost:3000
pnpm data:psi25                 # optional: rebuild data from NASA PSI
```

## Team — Event Horizon
Adil Sevim · Hakan Celep · Ceren Akgün · Muhammed Ensar Aktaş

## Documentation
- [Product spec](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) ·
  [Design system](docs/DESIGN_SYSTEM.md) · [Data](docs/DATA.md) · [Decisions](docs/DECISIONS.md)
- Built by a coordinated team of AI engineers (Claude Code, Codex, Antigravity) under human
  direction — see [AGENTS.md](AGENTS.md) and [docs/coordination/](docs/coordination/PROTOCOL.md).

## Data credit
Data courtesy of NASA's Physical Sciences Informatics system, BASS-II investigation
(PIs: S. Bhattacharjee, C. Fernandez-Pello, P. Ferkul, F. Miller, S. Olson, J. T'ien).
