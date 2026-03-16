import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".openclaw");
const CONFIG_FILE = join(CONFIG_DIR, "openclaw.json");

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

function getCommandOutput(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], shell: true }).trim();
  } catch {
    return null;
  }
}

function extractUrls(text = "") {
  const matches = text.match(/https?:\/\/[^\s"')]+/g);
  return matches ? [...new Set(matches)] : [];
}

function runCommandWithEvents(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "pipe",
      shell: true,
      ...opts,
    });

    let stdout = "";
    let stderr = "";
    const onEvent = typeof opts.onEvent === "function" ? opts.onEvent : null;
    const emit = (event) => onEvent && onEvent(event);

    child.stdout?.on("data", (d) => {
      const text = d.toString();
      stdout += text;
      emit({ type: "stdout", text, urls: extractUrls(text) });
    });

    child.stderr?.on("data", (d) => {
      const text = d.toString();
      stderr += text;
      emit({ type: "stderr", text, urls: extractUrls(text) });
    });

    child.on("close", (code) => {
      const urls = [...new Set([...extractUrls(stdout), ...extractUrls(stderr)])];
      if (code === 0) resolve({ stdout, stderr, code, urls });
      else {
        const err = new Error(`command failed with exit code ${code}`);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        err.urls = urls;
        reject(err);
      }
    });
    child.on("error", reject);
  });
}

async function installOpenClawPlatform() {
  if (commandExists("openclaw")) {
    return { alreadyInstalled: true, version: getCommandOutput("openclaw --version") };
  }
  await runCommandWithEvents("npm", ["install", "-g", "openclaw"]);
  return { alreadyInstalled: false, installed: true, available: commandExists("openclaw") };
}

async function installPlugin(modeConfig) {
  await runCommandWithEvents("npm", ["install", "-g", modeConfig.pluginPackage]);
  return { installed: true, available: commandExists(modeConfig.cliName) };
}

function ensureOpenResponsesEnabled(configPath = CONFIG_FILE) {
  let config = {};
  try {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    config = {};
  }

  if (!config.gateway) config.gateway = {};
  if (!config.gateway.http) config.gateway.http = {};
  if (!config.gateway.http.endpoints) config.gateway.http.endpoints = {};
  if (!config.gateway.http.endpoints.responses) config.gateway.http.endpoints.responses = {};
  config.gateway.http.endpoints.responses.enabled = true;

  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  return configPath;
}

async function runSetupWizard(modeConfig, options = {}) {
  if (!commandExists(modeConfig.cliName)) return { ran: false, reason: "cli_not_found" };
  const args = ["setup", "--url", options.orchestratorUrl || "https://api.traderclaw.ai"];
  if (options.apiKey) args.push("--api-key", options.apiKey);
  else args.push("--signup");

  if (options.gatewayBaseUrl && options.gatewayToken) {
    args.push("--gateway-base-url", options.gatewayBaseUrl, "--gateway-token", options.gatewayToken);
  } else if (options.skipGatewayRegistration) {
    args.push("--skip-gateway-registration");
  }

  try {
    await runCommandWithEvents(modeConfig.cliName, args, {
      onEvent: options.onEvent,
    });
    return { ran: true, success: true };
  } catch {
    return { ran: true, success: false };
  }
}

async function restartGateway() {
  if (!commandExists("openclaw")) return { ran: false };
  try {
    await runCommandWithEvents("openclaw", ["gateway", "restart"]);
    return { ran: true, success: true };
  } catch {
    return { ran: true, success: false };
  }
}

function deployGatewayConfig(modeConfig) {
  const gatewayDir = join(CONFIG_DIR, "gateway");
  mkdirSync(gatewayDir, { recursive: true });
  const destFile = join(gatewayDir, modeConfig.gatewayConfig);
  const npmRoot = getCommandOutput("npm root -g");
  if (!npmRoot) return { deployed: false, dest: destFile };
  const src = join(npmRoot, modeConfig.pluginPackage, "config", modeConfig.gatewayConfig);
  if (!existsSync(src)) return { deployed: false, dest: destFile };
  writeFileSync(destFile, readFileSync(src));
  return { deployed: true, source: src, dest: destFile };
}

