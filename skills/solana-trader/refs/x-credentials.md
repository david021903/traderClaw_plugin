# X/Twitter API Credentials Setup

> Reference for configuring X/Twitter API access for social research tools.

## API Tier Requirements

| Tier | Cost | Read Access | Write Access | Search Limit | Use For |
|------|------|-------------|--------------|--------------|---------|
| Free | $0/mo | No | Yes (1,500 posts/mo) | No | Posting only (not sufficient for research) |
| Basic | $200/mo | Yes | Yes | 10,000 tweets/mo | Full social research |
| Pay-as-you-go | Per-credit | Yes | Yes | Per-credit | Full social research (recommended) |

**Minimum for social research: Pay-as-you-go tier.** Free tier cannot search or read tweets — only post. The social research tools (`x_search_tweets`, `x_read_mentions`, `x_get_thread`) require read access.

## Setup Steps

### 1. Create X Developer Account
1. Go to [developer.x.com](https://developer.x.com)
2. Sign up / apply for a developer account
3. Create a new Project and App in the Developer Portal

### 2. Generate OAuth 1.0a Credentials
1. In your App settings, go to "Keys and Tokens"
2. Generate or regenerate:
   - **Consumer Key** (API Key)
   - **Consumer Secret** (API Key Secret)
   - **Access Token**
   - **Access Token Secret**
3. Ensure the App has **Read** permissions at minimum (Read+Write if you plan to use posting tools in the team plugin later)
4. If you change permissions, you MUST regenerate the Access Token + Secret — old tokens retain the old permissions

### 3. Configure in Plugin

**Option A — Plugin config (openclaw.json):**
```json
{
  "plugins": {
    "entries": {
      "solana-trader": {
        "enabled": true,
        "config": {
          "orchestratorUrl": "...",
          "apiKey": "...",
          "x": {
            "consumerKey": "YOUR_CONSUMER_KEY",
            "consumerSecret": "YOUR_CONSUMER_SECRET",
            "profiles": {
              "default": {
                "accessToken": "YOUR_ACCESS_TOKEN",
                "accessTokenSecret": "YOUR_ACCESS_TOKEN_SECRET",
                "userId": "YOUR_X_USER_ID",
                "username": "your_x_handle"
              }
            }
          }
        }
      }
    }
  }
}
```

Profile resolution: agent-specific profile → `default` profile → error. For V1 (solo agent), a single `default` profile is sufficient.

**Option B — Environment variables:**
```bash
X_CONSUMER_KEY=your_consumer_key
X_CONSUMER_SECRET=your_consumer_secret
X_ACCESS_TOKEN_DEFAULT=your_access_token
X_ACCESS_TOKEN_DEFAULT_SECRET=your_access_token_secret
```

The plugin checks config first, then falls back to environment variables.

### 4. Verify

After configuring, the plugin logs at startup:
```
[solana-trader] Registered 3 X/Twitter read tools (search, mentions, threads). Profiles: main
```

If X credentials are missing or invalid, social tools return errors and the agent skips social analysis — it continues trading using on-chain data and alpha signals alone.

## Rate Limits

- Pay-as-you-go: Per-credit pricing. Set spending caps in your X developer dashboard to avoid unexpected charges.
- Basic: 10,000 tweets/month for search. Monitor usage in the developer portal.
- If rate limited (HTTP 429), the tool returns a `resetAt` timestamp. The agent should wait until then before making more X API calls.

## Security

- Credentials are loaded at plugin startup and used internally to sign API requests
- The agent never sees credential values — only tool results (tweet data, search results)
- Never include API keys, tokens, or secrets in tool responses, logs, or conversation output
- Error messages reference config structure ("set x.consumerKey") but never include actual values

## Future: OAuth 2.0 PKCE

A future version will support OAuth 2.0 PKCE (Proof Key for Code Exchange) for user-authorized access without sharing long-lived tokens. This is not yet built — use OAuth 1.0a credentials as described above.
