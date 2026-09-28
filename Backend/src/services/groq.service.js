const Groq = require('groq-sdk');

const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 30_000;
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

function toGroqMessages(contents, systemInstruction) {
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

  for (const content of Array.isArray(contents) ? contents : []) {
    const role = content?.role === 'model' ? 'assistant' : 'user';
    const text = Array.isArray(content?.parts)
      ? content.parts.map((part) => part?.text || '').join('')
      : '';
    if (text.trim()) messages.push({ role, content: text });
  }

  return messages;
}

async function callGroq(contents, systemInstruction, generationConfig = {}) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_NOT_CONFIGURED');

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: GROQ_TIMEOUT_MS,
  });
  const completion = await groq.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    messages: toGroqMessages(contents, systemInstruction),
    temperature: generationConfig.temperature ?? 0.4,
    max_tokens: generationConfig.maxOutputTokens ?? 600,
  });

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('GROQ_EMPTY_RESPONSE');
  return text;
}

module.exports = { callGroq };
