# WebSocket + subscription health

Use this alongside `websocket-streaming.md` when diagnosing Bitquery churn, orphaned subscriptions, or `WS_PER_KEY_LIMIT` / subscription-cap errors.

## Two connection types

1. **Alpha stream** — one WebSocket carrying buffered `alpha_signal` traffic. Managed by `solana_alpha_subscribe`; the plugin watchdog reconnects automatically. Cron and subscription cleanup **must never** call `solana_alpha_unsubscribe` unless deliberately shutting alpha down.

2. **Bitquery mux** — one WebSocket from the gateway plugin carries many **logical subscriptions** (`bitquery_subscribe` / `bitquery_unsubscribe`). The orchestrator multiplexes upstream Bitquery streams. Steady state is typically **one** plugin Bitquery client + **one** alpha client (**~2 TCP connections**) to TraderClaw, not one socket per mint.

## Health signals

**Good**

- Orchestrator diagnostics (`solana_bitquery_subscriptions`): Bitquery subscriber counts aligned with **open positions** (usually one `realtimeTokenPricesSolana` per mint you hold).
- Active Bitquery subscriptions **below 20** per client (`OPENCLAW_WS_MAX_SUBS_PER_CLIENT` default — see `websocket-streaming.md`).
- Plugin `solana_runtime_status.bitqueryStream` matches intuition: sane `activeSubscriptionCount`, tokens match `solana_positions` mints.

**Bad**

- Subscriptions still listed for mints **without** an open position (heartbeat Step 7 missed or failed).
- `activeSubscriptionCount` **at or above 20**, or subscribe errors **`WS_SUBSCRIPTION_LIMIT_REACHED`**.
- **`WS_PER_KEY_LIMIT`** or very high **TCP** connection counts to `api.traderclaw.ai` (**25** API-key ceiling) despite few logical subs — indicates **orphan TCP / leaked clients** across plugin lifecycle. Unsubscribe tools alone cannot always drop leaked sockets.

## What `subscription_cleanup` does

Scheduled job **`subscription_cleanup`** (OpenClaw cron store, id `subscription-cleanup`):

- Baseline via `solana_runtime_status`, `solana_positions`, `solana_bitquery_subscriptions`.
- Unsubscribe Bitquery subscriptions whose token is **not** in open positions (`solana_bitquery_unsubscribe`).
- Subscribe **`realtimeTokenPricesSolana`** for any open CA missing coverage; pass **`agentId` matching your trading agent** (job agent id — `main` on V1 installs).
- Reopen nearing-expiry subscriptions (`solana_bitquery_subscription_reopen`).
- Writes memory tag **`subscription_cleanup`** with before/after metrics.

Escalate with **CRITICAL** in memory when limits persist after reconcile; **restart the gateway** is the corrective action for leaked TLS sockets (`systemctl --user restart openclaw-gateway`).

## Operational rule of thumb

- **Logical Bitquery subscriptions** should mirror **open positions** (typically one price stream per held mint). Keep count **below 20** (`OPENCLAW_WS_MAX_SUBS_PER_CLIENT`).
- **Outbound TLS sessions** from the gateway toward TraderClaw should stay near **two** — one mux for Bitquery, one for Alpha — unless you know you intentionally run multiple clients.
