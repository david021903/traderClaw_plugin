# TOOLS.md - Trading Environment Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your trading setup.

## What Goes Here

Things like:

- Wallet address and trading mode
- X/Twitter credential status and handle
- API quirks you discover
- Tool behavior notes and edge cases
- Rate limit observations
- Anything environment-specific

## Tool Inventory (98 tools — 93 Solana + 5 X)

### System & Auth (6)
| Tool | Purpose |
|---|---|
| `solana_system_status` | Check orchestrator health and connectivity |
| `solana_startup_gate` | Run mandatory startup sequence (preferred path) |
| `solana_traderclaw_welcome` | Get welcome message after startup |
| `solana_gateway_credentials_get` | Check gateway registration status |
| `solana_gateway_credentials_set` | Register gateway URL and token |
| `solana_gateway_forward_probe` | Test forwarding path health |

### Wallet & Capital (8)
| Tool | Purpose |
|---|---|
| `solana_wallets` | List all wallets |
| `solana_wallet_create` | Create a new wallet |
| `solana_capital_status` | Wallet capital and daily limits |
| `solana_funding_instructions` | Get deposit instructions |
| `solana_token_balance` | Get SPL token balance for specific mint |
| `solana_sweep_dead_tokens` | Sweep dust/dead token accounts to reclaim rent SOL |
| `solana_killswitch_status` | Check kill switch state |
| `solana_killswitch_toggle` | Toggle kill switch on/off |

### Scanning & Discovery (4)
| Tool | Purpose |
|---|---|
| `solana_scan` | Broad market scan — launches + hot pairs combined |
| `solana_scan_launches` | Scan for new token launches |
| `solana_scan_hot_pairs` | Find high-volume/momentum pairs |
| `solana_market_regime` | Get macro market state |

### Token Analysis (5)
| Tool | Purpose |
|---|---|
| `solana_token_snapshot` | Price, volume, OHLC, trade count |
| `solana_token_holders` | Holder distribution and dev holdings |
| `solana_token_flows` | Buy/sell pressure and net flow |
| `solana_token_liquidity` | Pool depth and DEX breakdown |
| `solana_token_risk` | Composite risk profile |

### Trading (6)
| Tool | Purpose |
|---|---|
| `solana_build_thesis` | Build full thesis package |
| `solana_trade_precheck` | Risk/policy check before trade |
| `solana_trade_execute` | Execute a trade (full params) |
| `solana_trade` | Execute a trade (shorthand) |
| `solana_trade_review` | Post-trade review with outcome tags |
| `solana_positions` | Get open positions |

### Trade History & Risk (2)
| Tool | Purpose |
|---|---|
| `solana_trades` | Trade history with pagination |
| `solana_risk_denials` | Risk denial log |

### Strategy (2)
| Tool | Purpose |
|---|---|
| `solana_strategy_state` | Current strategy weights and mode |
| `solana_strategy_update` | Update feature weights |

### Entitlements (5)
| Tool | Purpose |
|---|---|
| `solana_entitlement_costs` | Tier costs and capabilities |
| `solana_entitlement_current` | Current tier and limits |
| `solana_entitlement_plans` | Available monthly plans |
| `solana_entitlement_purchase` | Buy a plan |
| `solana_entitlement_upgrade` | Upgrade account tier |

### Alpha Signals (5)
| Tool | Purpose |
|---|---|
| `solana_alpha_subscribe` | Subscribe to alpha signal stream |
| `solana_alpha_signals` | Poll buffered signals |
| `solana_alpha_history` | Query historical signal data |
| `solana_alpha_sources` | Per-source performance stats |
| `solana_alpha_submit` | Submit candidate to alpha buffer |

### Firehose (2)
| Tool | Purpose |
|---|---|
| `solana_firehose_config` | Configure firehose filter parameters |
| `solana_firehose_status` | Check firehose health and stats |

