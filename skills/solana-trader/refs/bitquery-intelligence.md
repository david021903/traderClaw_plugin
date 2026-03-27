# Bitquery Intelligence — Deep Scan

Bitquery intelligence gives you direct access to Solana on-chain data via GraphQL. These tools are used DURING the heartbeat cycle at specific steps, not just when you feel like investigating deeper.

## Mandatory Triggers — WHEN to Use Bitquery

| Trigger Condition | What to Call | Heartbeat Step |
|---|---|---|
| FRESH token (< 1h old) being analyzed | `solana_bitquery_catalog({ templatePath: "pumpFunHoldersRisk.first100Buyers", variables: { token: "CA" } })` | Step 2 |
| Any token scoring > 0.60 confidence | `solana_bitquery_catalog({ templatePath: "pumpFunMetadata.tokenMetadataByAddress", variables: { token: "CA" } })` — check website/metadata | Step 2 |
| Successful buy executed | `solana_bitquery_subscribe({ templateKey: "realtimeTokenPricesSolana", variables: { token: "CA" }, agentId: "main" })` — start live price monitoring | Step 5 |
| Position closed (exit) | `solana_bitquery_unsubscribe({ subscriptionId: "<id>" })` — stop monitoring | Step 7 |
| First heartbeat of session | `solana_bitquery_templates` — discover and cache available templates | Step 1 |
| Any active subscriptions exist | `solana_bitquery_subscriptions` — check for buffered events | Step 1 |

If the trigger condition is met, the Bitquery call is MANDATORY, not optional. The DEEP ANALYSIS section of your heartbeat report must show how many Bitquery templates you ran.

## Three Bitquery Tools

1. **`solana_bitquery_templates`** — Discovery tool. See all 50+ pre-built templates with descriptions and variables. No parameters needed.

2. **`solana_bitquery_catalog`** — Run a pre-built template. Pass `templatePath` (e.g., `"pumpFunHoldersRisk.first100Buyers"`) and `variables` (e.g., `{ token: "MINT_ADDRESS" }`). See `query-catalog.md` for full listing.

3. **`solana_bitquery_query`** — Run custom raw GraphQL against Bitquery v2. Pass `query` and optionally `variables`. Consult `bitquery-schema.md` for schema.

## When to Use Catalog vs Custom

- **Catalog templates** — Use when a pre-built query covers your case. Pre-validated, less error-prone.
- **Custom queries** — Use when no template fits. Always consult `bitquery-schema.md` first.

## Typical Workflow

1. `solana_bitquery_templates` — browse available queries
2. Pick the right template
3. `solana_bitquery_catalog` with template path and variables
4. If no template fits, `solana_bitquery_query` with custom GraphQL

## What Bitquery Adds

- **Early buyer analysis** — Who bought first? Still holding? (serial dumper detection)
- **Dev wallet tracking** — Deployer holdings
- **Cross-DEX liquidity** — Pool depth across Pump.fun, PumpSwap, Raydium, Jupiter
- **Migration status** — Graduated from bonding curve? When?
- **Historical OHLC** — Price action over any time window
- **Buy/sell pressure** — Detailed maker counts, unique buyers vs sellers
- **Wallet profiling** — What else has a wallet traded?

## Real-Time Streaming

For low-latency needs (new launches, active positions):

- **`solana_bitquery_subscribe`** — Subscribe to managed real-time stream. Pass `templateKey`, `variables`, `agentId: "main"`. Returns `subscriptionId`. Expires after 24h.
- **`solana_bitquery_unsubscribe`** — Unsubscribe when done.
- **`solana_bitquery_subscriptions`** — List active subscriptions.
- **`solana_bitquery_subscription_reopen`** — Renew expiring subscription.

Template keys: `pumpFunTokenCreation`, `pumpFunTrades`, `pumpSwapTrades`, `ohlc1s`, `dexPoolLiquidityChanges`, `realtimeTokenPricesSolana`

## Latency Awareness

Some queries are inherently slow (30-60+ seconds):
- **`/api/thesis/build`** — slowest (20-60s). Multiple internal Bitquery queries.
- **`/api/trade/precheck`** — queries token supply. 15-40s.
- **Complex templates** — slower than simple ones
- **Custom queries** — can be arbitrarily slow

Do not treat slow responses as errors. Factor latency into trading loop — prioritize top 2-3 candidates.

HTTP endpoint now **rejects subscription operations** — use `solana_bitquery_subscribe` instead.

## Companion Files

- `bitquery-schema.md` — Full Bitquery v2 EAP schema reference
- `query-catalog.md` — Complete template paths with descriptions
- `websocket-streaming.md` — WebSocket message contract, subscription lifecycle
