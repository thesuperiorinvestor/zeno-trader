# Zeno Trader — "Road to 7-Figures"

A full-stack day-trading options journal and analytics dashboard — my own spin on TradeZella,
rebuilt to mirror the workflow I actually trade, with a faster, private, AI-assisted feel. Every
trade is logged, graded, and reviewed by Claude; all data lives locally in the browser (IndexedDB)
with an optional read-only broker connection.

> Built with **Next.js 16**, **React 19**, **TypeScript**, and **Claude** — designed, iterated, and
> shipped end-to-end with Claude Code.

---

## Highlights

- **6 focused workspaces** — Dashboard, Trade Log, Import, Opportunities, Playbook
  (Setups / Analytics), and Daily (journal + accountability).
- **AI trade reviews** — per-trade insight, weekly reviews, monthly reports, and adaptive
  pre-trade / post-mortem analysis, all powered by the Anthropic API (server-side routes, key never
  exposed to the client).
- **Local-first** — trades, screenshots, tags, and journal entries persist in IndexedDB. No backend
  database, no account required, instant load.
- **Live broker snapshot** — optional **read-only** Public.com integration surfaces open positions
  and quotes. The app never places or modifies orders.
- **Options-aware math** — P&L, R-multiples, and win-rate calculated per contract (×100), not raw
  share price.
- **Analytics that matter** — equity curve, KPI row, setup breakdown, and emotion/tag tagging to
  find what actually works.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Storage | IndexedDB (`idb`) — local-first, no server DB |
| Charts | Recharts |
| AI | Claude via `@anthropic-ai/sdk` (server-side API routes) |
| Broker | Public.com API (read-only) |

## Architecture

- `app/` — App Router pages (`dashboard`, `trades`, `import`, `opportunities`, `playbook`, `daily`)
  and API routes under `app/api/` for Claude reviews and the Public.com broker proxy.
- `components/` — feature-grouped UI (dashboard widgets, trade forms, analytics, daily journal).
- `lib/` — data layer and integrations: `db.ts` (IndexedDB), `queries.ts`, `claude.ts`,
  `public.ts`, `types.ts`.

All secrets stay in `.env.local` (git-ignored). API keys are only ever read inside server routes.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Create a `.env.local` for the optional integrations:

```bash
ANTHROPIC_API_KEY=your_key_here     # enables Claude reviews
PUBLIC_API_SECRET=your_key_here     # optional, read-only live positions
```

The app is fully usable without any keys — AI reviews and live positions simply stay off.

## Why I built it

I wanted a trading journal that matched how I actually trade (options-only, setup-driven) and that
could give me honest, structured feedback on every trade instead of a wall of numbers. It's also a
demonstration of shipping a real, non-trivial full-stack app with Claude Code as the primary
development partner.
