#!/usr/bin/env bash
# Upgrade solana-traderclaw + solana-traderclaw-cli to 1.0.147 on the trader gateway host.
# Run as the OpenClaw user on the target machine (default paths: /home/trader/.openclaw).
#
# See scripts/upgrades/README.md for the runbook index.

set -e

# =============================================================================
# 0. Kill switch — stop the gateway so we don't fight a re-register storm
# =============================================================================
echo '== Stopping gateway =='
systemctl --user stop openclaw-gateway.service || true
systemctl --user is-active openclaw-gateway.service || true

# =============================================================================
# 1. Snapshot current state (for rollback)
# =============================================================================
echo '== Snapshotting current install =='
PLUGIN_DIR=/home/trader/.openclaw/npm/node_modules/solana-traderclaw
TS=$(date +%Y%m%d-%H%M%S)
[ -d "$PLUGIN_DIR" ] && cp -a "$PLUGIN_DIR" "${PLUGIN_DIR}.bak-${TS}"
cp -a /home/trader/.openclaw/openclaw.json /home/trader/.openclaw/openclaw.json.bak-${TS}
[ -f /home/trader/.openclaw/cron/jobs.json ] && cp -a /home/trader/.openclaw/cron/jobs.json /home/trader/.openclaw/cron/jobs.json.bak-${TS}
[ -d /home/trader/.openclaw/workspace ] && cp -a /home/trader/.openclaw/workspace /home/trader/.openclaw/workspace.bak-${TS}
echo "Backed up to *.bak-${TS}"

echo '== Pre-upgrade plugin version =='
grep '"version"' "$PLUGIN_DIR/package.json" 2>/dev/null || echo '(no install yet)'

# =============================================================================
# 2. Upgrade the plugin via npm (openclaw-managed node_modules)
# =============================================================================
echo '== Installing solana-traderclaw@1.0.147 =='
cd /home/trader/.openclaw/npm && npm install solana-traderclaw@1.0.147

echo '== Post-upgrade plugin version =='
grep '"version"' "$PLUGIN_DIR/package.json"

echo '== Runtime fix markers in dist (expect >= 6) =='
grep -c 'lifetimeMessageCount\|alpha-buffer.v1\|alpha-lifetime.v1\|lifetimeUptimeSeconds\|OrchestratorRateLimitError\|Bootstrap aborted at' "$PLUGIN_DIR/dist/index.js"

echo '== Bootstrap docs shipped? =='
test -f "$PLUGIN_DIR/lib/status-queries.md" && echo "  lib/status-queries.md: OK ($(wc -c < "$PLUGIN_DIR/lib/status-queries.md") bytes)"
grep -c 'Live status questions\|STATUS_QUERIES' "$PLUGIN_DIR/skills/solana-trader/workspace/AGENTS.md" \
  && echo "  AGENTS.md anchor: present"

# =============================================================================
# 3. Upgrade the CLI (only if you installed it globally)
# =============================================================================
if command -v solana-traderclaw >/dev/null 2>&1 || [ -d /home/trader/.npm-global/lib/node_modules/solana-traderclaw-cli ]; then
  echo '== Upgrading CLI to 1.0.147 =='
  npm install -g solana-traderclaw-cli@1.0.147
fi

# =============================================================================
# 4. Restart gateway
# =============================================================================
echo '== Restarting gateway =='
systemctl --user start openclaw-gateway.service
sleep 8
systemctl --user is-active openclaw-gateway.service

echo '== Recent journal (expect single clean alpha subscribe, no "Disposing previous" storm) =='
journalctl --user -u openclaw-gateway.service --since '90s ago' --no-pager 2>/dev/null \
  | grep -E 'solana-trader|alpha-stream' | tail -25

echo '== Confirm bootstrap injects 6 files (was 5 in 1.0.146; STATUS_QUERIES.md is the 6th) =='
journalctl --user -u openclaw-gateway.service --since '90s ago' --no-pager 2>/dev/null \
  | grep -E 'Bootstrap: injected [0-9]+ files' | tail -3

# =============================================================================
# 5. Probe the tool to confirm lifetime fields are exposed
# =============================================================================
echo '== Live tool probe =='
TOKEN=$(grep -oE '"gatewayToken"\s*:\s*"[^"]+"' /home/trader/.openclaw/openclaw.json | head -1 | sed -E 's/.*"([^"]*)"$/\1/')
GW_PORT=$(grep -oE '"gatewayBaseUrl"\s*:\s*"http[^"]*"' /home/trader/.openclaw/openclaw.json | head -1 | grep -oE ':[0-9]+' | tr -d ':')
curl -fsS -m 5 -X POST "http://127.0.0.1:${GW_PORT:-18789}/tools/invoke" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"solana_alpha_signals","arguments":{"unseen":false}}' \
  | python3 -c "
import json,sys
r=json.loads(sys.stdin.read())
d=json.loads(r['result']['content'][0]['text'])['data']
s=d['stats']
required=['messageCount','currentWsMessageCount','lifetimeUptimeSeconds','firstConnectedAt']
print('subscribed:', d['subscribed'])
print('bufferSize:', d['bufferSize'])
for k in required: print(f'  {k}:', s.get(k))
missing=[k for k in required if k not in s]
print('OK ✓' if not missing else f'MISSING: {missing}')
"

echo '== DONE on target =='
echo "Rollback if needed: stop gateway, restore $PLUGIN_DIR from ${PLUGIN_DIR}.bak-${TS}, start gateway"
