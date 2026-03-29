/**
 * Ranks OpenClaw model keys so defaults pick current, working IDs — not alphabetically-first
 * or legacy IDs that "win" only because of a large YYYYMMDD suffix in the name.
 *
 * References (verify periodically): Anthropic models overview, OpenAI models docs, xAI docs.
 * Last verified: 2026-03-29.
 */

/** IDs that appear in catalogs but are retired, deprecated, or misbehave for chat/agent use */
export const KNOWN_PROBLEMATIC_MODEL_IDS = new Set([
  "anthropic/claude-3-5-haiku-20241022",
  "anthropic/claude-3-haiku-20240307",
  "anthropic/claude-3-opus-20240229",
  "anthropic/claude-3-sonnet-20240229",
  "anthropic/claude-3-5-sonnet-20240620",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4-turbo",
  "openai/gpt-4",
  "openai/gpt-3.5-turbo",
  "openai/gpt-5",
  "openai/gpt-5.1",
  "openai/gpt-5.1-codex",
  "openai/gpt-5.1-codex-max",
  "openai/gpt-5.1-codex-mini",
  "openai/gpt-5.1-instant",
  "openai-codex/gpt-5.1",
  "openai-codex/gpt-5.1-codex",
  "openai-codex/gpt-5.1-codex-max",
  "openai-codex/gpt-5.1-codex-mini",
]);

const VARIANT_WEIGHT = { sonnet: 80_000, opus: 60_000, haiku: 40_000 };

function tieBreakerSnapshot(id) {
  const m = String(id).match(/-(\d{8})$/);
  if (!m) return 0;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : 0;
}

function stripPrefix(provider, modelId) {
  const p = `${provider}/`;
  const s = String(modelId);
  return s.toLowerCase().startsWith(p) ? s.slice(p.length).toLowerCase() : s.toLowerCase();
}

/**
 * Parse Anthropic API-style ids (after provider prefix): claude-sonnet-4-6, claude-3-5-sonnet-20241022, etc.
 */
function parseAnthropicLocal(local) {
  let m = local.match(/^claude-(opus|sonnet|haiku)-(\d+)-(\d+)(?:-(\d{8}))?$/);
  if (m) {
    return {
      variant: m[1],
      major: Number(m[2]),
      minor: Number(m[3]),
      snapshot: m[4] ? Number(m[4]) : 0,
    };
  }
  m = local.match(/^claude-3-5-(opus|sonnet|haiku)-(\d{8})$/);
  if (m) {
    return { variant: m[1], major: 3, minor: 5, snapshot: Number(m[2]) };
  }
  m = local.match(/^claude-3-(opus|sonnet|haiku)-(\d{8})$/);
  if (m) {
    return { variant: m[1], major: 3, minor: 0, snapshot: Number(m[2]) };
  }
  return null;
}

function anthropicPreferenceScore(modelId) {
  const local = stripPrefix("anthropic", modelId);
  const meta = parseAnthropicLocal(local);
  if (!meta) {
    return 1_000_000 + tieBreakerSnapshot(local);
  }
  const generation = meta.major * 10_000 + meta.minor;
  const v = VARIANT_WEIGHT[meta.variant] || 0;
  return generation * 1_000_000_000_000 + v + meta.snapshot;
}

function openaiFamilyScore(local) {
  const g5 = local.match(/^gpt-5(?:\.(\d+))?/);
  if (g5) {
    const sub = g5[1] ? Number.parseInt(g5[1], 10) : 0;
    let s = 500 * 1_000_000_000 + sub * 1_000_000;
    if (local.includes("pro") || local.includes("thinking")) s += 400_000;
    else if (local.includes("nano")) s -= 200_000;
    else if (local.includes("mini")) s -= 100_000;
    else if (local.includes("instant")) s -= 150_000;
    return s;
  }
  const oSeries = local.match(/^o(\d+)/);
  if (oSeries) {
    const gen = Number.parseInt(oSeries[1], 10);
    let score = 490 * 1_000_000_000 + gen * 1_000_000;
    if (local.includes("mini")) score -= 500_000;
    if (local.includes("pro")) score += 200_000;
    return score;
  }
  if (local.startsWith("gpt-4o-mini")) return 380 * 1_000_000_000;
  if (local.startsWith("gpt-4o")) return 385 * 1_000_000_000;
  if (local.includes("gpt-4-turbo")) return 370 * 1_000_000_000;
  if (local.startsWith("gpt-4")) return 360 * 1_000_000_000;
  if (local.includes("gpt-3.5")) return 250 * 1_000_000_000;
  return 100 * 1_000_000_000;
}

function openaiPreferenceScore(modelId) {
  const raw = String(modelId).toLowerCase();
  const local = raw.includes("/") ? raw.split("/").slice(1).join("/") : raw;
  let score = openaiFamilyScore(local);
  score += tieBreakerSnapshot(local);
  if (local.includes("preview")) score -= 50_000_000;
  return score;
}

function genericPreferenceScore(provider, modelId) {
  const local = stripPrefix(provider, modelId);
  let score = tieBreakerSnapshot(modelId);
  if (local.includes("latest")) score += 500_000_000;
  if (local.includes("preview") || local.includes("deprecated")) score -= 200_000_000;
  return score;
}

/**
 * Higher = more preferred as default.
 */
export function modelPreferenceScore(provider, modelId) {
  const id = String(modelId);
  let score = 0;

  if (KNOWN_PROBLEMATIC_MODEL_IDS.has(id)) {
    score -= 10_000_000_000_000;
  }

  if (provider === "anthropic") {
    score += anthropicPreferenceScore(id);
  } else if (provider === "openai" || provider === "openai-codex") {
    score += openaiPreferenceScore(id);
  } else {
    score += genericPreferenceScore(provider, id);
  }

  return score;
}

/**
 * Best-first order for dropdowns and validation.
 */
export function sortModelsByPreference(provider, modelIds) {
  const items = [...new Set((modelIds || []).filter(Boolean))];
  return items.sort(
    (a, b) => modelPreferenceScore(provider, b) - modelPreferenceScore(provider, a) || String(a).localeCompare(String(b)),
  );
}

export function choosePreferredProviderModel(provider, models = []) {
  const items = Array.isArray(models) ? models.filter(Boolean) : [];
  if (items.length === 0) return "";
  const sorted = sortModelsByPreference(provider, items);
  return sorted[0] || items[0];
}
