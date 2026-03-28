# Changelog — traderclaw-team-v1-upgraded

All notable changes to the V1-Upgraded plugin are documented here.

---

## [Unreleased] — Task #83: Merge David's SKILL.md Commits

### Added

- **Trailing stop level system** — Tiered trailing stop tightening based on unrealized profit level. Stops tighten at +25%, +50%, +100% (house money), and +200%+ profit thresholds. Documented in:
  - `SKILL.md` Mode Parameters table (6 new trailing stop rows)
  - `refs/trade-execution.md` § Trailing Stop Level System
  - `refs/decision-framework.md` § Trailing Stop Levels
  - `HEARTBEAT.md` Step 4 (compact trailing stop level reference)

- **`trailingStop` structured parameter** — New object-form alternative to `trailingStopPct` for `/api/trade/execute`, supporting `percentage`, `amount`, and `triggerAboveATH` fields. Documented in:
  - `refs/api-reference.md` § Trailing Stop Parameter
  - `refs/trade-execution.md` Step 6 parameter list

- **PnL USD/SOL field clarification** — Explicit documentation that `realizedPnl`/`unrealizedPnl` are USD and `realizedPnlSol`/`unrealizedPnlSol` are SOL. Fixes P&L misreporting bug where agent read USD fields as SOL. Documented in:
  - `refs/api-reference.md` § PnL Field Clarification
  - `refs/position-management.md` § Monitoring Tools
  - `refs/cron-jobs.md` § dead_money_sweep
  - `HEARTBEAT.md` Steps 6 and 10 (report rules)
  - `SKILL.md` Server Behavior Note #6

- **`solana_token_balance` tool** — `GET /api/wallet/token-balance` — query SPL token balance for a specific mint address in wallet. Registered in `index.ts`.

- **`solana_sweep_dead_tokens` tool** — `POST /api/wallet/sweep-dead-tokens` — sweep dust and dead token accounts to reclaim rent SOL. Optional `minValueUsd` threshold. Registered in `index.ts`.

- **2 new API endpoints** added to `refs/api-reference.md` endpoint map:
  - `GET /api/wallet/token-balance?walletId=<uuid>&tokenAddress=<mint>`
  - `POST /api/wallet/sweep-dead-tokens` with `walletId`, optional `minValueUsd`

### Changed

- **Tool counts updated**: 90 → 93 Solana tools (incl. web_fetch), 95 → 98 total (93 Solana + 5 X). Updated in:
  - `index.ts` (baseToolCount 60 → 75, runtime formula: 75 base + 17 intelligence + 1 web_fetch = 93 Solana + 5 X = 98)
  - `README.md` (header, architecture diagram, Available Tools heading, Wallet table)
  - `TOOLS.md` (header count, Wallet & Capital section 5 → 8 tools)

- **SKILL.md Mode Parameters table** — Replaced legacy "Rapid drawdown defense trigger" and "Partial profit trigger" rows with explicit stop-loss range and 5 tiered trailing stop level rows for HARDENED/DEGEN modes.

- **`refs/cron-jobs.md` dead_money_sweep** — Added `solana_sweep_dead_tokens` to tools list and PnL field check note.

### Verified

- **`bin/installer-step-engine.mjs`** — Confirmed byte-identical between V1 and V1-Upgraded (MD5: `d2ab14d378f4000160f8b32c6afcf267`). David's commit 4 bin change was already present in both copies.

---

## [1.0.0] — Initial V1-Upgraded Build

### Added

- Full V1 trading toolkit (73 base Solana tools) ported from `openclaw-plugin`
- Intelligence Lab (17 tools): candidate dataset, source/deployer trust scoring, champion/challenger models, replay evaluation, contradiction detection
- Tool envelope system (`src/tool-envelope.ts`) — standardized JSON envelope on every tool response
- Prompt injection scrubbing (`src/prompt-scrub.ts`) — mandatory for all external text
- Runtime layout manager (`src/runtime-layout.ts`) — workspace, memory dir, daily log management
- Split skill architecture: core `SKILL.md` + 10 reference files in `refs/`
- Self-contained `lib/` directory (web-fetch.mjs, x-client.mjs, x-tools.mjs) — no external `../lib/` dependency
- 5 X/Twitter tools (shared registrar): x_post_tweet, x_reply_tweet, x_search_tweets, x_read_mentions, x_get_thread
- Bootstrap hook with Markdown digest injection (state, decisions, bulletin, entitlements)
- Memory flush hook for context compaction safety
- Gateway config with sessionTarget:isolated cron jobs
- 2 new cron jobs: intelligence-lab-eval (12h), source-trust-refresh (6h)
