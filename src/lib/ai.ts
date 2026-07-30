import type { AIComment, NumberedParagraph, Persona, Settings, Thread, UserPersona } from './types';
import { renderSystemPrompt } from './prompts';

const TIMEOUT_MS = 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ChatMessage { role: string; content: string }

export async function callChat(settings: Settings, messages: ChatMessage[]): Promise<string> {
  const targetUrl = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  // When a CORS proxy is configured, route the request through it.
  // Query-param style: <proxyUrl>?url=<absolute-target-url>
  const proxyBase = settings.proxyUrl?.trim().replace(/\/+$/, '');
  const url = proxyBase ? `${proxyBase}?url=${encodeURIComponent(targetUrl)}` : targetUrl;
  let lastError: Error = new Error('NETWORK_ERROR');
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: settings.model, messages, temperature: 0.8 }),
        signal: controller.signal,
      });
      if (res.status === 429 && attempt < 2) {
        await sleep(attempt === 0 ? 1000 : 3000);
        continue;
      }
      if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('API_BAD_RESPONSE');
      return content;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('NETWORK_ERROR');
      if (e.name === 'AbortError') throw new Error('TIMEOUT');
      if (e.message.startsWith('API_ERROR_') || e.message === 'API_BAD_RESPONSE') throw e;
      // TypeErrors (e.g. "Failed to fetch") are typically CORS blocks or network unreachable
      if (e.name === 'TypeError') throw new Error('CORS_NETWORK_ERROR');
      lastError = e; // network failure — loop retries
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export function extractJson(content: string): AIComment[] {
  const cleaned = content.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('NO_JSON');
  let parsed: { comments?: unknown };
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error('NO_JSON');
  }
  if (!Array.isArray(parsed.comments)) throw new Error('BAD_SHAPE');
  return (parsed.comments as unknown[]).flatMap((c) => {
    if (typeof c !== 'object' || c === null) return [];
    const r = c as Record<string, unknown>;
    if (typeof r.persona_id === 'string' && typeof r.paragraph_index === 'number' && typeof r.text === 'string') {
      return [{ personaId: r.persona_id, paragraphIndex: r.paragraph_index, text: r.text }];
    }
    return [];
  });
}

export async function sendToPersonas(
  excerpt: NumberedParagraph[],
  personas: Persona[],
  settings: Settings,
  userPersona?: UserPersona,
): Promise<AIComment[]> {
  const system = renderSystemPrompt(settings.systemPromptTemplate, personas, userPersona);
  const passage = excerpt.map((p) => `[${p.index}] ${p.text}`).join('\n\n');
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: `Passage (paragraphs are numbered):\n\n${passage}` },
  ];
  const first = await callChat(settings, messages);
  try {
    return extractJson(first);
  } catch {
    const retry = await callChat(settings, [
      ...messages,
      { role: 'assistant', content: first },
      { role: 'user', content: 'Return valid JSON only, no other text.' },
    ]);
    return extractJson(retry);
  }
}

export async function continueWithPersona(
  thread: Thread,
  persona: Persona,
  question: string,
  settings: Settings,
  userPersona?: UserPersona,
): Promise<string> {
  const readerContext = userPersona
    ? `\nThe reader is ${userPersona.name}. Their personality is: ${userPersona.personality}`
    : '';
  const system = `You are ${persona.name}, the user's reading companion.
Stay fully in character using this description: ${persona.characterDescription}
Reply naturally in ${persona.language}. Answer the user's follow-up about the book passage.
Do not return JSON and do not mention being an AI.${readerContext}`;
  const passage = thread.selectedText.length > 12_000
    ? `…${thread.selectedText.slice(-12_000)}`
    : thread.selectedText;
  const history: ChatMessage[] = thread.comments
    .filter((comment) => comment.role === 'user' || comment.personaId === persona.id)
    .slice(-12)
    .map((comment) => ({
      role: comment.role === 'user' ? 'user' : 'assistant',
      content: comment.text,
    }));
  const answer = await callChat(settings, [
    { role: 'system', content: system },
    { role: 'user', content: `Book passage:\n\n${passage}` },
    ...history,
    { role: 'user', content: question.trim() },
  ]);
  const trimmed = answer.trim();
  if (!trimmed) throw new Error('API_BAD_RESPONSE');
  return trimmed;
}
