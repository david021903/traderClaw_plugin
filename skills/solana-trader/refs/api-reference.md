# API Contract Reference

Base URL: `https://api.traderclaw.ai`

## Session Auth Flow

The **runtime** refreshes or completes the challenge flow automatically once `apiKey` exists in local plugin config. For wallet-proof challenges, the wallet private key is supplied at runtime via `--wallet-private-key` or `TRADERCLAW_WALLET_PRIVATE_KEY`. **Signup is not performed by the agent.**

1. **Signup (human/CLI only)** — `POST /api/auth/signup` with `{ externalUserId }` → returns `apiKey`. Status `201`.
2. **Challenge** — `POST /api/session/challenge` with `{ apiKey, clientLabel }` → returns `{ challengeId, walletProofRequired }`. Status `201`.
3. **Start** — `POST /api/session/start` with `{ apiKey, clientLabel }` (+ proof fields if required) → returns `{ accessToken, refreshToken }`. Status `201`.
4. **Refresh** — `POST /api/session/refresh` with `{ refreshToken }` → returns new tokens. Status `200`.
5. **Logout** — `POST /api/session/logout` with `{ refreshToken }` → revokes session. Status `200`.

All authenticated endpoints use `Authorization: Bearer <accessToken>`.

## Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing or invalid required fields |
| `401` | `UNAUTHORIZED` | Token expired or revoked |
| `403` | `TIER_REQUIRED` / `SCOPE_DENIED` / `INSUFFICIENT_TIER` | Rate limit exceeded — report and continue |
| `404` | `WALLET_NOT_FOUND` | walletId does not exist |
| `403` | (trade/precheck denied) | Policy denial with `approved: false`, `code`, reason |

## Complete Endpoint Map

> **ALL ENDPOINTS ARE ACCESSIBLE ON ALL TIERS.** The only difference is rate limits. Never refuse to call an endpoint because of tier.

| Method | Path | Required Params | Notes |
|---|---|---|---|
| `POST` | `/api/auth/signup` | `externalUserId` | CLI/human only. Returns `apiKey`. Status `201` |
| `POST` | `/api/session/challenge` | `apiKey` | Returns `challengeId`, `walletProofRequired` |
| `POST` | `/api/session/start` | `apiKey` | Returns `accessToken`, `refreshToken` |
| `POST` | `/api/session/refresh` | `refreshToken` | Rotates tokens |
| `POST` | `/api/session/logout` | `refreshToken` | Revokes session |
| `GET` | `/api/wallets` | — | List all wallets. Optional `?refresh=true` |
| `POST` | `/api/wallet/create` | — | Create wallet. Optional: `label`, `publicKey`, `chain`, `ownerRef`, `includePrivateKey`. Status `201` |
| `GET` | `/api/capital/status` | `?walletId=<uuid>` | Wallet capital and daily limits |
| `GET` | `/api/wallet/positions` | `?walletId=<uuid>` | Open positions. Optional `?status=` |
| `GET` | `/api/funding/instructions` | `?walletId=<uuid>` | Deposit instructions |
| `GET` | `/api/killswitch/status` | `?walletId=<uuid>` | Kill switch state |
| `POST` | `/api/killswitch` | `walletId`, `enabled` | Toggle kill switch. Optional: `mode` |
| `GET` | `/api/strategy/state` | `?walletId=<uuid>` | Current strategy weights and mode |
| `POST` | `/api/strategy/update` | `walletId`, `featureWeights` | Update weights. Optional: `strategyVersion`, `mode` |
| `POST` | `/api/thesis/build` | `walletId`, `tokenAddress` | Build full thesis package |
| `POST` | `/api/trade/precheck` | `walletId`, `tokenAddress`, `side`, `slippageBps` | Risk/policy check. Buy: `sizeSol`. Sell: `sellPct`/`sizeTokens` |
| `POST` | `/api/trade/execute` | `walletId`, `tokenAddress`, `side`, `slippageBps` | Execute trade. Optional: `symbol`, `tpLevels[]`, `slPct`, `trailingStopPct` (simple) or `trailingStop` object. Header: `x-idempotency-key` |
| `POST` | `/api/trade/review` | `walletId`, `outcome`, `notes` | Post-trade review. Optional: `tradeId`, `tokenAddress`, `pnlSol`, `tags[]`, `strategyVersion`. Status `201` |
| `POST` | `/api/memory/write` | `walletId`, `notes` | Journal entry. Optional: `tokenAddress`, `outcome`, `tags[]`, `strategyVersion`. Status `201` |
| `POST` | `/api/memory/search` | `walletId`, `query` | Search memory entries |
| `POST` | `/api/memory/by-token` | `walletId`, `tokenAddress` | Memory for specific token |
| `GET` | `/api/memory/journal-summary` | `?walletId=<uuid>` | Performance summary. Optional: `?lookbackDays=` |
| `GET` | `/api/trades` | `?walletId=<uuid>` | Trade history. Optional: `?limit=` (max 200), `?offset=` |
| `GET` | `/api/risk-denials` | `?walletId=<uuid>` | Risk denial log. Optional: `?limit=` (max 200) |
| `GET` | `/api/entitlements/costs` | — | Tier costs and capabilities |
| `GET` | `/api/entitlements/plans` | — | Available monthly plans |
| `GET` | `/api/entitlements/current` | `?walletId=<uuid>` | Current tier and limits |
| `POST` | `/api/entitlements/purchase` | `walletId`, `planCode` | Buy plan (deducts SOL). Status `201` |
| `POST` | `/api/scan/new-launches` | `walletId` | New launches (Pump.fun, Raydium, PumpSwap) |
| `POST` | `/api/scan/hot-pairs` | `walletId` | High-volume/momentum pairs |
| `POST` | `/api/market/regime` | `walletId` | Macro market state |
| `POST` | `/api/token/snapshot` | `tokenAddress` | Price, volume, OHLC, trade count |
| `POST` | `/api/token/holders` | `tokenAddress` | Holder distribution and dev holdings |
| `POST` | `/api/token/flows` | `tokenAddress` | Buy/sell pressure and net flow |
| `POST` | `/api/token/liquidity` | `tokenAddress` | Pool depth and DEX breakdown |
| `POST` | `/api/token/risk` | `tokenAddress` | Composite risk profile |
| `POST` | `/api/bitquery/catalog` | `walletId`, `templatePath` | Run pre-built Bitquery template |
| `POST` | `/api/bitquery/query` | `walletId`, `query` | Run raw GraphQL query |
| `POST` | `/api/entitlements/upgrade` | `walletId`, `targetTier` | Upgrade account tier |
| `GET` | `/api/wallet/token-balance` | `?walletId=<uuid>&tokenAddress=<mint>` | SPL token balance for a specific mint in wallet |
| `POST` | `/api/wallet/sweep-dead-tokens` | `walletId` | Sweep dust/dead token accounts to reclaim rent SOL. Optional: `minValueUsd` (threshold, default 0.01) |
| `GET` | `/api/system/status` | — | System health and connectivity |

