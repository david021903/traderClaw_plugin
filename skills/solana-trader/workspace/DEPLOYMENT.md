# Workspace Template Deployment Guide

This file documents how workspace template files are deployed by the installer and the recommended openclaw.json heartbeat configuration. This file is NOT deployed to `~/.openclaw/workspace/` — it is reference documentation for installer development.

## Source and Destination Paths

| Plugin Variant | Source Directory | Destination |
|---|---|---|
| V1 Public | `skills/solana-trader/workspace/` | `~/.openclaw/workspace/` |
| V1 Team | `skills/solana-trader/workspace/` | `~/.openclaw/workspace/` |

## Files to Deploy

| File | Purpose | Overwrite Policy |
|---|---|---|
| `AGENTS.md` | Master operating manual | Overwrite only if content matches a known shipped template |
| `SOUL.md` | Agent personality/boundaries | Overwrite only if content matches a known shipped template |
| `IDENTITY.md` | Agent name/role/emoji | Overwrite only if content matches a known shipped template |
| `USER.md` | User profile | Never overwrite if file exists (user-customized) |
| `TOOLS.md` | Environment tool notes | Never overwrite if file exists (agent updates this at runtime) |
| `BOOTSTRAP.md` | First-run instructions | See special rules below |

## Overwrite Policy

The installer should follow the same pattern used by `deployHeartbeatTemplate()` in `installer-step-engine.mjs`:

1. If the destination file does not exist → copy the template.
2. If the destination file exists and its content matches a previously shipped template version → overwrite with the new version.
3. If the destination file exists and its content does NOT match any known shipped template → the user has customized it. Do NOT overwrite. Log a notice: `"Skipping {filename} — user-customized content detected."`

## BOOTSTRAP.md Special Rules

- Deploy BOOTSTRAP.md only on fresh installations (no existing `~/.openclaw/workspace/MEMORY.md` with content).
- If MEMORY.md exists and contains trading state (tier, wallet, mode), the agent has already completed first run — do NOT deploy BOOTSTRAP.md.
- If BOOTSTRAP.md already exists in the workspace, it means the agent's first run did not complete successfully. Leave it in place (or replace with latest version).

## openclaw.json Heartbeat Configuration

### V1 (Main Agent)

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "heartbeat": {
          "every": "30m",
          "target": "last",
          "isolatedSession": true
        }
      }
    ]
  }
}
```

### Configuration Notes

- **`isolatedSession: true`** — Each heartbeat starts a fresh session without raw conversation history from prior heartbeats. The agent still gets ALL workspace files (SOUL.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md, TOOLS.md) for full context. Continuity comes from MEMORY.md and daily logs, not from chat transcript. Without this, 48 heartbeats/day accumulate massive chat history (tokens and cost explode).

- **`lightContext: false`** (default — do NOT set this explicitly) — We WANT all workspace files loaded every heartbeat. The agent needs its soul, identity, memory, tools, and operating rules every cycle. Setting `lightContext: true` would strip these files and break the agent.

- **Do NOT set a custom `prompt`** — The default heartbeat prompt is: "Read HEARTBEAT.md if it exists, follow it strictly." This is exactly what we want. Our HEARTBEAT.md provides the complete trading cycle instructions. Setting a custom prompt would override this behavior.

- **`every: "30m"`** — 30-minute heartbeat interval. This gives the agent enough time to complete a full trading cycle before the next heartbeat fires.

- **`target: "last"`** — Send heartbeat output to the last contact (WhatsApp, Telegram, web chat — whatever the user last messaged from).
