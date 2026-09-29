const Groq = require('groq-sdk');

const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 30_000;
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
// Reasoning models (gpt-oss, qwen3, deepseek-r1…) spend part of max_tokens on
// hidden reasoning. With a small budget they can exhaust it before writing any
// answer, which comes back as empty content — so give them a larger floor and
// ask for low reasoning effort where the model supports it.
const IS_REASONING_MODEL = /gpt-oss|qwen3|deepseek-r1|reasoning/i.test(DEFAULT_GROQ_MODEL);
const REASONING_MIN_TOKENS = 2048;

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

async function callGroq(contents, systemInstruction, generationConfig = {}, apiKey = process.env.GROQ_API_KEY) {
  if (!apiKey) throw new Error('GROQ_NOT_CONFIGURED');

  const groq = new Groq({
    apiKey,
    timeout: GROQ_TIMEOUT_MS,
    // The SDK retries twice by default, which can stack 3× the timeout —
    // longer than the frontend or the serverless function will wait.
    maxRetries: 1,
  });
  const maxTokens = generationConfig.maxOutputTokens ?? 600;
  const request = {
    model: DEFAULT_GROQ_MODEL,
    messages: toGroqMessages(contents, systemInstruction),
    temperature: generationConfig.temperature ?? 0.4,
    max_tokens: IS_REASONING_MODEL ? Math.max(maxTokens, REASONING_MIN_TOKENS) : maxTokens,
  };
  if (/gpt-oss/i.test(DEFAULT_GROQ_MODEL)) request.reasoning_effort = 'low';
  const completion = await groq.chat.completions.create(request);

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('GROQ_EMPTY_RESPONSE');
  return text;
}

module.exports = { callGroq };