## Key Contract Notes

- **walletId** is always a UUID string
- **Wallet creation** path is `POST /api/wallet/create` (not `POST /api/wallets`)
- **`side`** is required on precheck — must be `"buy"` or `"sell"`
- **`outcome`** enum: `win`, `loss`, `neutral` (not `breakeven`)
- **`x-idempotency-key`** header on trade/execute: optional, recommended UUID per trade attempt
- **Signup returns 201** (not 200)
- **Session challenge/start return 201** (not 200)
- **`strategyVersion`** must be strict semver or server returns 400
- **`sellPct`** preferred for sells. If both `sellPct` and `sizeTokens` sent, `sellPct` wins. Never send `sizeSol` for sells.
- **`tpLevels` alone** — each level sells 100% of position. Use `tpExits` for partial sells.
- **`trailingStop` object** — structured alternative to `trailingStopPct`. If both are sent, the object takes precedence.

## Trailing Stop Parameter

The `/api/trade/execute` endpoint accepts trailing stop configuration in two forms:

**Simple (legacy):** `trailingStopPct` — a single percentage value (e.g., `15` for 15% trailing stop).

**Structured (preferred):** `trailingStop` object with fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `percentage` | number | Yes | Trailing stop distance as percentage (e.g., `15` for 15%) |
| `amount` | number | No | Absolute SOL amount for trailing stop (alternative to percentage) |
| `triggerAboveATH` | boolean | No | If `true`, trailing stop only activates after price exceeds all-time high since entry. Default: `false` |

If both `percentage` and `amount` are provided, the tighter (closer to price) value is used. Use the level system from refs/trade-execution.md to dynamically tighten `percentage` as profit grows.

## PnL Field Clarification (USD vs SOL)

The positions and trades endpoints return **both** USD and SOL PnL fields:

| Field | Currency | Use Case |
|---|---|---|
| `realizedPnl` | **USD** | Dollar-denominated realized profit/loss |
| `unrealizedPnl` | **USD** | Dollar-denominated unrealized profit/loss |
| `realizedPnlSol` | **SOL** | SOL-denominated realized profit/loss |
| `unrealizedPnlSol` | **SOL** | SOL-denominated unrealized profit/loss |

**CRITICAL:** When reporting PnL in SOL (which is the standard for this agent), always use `realizedPnlSol` / `unrealizedPnlSol`. The fields `realizedPnl` / `unrealizedPnl` are in USD. Confusing these causes wildly incorrect PnL reports (e.g., reporting "$2.30 USD" as "2.30 SOL").
