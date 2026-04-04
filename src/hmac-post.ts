import crypto from "node:crypto";

function hashBody(raw: string) {
  return crypto.createHash("sha256").update(raw || "").digest("hex");
}

function buildSignaturePayload({
  method,
  path,
  timestamp,
  nonce,
  bodyHash,
}: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}) {
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n");
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/** POST /api/dashboard/agent-log-lines with OpenClaw HMAC headers (orchestrator must have OPENCLAW_DASHBOARD_SOCKET_ENABLED). */
export async function postDashboardLogLines(opts: {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  lines: string[];
}): Promise<unknown> {
  const path = "/api/dashboard/agent-log-lines";
  const body = JSON.stringify({ lines: opts.lines });
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyHash = hashBody(body);
  const payload = buildSignaturePayload({
    method: "POST",
    path,
    timestamp,
    nonce,
    bodyHash,
  });
  const signature = signPayload(payload, opts.apiSecret);
  const url = `${opts.baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-openclaw-key": opts.apiKey,
      "x-openclaw-signature": signature,
      "x-openclaw-timestamp": timestamp,
      "x-openclaw-nonce": nonce,
    },
    body,
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep raw text
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${String(text).slice(0, 240)}`);
  }
  return data;
}
