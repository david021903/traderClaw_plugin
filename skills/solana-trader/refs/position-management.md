# Position Management — Step 7 MONITOR

## Monitoring Tools

Check periodically:
- `solana_positions` — unrealized PnL, current price vs entry
- `solana_capital_status` — portfolio-level health

**PnL field usage:** For Solana positions, use `unrealizedPnl` / `realizedPnl` directly. Those fields are SOL-native on `/api/wallet/positions`. See refs/api-reference.md § PnL Field Clarification.

**`unrealizedReturnPct`:** Positions also return `unrealizedReturnPct` — the percentage return since entry (e.g., `25.5` = +25.5%). Use this for trailing stop level matching and FOMO checks instead of calculating manually from price fields.

**On-chain balance verification:** Use `solana_wallet_token_balance` to verify actual on-chain holdings for any position where reported balance seems inconsistent. This is a POST call with `tokenAddress` — use it as a spot-check, not for routine monitoring.

## Real-Time Monitoring with Subscriptions

For active positions, prefer real-time Bitquery subscriptions over polling:
- `solana_bitquery_subscribe` with `pumpFunTrades`/`pumpSwapTrades` + `{ token: "MINT_ADDRESS" }` — real-time trade flow
- `ohlc1s` + `{ token: "MINT_ADDRESS" }` — 1-second OHLC candles
- `dexPoolLiquidityChanges` + `{ token: "MINT_ADDRESS" }` — LP drains/additions (critical for anti-rug)
- `realtimeTokenPricesSolana` — simpler price-only monitoring
- When position closed, call `solana_bitquery_unsubscribe`. Per-client cap: 20 active subscriptions.

## LOCAL_MANAGED Positions — You Decide Exits

Exit when:
- Price hits take-profit levels (partial at each level)
- Momentum collapses (flow shifts from inflow to outflow)
- Liquidity deteriorates materially
- Portfolio concentration becomes unsafe
- Stop-loss level hit
- Dead money: position flat (±5%) for mode's cutoff (6h HARDENED, 3h DEGEN)

## House Money Management

After taking initial capital out at +100%:
- Switch to trailing stop only. Remove fixed TP levels.
- Widen trailing stop by 50% from original setting.
- Only exit on: trailing stop hit, flow reversal (sustained net outflow), or liquidity collapse.
- Do NOT take partial profits on house money — let it ride.

## DEGEN-Specific Monitoring

- +25–50% quickly → take partial immediately to lock base capital
- Momentum stalls (volume drops >50%) → tighten trailing stop aggressively
- -10–15% rapidly → cut immediately, do not hope

## HARDENED-Specific Monitoring

- Ride trends longer, respect defense triggers
- Don't exit on minor pullbacks within a strong trend
- Re-evaluate thesis if position flat for extended period

## Social Exhaustion Check

While holding, periodically check if social buzz has peaked:
```
x_search_tweets({ query: "$SYMBOL", maxResults: 50 })
```

- Mention velocity declining + price flat/dropping → social exhaustion → consider exit
- Mention velocity accelerating + price rising → still has momentum
- Maximum Twitter buzz is more often a **sell signal** than a buy signal

If X credentials not configured, skip. On-chain flow data remains primary.

## SERVER_MANAGED Positions

- Do NOT manually exit
- Query positions to see server strategy progress
- To override: exit through a normal sell order (server may also be managing stops)

## Sell Denial Handling

If a sell is denied by policy:
- Reduce aggression for future trades
- Journal the denial reason
- Do NOT circumvent

## Dead Money Re-Check

Apply ALL four criteria every cycle:
1. Loss > 40%
2. Held 90+ min AND still down 5%+
3. 24h volume < $5,000
4. Price flat (±5%) for 4+ hours

If ALL four true → exit immediately. Do NOT wait for next cycle.