function verifyInstallation(modeConfig, apiKey) {
  const gatewayFile = join(CONFIG_DIR, "gateway", modeConfig.gatewayConfig);
  return [
    { label: "OpenClaw platform", ok: commandExists("openclaw"), note: "not in PATH" },
    { label: `Trading CLI (${modeConfig.cliName})`, ok: commandExists(modeConfig.cliName), note: "not in PATH" },
    { label: "Configuration file", ok: existsSync(CONFIG_FILE), note: "not created" },
    { label: "Gateway configuration", ok: existsSync(gatewayFile), note: "not found" },
    { label: "API key configured", ok: !!apiKey, note: "needs setup" },
  ];
}

function nowIso() {
  return new Date().toISOString();
}

const URL_REGEX = /https?:\/\/[^\s"')]+/g;
function firstUrl(text = "") {
  const found = text.match(URL_REGEX);
  return found?.[0] || null;
}

function normalizeLane(input) {
  return input === "event-driven" ? "event-driven" : "quick-local";
}

export class InstallerStepEngine {
  constructor(modeConfig, options = {}, hooks = {}) {
    this.modeConfig = modeConfig;
    this.options = {
      lane: normalizeLane(options.lane),
      apiKey: options.apiKey || "",
      orchestratorUrl: options.orchestratorUrl || "https://api.traderclaw.ai",
      gatewayBaseUrl: options.gatewayBaseUrl || "",
      gatewayToken: options.gatewayToken || "",
      enableTelegram: options.enableTelegram === true,
      telegramToken: options.telegramToken || "",
      autoInstallDeps: options.autoInstallDeps !== false,
      skipPreflight: options.skipPreflight === true,
      skipInstallOpenClaw: options.skipInstallOpenClaw === true,
      skipInstallPlugin: options.skipInstallPlugin === true,
      skipTailscale: options.skipTailscale === true,
      skipGatewayBootstrap: options.skipGatewayBootstrap === true,
      skipGatewayConfig: options.skipGatewayConfig === true,
    };
    this.hooks = {
      onStepEvent: typeof hooks.onStepEvent === "function" ? hooks.onStepEvent : () => {},
      onLog: typeof hooks.onLog === "function" ? hooks.onLog : () => {},
    };
    this.state = {
      startedAt: null,
      completedAt: null,
      status: "idle",
      errors: [],
      detected: { funnelUrl: null, tailscaleApprovalUrl: null },
      stepResults: [],
      verifyChecks: [],
    };
  }

  emitStep(stepId, status, detail = "") {
    this.hooks.onStepEvent({ at: nowIso(), stepId, status, detail });
  }

  emitLog(stepId, level, text, urls = []) {
    this.hooks.onLog({ at: nowIso(), stepId, level, text, urls });
  }

  async runStep(stepId, title, handler) {
    this.emitStep(stepId, "in_progress", title);
    const startedAt = nowIso();
    try {
      const result = await handler();
      this.state.stepResults.push({ stepId, title, status: "completed", startedAt, completedAt: nowIso(), result });
      this.emitStep(stepId, "completed", title);
      return result;
    } catch (err) {
      const detail = err?.message || String(err);
      this.state.stepResults.push({ stepId, title, status: "failed", startedAt, completedAt: nowIso(), error: detail });
      this.state.errors.push({ stepId, error: detail });
      this.emitStep(stepId, "failed", detail);
      throw err;
    }
  }

  async ensureTailscale() {
    if (commandExists("tailscale")) return { installed: true, alreadyInstalled: true };
    if (!this.options.autoInstallDeps) throw new Error("tailscale missing and auto-install disabled");
    await runCommandWithEvents("bash", ["-lc", "curl -fsSL https://tailscale.com/install.sh | sh"], {
      onEvent: (evt) => this.emitLog("tailscale", evt.type === "stderr" ? "warn" : "info", evt.text, evt.urls || []),
    });
    return { installed: true, alreadyInstalled: false };
  }

  async runTailscaleUp() {
    const result = await runCommandWithEvents("tailscale", ["up"], {
      onEvent: (evt) => {
        const url = firstUrl(evt.text);
        if (url && !this.state.detected.tailscaleApprovalUrl) this.state.detected.tailscaleApprovalUrl = url;
        this.emitLog("tailscale_up", evt.type === "stderr" ? "warn" : "info", evt.text, evt.urls || []);
      },
    });
    return { ok: true, approvalUrl: this.state.detected.tailscaleApprovalUrl, urls: result.urls || [] };
  }

  async runFunnel() {
    await runCommandWithEvents("tailscale", ["funnel", "--bg", "18789"], {
      onEvent: (evt) => this.emitLog("funnel", evt.type === "stderr" ? "warn" : "info", evt.text, evt.urls || []),
    });
    const statusOut = getCommandOutput("tailscale funnel status") || "";
    const funnelUrl = firstUrl(statusOut);
    if (funnelUrl) this.state.detected.funnelUrl = funnelUrl;
    this.emitLog("funnel", "info", statusOut);
    return { funnelUrl };
  }

  async runTelegramStep() {
    if (!this.options.enableTelegram) return { skipped: true, reason: "telegram_not_requested" };
    if (!this.options.telegramToken) return { skipped: true, reason: "telegram_token_missing" };
    await runCommandWithEvents("openclaw", ["plugins", "enable", "telegram"]);
    await runCommandWithEvents("openclaw", ["channels", "add", "--channel", "telegram", "--token", this.options.telegramToken]);
    await runCommandWithEvents("openclaw", ["channels", "status", "--probe"]);
    return { configured: true };
  }

  async runAll() {
    this.state.status = "running";
    this.state.startedAt = nowIso();
    try {
      if (!this.options.skipPreflight) {
        await this.runStep("preflight", "Checking prerequisites", async () => {
          if (!commandExists("node") || !commandExists("npm")) throw new Error("node and npm are required");
          return { node: true, npm: true, openclaw: commandExists("openclaw"), tailscale: commandExists("tailscale") };
        });
      }

      if (!this.options.skipInstallOpenClaw) {
        await this.runStep("install_openclaw", "Installing OpenClaw platform", async () => installOpenClawPlatform());
      }
      if (!this.options.skipInstallPlugin) {
        await this.runStep("install_plugin", "Installing TraderClaw plugin package", async () => installPlugin(this.modeConfig));
      }
      if (!this.options.skipTailscale) {
        await this.runStep("tailscale_install", "Ensuring Tailscale is installed", async () => this.ensureTailscale());
        await this.runStep("tailscale_up", "Connecting Tailscale", async () => this.runTailscaleUp());
      }
      if (!this.options.skipGatewayBootstrap) {
        await this.runStep("gateway_bootstrap", "Starting OpenClaw gateway and Funnel", async () => {
          await runCommandWithEvents("openclaw", ["gateway", "install"]);
          await runCommandWithEvents("openclaw", ["gateway", "restart"]);
          return this.runFunnel();
        });
      }

      await this.runStep("enable_responses", "Enabling /v1/responses endpoint", async () => {
        const configPath = ensureOpenResponsesEnabled(CONFIG_FILE);
        const restart = await restartGateway();
        return { configPath, restart };
      });

      await this.runStep("setup", "Running traderclaw setup", async () => {
        const gatewayBaseUrl = this.options.gatewayBaseUrl || this.state.detected.funnelUrl || "";
        return runSetupWizard(this.modeConfig, {
          apiKey: this.options.apiKey,
          orchestratorUrl: this.options.orchestratorUrl,
          gatewayBaseUrl: this.options.lane === "event-driven" ? gatewayBaseUrl : "",
          gatewayToken: this.options.lane === "event-driven" ? this.options.gatewayToken : "",
          skipGatewayRegistration: this.options.lane !== "event-driven",
          onEvent: (evt) => this.emitLog("setup", evt.type === "stderr" ? "warn" : "info", evt.text, evt.urls || []),
        });
      });

      if (!this.options.skipGatewayConfig) {
        await this.runStep("gateway_config", "Deploying gateway config and restarting", async () => {
          const deploy = deployGatewayConfig(this.modeConfig);
          const restart = await restartGateway();
          return { deploy, restart };
        });
      }

      await this.runStep("telegram_optional", "Optional Telegram setup", async () => this.runTelegramStep());
      await this.runStep("verify", "Verifying installation", async () => {
        const checks = verifyInstallation(this.modeConfig, this.options.apiKey);
        this.state.verifyChecks = checks;
        return { checks };
      });

      this.state.status = "completed";
      this.state.completedAt = nowIso();
      return this.state;
    } catch (err) {
      this.state.status = "failed";
      this.state.completedAt = nowIso();
      this.state.errors.push({ stepId: "runtime", error: err?.message || String(err) });
      return this.state;
    }
  }
}

export function createInstallerStepEngine(modeConfig, options = {}, hooks = {}) {
  return new InstallerStepEngine(modeConfig, options, hooks);
}
