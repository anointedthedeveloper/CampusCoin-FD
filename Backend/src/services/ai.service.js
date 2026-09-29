const { callGroq } = require('./groq.service');
const { callGemini } = require('./gemini.service');

// Several keys per provider can be configured (comma-separated):
//   GROQ_API_KEYS=key1,key2,key3   (GROQ_API_KEY also still works)
//   GEMINI_API_KEYS=keyA,keyB      (GEMINI_API_KEY also still works)
// Each request tries Groq keys first, then Gemini keys. A key that fails
// (rate limit, quota, invalid, timeout, 5xx) is skipped for a cool-down
// period so the next request goes straight to a healthy key.
const COOLDOWN_MS = Number(process.env.AI_KEY_COOLDOWN_MS) || 5 * 60 * 1000;
const cooldownUntil = new Map();

function parseKeys(listVar, singleVar) {
  const keys = [
    ...(process.env[listVar] || '').split(','),
    process.env[singleVar] || '',
  ].map((k) => k.trim()).filter(Boolean);
  return [...new Set(keys)];
}

function providers() {
  return [
    {
      name: 'Groq',
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      keys: parseKeys('GROQ_API_KEYS', 'GROQ_API_KEY'),
      call: callGroq,
    },
    {
      name: 'Gemini',
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      keys: parseKeys('GEMINI_API_KEYS', 'GEMINI_API_KEY'),
      call: callGemini,
    },
  ].filter((p) => p.keys.length > 0);
}

function hasAiProvider() {
  return providers().length > 0;
}

function getConfiguredProvider() {
  const first = providers()[0];
  return first ? { provider: first.name, model: first.model } : { provider: 'none', model: 'none' };
}

/** Number of configured keys per provider (for the health endpoint). */
function getKeyCounts() {
  return Object.fromEntries(providers().map((p) => [p.name.toLowerCase(), p.keys.length]));
}

function keyId(provider, key) {
  return `${provider}:${key.slice(-6)}`;
}

async function callAIWithInfo(contents, systemInstruction, generationConfig = {}) {
  const available = providers();
  if (!available.length) throw new Error('GEMINI_NOT_CONFIGURED');

  const attempts = [];
  for (const provider of available) {
    // Healthy keys first; cooled-down keys only as a last resort.
    const now = Date.now();
    const ordered = [
      ...provider.keys.filter((k) => (cooldownUntil.get(keyId(provider.name, k)) ?? 0) <= now),
      ...provider.keys.filter((k) => (cooldownUntil.get(keyId(provider.name, k)) ?? 0) > now),
    ];
    for (const key of ordered) {
      try {
        const text = await provider.call(contents, systemInstruction, generationConfig, key);
        cooldownUntil.delete(keyId(provider.name, key));
        return { text, provider: provider.name, model: provider.model };
      } catch (err) {
        cooldownUntil.set(keyId(provider.name, key), Date.now() + COOLDOWN_MS);
        attempts.push(err);
        console.warn(`${provider.name} key …${key.slice(-4)} failed; trying the next one:`, err.message);
      }
    }
  }
  // Re-throw the last error so callers can map it (timeout, 502, …).
  throw attempts[attempts.length - 1];
}

async function callAI(contents, systemInstruction, generationConfig = {}) {
  const result = await callAIWithInfo(contents, systemInstruction, generationConfig);
  return result.text;
}

module.exports = { callAI, callAIWithInfo, getConfiguredProvider, hasAiProvider, getKeyCounts };
