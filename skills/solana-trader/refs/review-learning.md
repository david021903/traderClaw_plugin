# Review & Learning — Steps 8, 8.5 (CRON-ONLY)

> **HEARTBEAT DISAMBIGUATION:** During heartbeat cycles, Step 8 means **memory write-back** (solana_state_save, solana_daily_log, solana_memory_write) as defined in HEARTBEAT.md. This file covers the CRON-ONLY deep review.

## Step 8: REVIEW — Honest Journaling

> **Two components:** Trade review has an **inline** part and a **cron** part.
> - **Inline (fast loop):** When a position closes, immediately call `solana_trade_review`. Lightweight outcome tagging while context is fresh.
> - **Deep review (cron):** Pattern mining, lesson extraction, cross-trade correlation via `strategy_evolution` job.

### Trade Review Fields

After every position closure, call `solana_trade_review` with:
- `tradeId` — trade UUID (optional if providing tokenAddress)
- `tokenAddress` — token mint address (optional if providing tradeId)
- `outcome` — "win", "loss", or "neutral" (not "breakeven")
- `notes` — detailed analysis
- `pnlSol` — final profit/loss in SOL
- `tags` — array of outcome tags (e.g., `["momentum_win", "house_money_win"]`)
- `strategyVersion` — current strategy version (strict semver, e.g., "v1.3.0")

### What to Include in Review Notes

- Which signals were correct and which were wrong
- Entry timing quality (pullback entry or chased green candle?)
- Sizing appropriateness (too large for liquidity? too small for confidence?)
- Exit optimality (left money on table / held too long?)
- Market regime and whether you adjusted correctly
- Lifecycle stage and whether stage-specific rules were appropriate
- FOMO, revenge trading, or tilt detection
- What you would do differently

### Learning from Inaction

Skipped-signal tags (`alpha_skipped_regret`, `alpha_skipped_correct`) are logged via `solana_memory_write` — they are observations, not trade outcomes. Reserve `solana_trade_review` for executed trades only.

Use `solana_alpha_history` to check outcomes of signals you passed on.

---

## Step 8.5: STRUCTURED LEARNING LOG — Decision-Level Learning

Trade reviews capture WHAT happened. The Structured Learning Log captures WHY you made a wrong decision.

### When to Create a Learning Entry

1. **Wrong decision** — Identified specific reasoning error
2. **Missed signal** — Skipped a token that subsequently pumped
3. **Strategy failure** — Weights predicted wrong
4. **Repeated mistake** — Same error type recurring
5. **Near miss** — Anti-rug check saved you, but you almost entered
6. **Surprise outcome** — Unexpected result your model doesn't capture

### Entry Format

Use tag `learning_entry` plus area tag:

```
LEARNING ENTRY: <ID>
Priority: <P1/P2/P3>
Area: <area_tag>
Status: <open/investigating/resolved>
See Also: <comma-separated IDs of related entries>

WHAT HAPPENED:
<1-2 sentences describing the event>

WHY IT WENT WRONG (or: WHAT I MISSED):
<Root cause analysis — "market was bad" is not a root cause.>

EVIDENCE:
<Token address, trade ID, feature scores, timestamps>

PATTERN CHECK:
<First time or recurring? Search memory for similar entries.>
<If recurring: link to previous IDs, note recurrence count.>

SUGGESTED ADJUSTMENT:
<What should change? Weight? Filter? Heuristic? Scanning behavior?>
<Suggest soft adjustments for strategy_evolution cron to evaluate.>
```

### Entry ID Scheme

`LRN-YYYYMMDD-NNN` (e.g., `LRN-20260315-001`). Increment NNN per day.

### Priority Levels

| Priority | When to Use |
|---|---|
| `P3` | Minor insight, one-off mistake |
| `P2` | Clear reasoning error, moderate capital loss |
| `P1` | Recurring pattern (2+ linked entries), significant loss, systematic flaw |

### Area Tags

| Tag | Area |
|---|---|
| `learning_entry_sizing` | Position sizing errors |
| `learning_entry_timing` | Entry/exit timing errors |
| `learning_entry_analysis` | Analysis/red-flag errors |
| `learning_entry_model` | Feature weight model errors |
| `learning_entry_alpha` | Alpha signal processing errors |
| `learning_entry_risk` | Risk management errors |
| `learning_entry_meta` | Narrative/meta errors |
| `learning_entry_execution` | Execution errors |

### Linking Related Entries

Add related past entry IDs to `See Also`. If chain reaches 3+ entries on same theme, bump to P1 — confirmed recurring pattern.

### Resolution

When a learning entry leads to strategy adjustment:
```
Resolution: Applied in strategy v1.4.0 — increased liquidity_depth weight from 0.18 to 0.24.
```
