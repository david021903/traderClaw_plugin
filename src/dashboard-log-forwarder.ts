import fs from "node:fs";
import { postDashboardLogLines } from "./hmac-post.js";

export type DashboardLogLogger = (message: string) => void;

/**
 * Tails a local OpenClaw log file and POSTs new lines to the orchestrator dashboard ingest (Approach A).
 * Requires OPENCLAW_DASHBOARD_SOCKET_ENABLED on the server and HMAC credentials.
 */
export function startDashboardLogForwarder(opts: {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  logPath: string;
  logger: DashboardLogLogger;
}): () => void {
  let position = 0;
  let lineCarry = "";
  const pending: string[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  const flush = () => {
    if (pending.length === 0) return;
    const chunk = pending.splice(0, 80);
    postDashboardLogLines({
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      apiSecret: opts.apiSecret,
      lines: chunk,
    })
      .then(() => {
        opts.logger(`[solana-trader] dashboard ingest: sent ${chunk.length} line(s)`);
      })
      .catch((err: unknown) => {
        opts.logger(
          `[solana-trader] dashboard ingest error: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  };

  const readNew = () => {
    fs.stat(opts.logPath, (err, st) => {
      if (err || !st) return;
      if (st.size < position) {
        position = 0;
        lineCarry = "";
      }
      if (st.size <= position) return;
      const stream = fs.createReadStream(opts.logPath, { start: position, end: st.size - 1 });
      let buf = "";
      stream.on("data", (c: string | Buffer) => {
        buf += typeof c === "string" ? c : c.toString("utf8");
      });
      stream.on("end", () => {
        position = st.size;
        const full = lineCarry + buf;
        const parts = full.split("\n");
        lineCarry = full.endsWith("\n") ? "" : (parts.pop() ?? "");
        for (const line of parts) {
          if (line.length > 0) pending.push(line);
        }
      });
    });
  };

  flushTimer = setInterval(flush, 2000);
  fs.watchFile(opts.logPath, { interval: 1000 }, readNew);
  readNew();
  opts.logger(`[solana-trader] dashboard log forwarder watching ${opts.logPath}`);

  return () => {
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = null;
    try {
      fs.unwatchFile(opts.logPath);
    } catch {
      // ignore
    }
    flush();
  };
}
