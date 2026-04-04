import {
  postDashboardLogLines
} from "../chunk-WNMZF4S3.js";

// src/dashboard-log-forwarder.ts
import fs from "node:fs";
function startDashboardLogForwarder(opts) {
  let position = 0;
  let lineCarry = "";
  const pending = [];
  let flushTimer = null;
  const flush = () => {
    if (pending.length === 0) return;
    const chunk = pending.splice(0, 80);
    postDashboardLogLines({
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      apiSecret: opts.apiSecret,
      lines: chunk
    }).then(() => {
      opts.logger(`[solana-trader] dashboard ingest: sent ${chunk.length} line(s)`);
    }).catch((err) => {
      opts.logger(
        `[solana-trader] dashboard ingest error: ${err instanceof Error ? err.message : String(err)}`
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
      stream.on("data", (c) => {
        buf += typeof c === "string" ? c : c.toString("utf8");
      });
      stream.on("end", () => {
        position = st.size;
        const full = lineCarry + buf;
        const parts = full.split("\n");
        lineCarry = full.endsWith("\n") ? "" : parts.pop() ?? "";
        for (const line of parts) {
          if (line.length > 0) pending.push(line);
        }
      });
    });
  };
  flushTimer = setInterval(flush, 2e3);
  fs.watchFile(opts.logPath, { interval: 1e3 }, readNew);
  readNew();
  opts.logger(`[solana-trader] dashboard log forwarder watching ${opts.logPath}`);
  return () => {
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = null;
    try {
      fs.unwatchFile(opts.logPath);
    } catch {
    }
    flush();
  };
}
export {
  startDashboardLogForwarder
};