### Bitquery Intelligence (7)
| Tool | Purpose |
|---|---|
| `solana_bitquery_templates` | List available query templates |
| `solana_bitquery_catalog` | Run pre-built template query |
| `solana_bitquery_query` | Run custom raw GraphQL |
| `solana_bitquery_subscribe` | Subscribe to real-time stream |
| `solana_bitquery_unsubscribe` | Unsubscribe from stream |
| `solana_bitquery_subscriptions` | List active subscriptions |
| `solana_bitquery_subscription_reopen` | Renew expiring subscription |

### Memory & State (12)
| Tool | Purpose |
|---|---|
| `solana_state_save` | Persist durable state + update MEMORY.md |
| `solana_state_read` | Read durable state mid-session |
| `solana_daily_log` | Append to daily log file |
| `solana_decision_log` | Log trade decisions |
| `solana_team_bulletin_post` | Post to team bulletin board |
| `solana_team_bulletin_read` | Read team bulletin entries |
| `solana_context_snapshot_write` | Write portfolio world-view snapshot |
| `solana_context_snapshot_read` | Read latest snapshot |
| `solana_memory_write` | Write to server-side memory |
| `solana_memory_search` | Search server-side memory |
| `solana_memory_by_token` | Memory for specific token |
| `solana_journal_summary` | Performance summary stats |

### Deterministic Compute (4)
| Tool | Purpose |
|---|---|
| `solana_compute_confidence` | Weighted confidence formula |
| `solana_compute_freshness_decay` | Signal age decay factor |
| `solana_compute_position_limits` | Full position sizing ladder |
| `solana_compute_deployer_risk` | Deployer wallet risk classification |

### Deep Analysis (2)
| Tool | Purpose |
|---|---|
| `solana_history_export` | Export decisions + trades + memory |
| `solana_pattern_store` | Read/write/list named patterns |

### X/Twitter (5)
| Tool | Purpose |
|---|---|
| `x_post_tweet` | Post a tweet (AgentZERO identity) |
| `x_reply_tweet` | Reply to a tweet |
| `x_search_tweets` | Search tweets (social analysis) |
| `x_read_mentions` | Read mentions |
| `x_get_thread` | Get full thread context |

### Intelligence Lab (17) — V1-Upgraded
| Tool | Purpose |
|---|---|
| `solana_candidate_write` | Record token opportunity with features |
| `solana_candidate_get` | Read/list candidates from dataset |
| `solana_candidate_label_outcome` | Label trade outcome for learning |
| `solana_candidate_delta` | Compare stored vs current features |
| `solana_contradiction_check` | Detect conflicting claims across sources |
| `solana_scrub_untrusted_text` | Scrub external text for prompt injection |
| `solana_source_trust_refresh` | Recalculate alpha source trust scores |
| `solana_source_trust_get` | Get current source trust score |
| `solana_deployer_trust_refresh` | Recalculate deployer trust score |
| `solana_deployer_trust_get` | Get current deployer trust score |
| `solana_model_registry` | List/register scoring models |
| `solana_model_score_candidate` | Score features with a model |
| `solana_replay_run` | Run offline replay evaluation |
| `solana_model_promote` | Promote challenger to champion |
| `solana_evaluation_report` | Confusion matrix, accuracy, F1 |
| `solana_replay_report` | Generate replay comparison report |
| `solana_dataset_export` | Export candidate dataset (JSON/CSV) |

## X/Twitter

- Status: [configured/not configured — update this after startup]
- Read tools: x_search_tweets, x_read_mentions, x_get_thread (social analysis)
- Write tools: x_post_tweet, x_reply_tweet (trade journaling, community engagement)
- Posting guidelines: 1-3 posts/day max, data-driven only, never shill, never post credentials
- Handle: @AgentZERO_tc
- API tier: PAID — all 5 tools work

## Wallet

- Address: [populated after startup gate completes]
- Trading mode: [HARDENED/DEGEN — populated after startup]
- Tier: [starter/pro/enterprise — populated after startup]

## API Quirks & Lessons

(Add notes here as you learn about tool behavior, edge cases, rate limits, and patterns)

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
