const { callGroq } = require('./groq.service');
const { callGemini } = require('./gemini.service');

function hasAiProvider() {
  return Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
}

function getConfiguredProvider() {
  if (process.env.GROQ_API_KEY) {
    return { provider: 'Groq', model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b' };
  }
  return { provider: 'Gemini', model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' };
}

async function callAIWithInfo(contents, systemInstruction, generationConfig = {}) {
  if (process.env.GROQ_API_KEY) {
    try {
      return {
        text: await callGroq(contents, systemInstruction, generationConfig),
        provider: 'Groq',
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      };
    } catch (err) {
      console.warn('Groq request failed; trying Gemini fallback:', err.message);
      if (!process.env.GEMINI_API_KEY) throw err;
    }
  }

  return {
    text: await callGemini(contents, systemInstruction, generationConfig),
    provider: 'Gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  };
}

async function callAI(contents, systemInstruction, generationConfig = {}) {
  const result = await callAIWithInfo(contents, systemInstruction, generationConfig);
  return result.text;
}

module.exports = { callAI, callAIWithInfo, getConfiguredProvider, hasAiProvider };
