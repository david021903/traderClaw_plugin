# Strategy Evolution — Step 9 EVOLVE (CRON-ONLY)

> This step runs ONLY via the `strategy_evolution` cron job. Never during heartbeat cycles.

## Overview

Strategy evolution is the self-improvement engine. It adjusts feature weights based on trade outcomes, detects recurring mistakes, and catalogs winning setups.

## Gating Condition

Weight changes require ≥20 closed trades since the last strategy update. Check via `solana_journal_summary` and `solana_strategy_state`.

**However:** Always run the full cron even with fewer than 20 trades. Pattern Detection and Named Pattern Recognition operate on learning entries and memory, not just trade count. Only weight updates require the trade count gate.

## Anti-Drift Lockout (ADL)

Before changing any weight, check:

1. **Direction consistency:** If a weight was increased last cycle, do not decrease it this cycle (and vice versa) unless you can cite 3+ specific trade outcomes that justify reversal. This prevents oscillation.

2. **Weight velocity:** If a weight changed in the last 2 consecutive cycles, freeze it for this cycle. Log with tag `weight_velocity_freeze`.

3. **Reversion check:** If a proposed change would bring a weight back within 0.02 of its value 2 cycles ago, reject it — you're oscillating. Explain why the oscillation is happening and whether the feature is genuinely noisy or you're reacting to variance.

## Value-First Modification (VFM)

Before applying ANY weight change, score the proposed modification on 3 dimensions:

| Dimension | 0 | +1 | +2 |
|---|---|---|---|
| **Frequency** | Feature irrelevant in <25% trades | Feature relevant 25-75% | Feature relevant >75% |
| **Failure Reduction** | Change wouldn't prevent past losses | Change would have filtered 1-2 losers | Change would have filtered 3+ losers |
| **Self-Cost** | Creates new complexity/conflicts | Neutral complexity | Simplifies/clarifies |

**Only apply weight changes scoring ≥ 3 (out of 5).** Changes scoring ≤ 2 are deferred — re-evaluate next cycle with more data.

### VFM Log Entry

Write with tag `vfm_scorecard`:
```
VFM SCORECARD — Strategy Evolution v1.X.0 → v1.Y.0

PROPOSED CHANGES:
1. volume_momentum: 0.20 → 0.24 (+0.04)
   Frequency: +2 (fired in 8/12 trades)
   Failure Reduction: +2 (3 losses had low volume_momentum)
   Self-Cost: +1 (straightforward increase)
   TOTAL: 5/5 → APPROVED

2. holder_quality: 0.15 → 0.10 (-0.05)
   Frequency: +1 (relevant in 5/12 trades)
   Failure Reduction: +1 (1 loss had poor holder quality)
   Self-Cost: 0 (may miss rare signals)
   TOTAL: 2/5 → DEFERRED

APPLIED: [volume_momentum +0.04]
DEFERRED: [holder_quality -0.05]
REJECTED: []
```

## Weight Guardrails

Before calling `solana_strategy_update`, verify:
- Max delta per update: ±0.10 (HARDENED) / ±0.15 (DEGEN)
- Weight floor: 0.02 (HARDENED) / 0.01 (DEGEN)
- Weight cap: 0.40 (HARDENED) / 0.50 (DEGEN)
- Sum ≈ 1.0

Log: `Guardrails check: maxDeltaOk=true, sumWeightsOk=true, minTradesOk=true, floorCapOk=true`

If any check fails, do NOT apply weights. Log which check failed.

## Recurring Pattern Detection

Before computing weight adjustments:

1. **Search learning entries:** `solana_memory_search` with query `"learning_entry"`. Group by area tag.

2. **Check linked chains:** Entries with `See Also` references. 3+ linked = **confirmed recurring pattern**:
   - Same deployer keeps burning you
   - Same entry timing mistake
   - Same alpha source producing losers
   - Same liquidity trap
   - Same narrative rotation miss

3. **Check drift warnings:** `solana_memory_search` for `"strategy_drift_warning"`. Investigate which weights are being ignored.

4. **Feed patterns into weight reasoning:** E.g., "3 linked entries on thin-pool losses → increase liquidity_depth"

5. **Log pattern detection results** with tag `pattern_detection`

6. **Resolve learning entries** when a strategy evolution cycle addresses the pattern.

## Named Strategy Patterns

After weight adjustments, run pattern recognition:

1. **Search winning trade clusters:** Memory search for `"momentum_win"`, `"house_money_win"`, `"thesis_correct"` + `solana_trades`

2. **Look for recurring winning conditions:** 3+ winning trades with common setup

3. **Name the pattern** and journal with tag `named_pattern`:
```
NAMED PATTERN: "Fresh Alpha Convergence"
ID: PAT-001
Win Rate: 75% (6/8 trades)
Avg PnL: +2.3 SOL/trade

SETUP CONDITIONS:
- Token age: < 2 hours
- Discovery: Alpha + on-chain convergence
- buy_pressure: > 0.7
- LP: burned/locked (mandatory)
- Source reputation: ≥ 60

ANTI-PATTERN (when this setup FAILS):
- Coordinated shill detected
- Volume front-loaded >70%
- Serial deployer
```

4. **Use in fast loop:** During Step 4, search memory for `named_pattern`. Matching provides additional confidence context.

5. **Evolve patterns:**
   - Win rate <50% over last 10 trades → mark `cooling`
   - Inactive 2+ weeks → mark `dormant`
   - Win rate >70% over 15+ trades → mark `proven`
   - Never delete — mark dormant instead

## Discovery Filter Evolution

After weight adjustments, evaluate discovery subscriptions:
- Which templates produced winners vs losers?
- Too many false positives from broad subscriptions?
- Log decisions with tag `discovery_filter_evolution`

## Alpha Source Learning

Build personal trust ranking for alpha callers. After 20+ alpha-sourced trades:
- Search memory for alpha outcome tags grouped by source
- Compare personal win rate vs aggregate `callerStats`
- Journal with tag `alpha_source_model`

## Exploration Ratio

- HARDENED: 80% capital on proven clusters, 20% experimental
- DEGEN: 50/50

Do not overfit to short streaks.

## Execution Order

1. Recurring Pattern Detection
2. ADL checks
3. Compute proposed weight changes
4. VFM scoring
5. Apply weights (if guardrails pass)
6. Named Pattern Recognition
7. Discovery filter evolution
8. Log everything
