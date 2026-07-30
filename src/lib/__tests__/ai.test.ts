import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { continueWithPersona, extractJson, sendToPersonas } from '@/lib/ai';
import type { NumberedParagraph, Persona, Settings, Thread, UserPersona } from '@/lib/types';

const settings: Settings = { baseUrl: 'https://api.test/v1', apiKey: 'k', model: 'm', systemPromptTemplate: 'P: {{personas}}', proxyUrl: '', language: 'en' };
const persona: Persona = { id: 'p1', name: 'Holmes', avatar: '', characterDescription: 'witty', language: 'English', isDefault: false, createdAt: 0 };
const excerpt: NumberedParagraph[] = [{ index: 0, pid: '0:0', text: 'Hello.' }];

function apiResponse(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"comments":[{"persona_id":"p1","paragraph_index":0,"text":"ha"}]}'))
      .toEqual([{ personaId: 'p1', paragraphIndex: 0, text: 'ha' }]);
  });
  it('parses fenced JSON', () => {
    expect(extractJson('```json\n{"comments":[{"persona_id":"p1","paragraph_index":2,"text":"nice"}]}\n```'))
      .toEqual([{ personaId: 'p1', paragraphIndex: 2, text: 'nice' }]);
  });
  it('parses JSON embedded in prose', () => {
    expect(extractJson('Sure! Here you go:\n{"comments":[]}\nHope that helps.')).toEqual([]);
  });
  it('throws on garbage and bad shape', () => {
    expect(() => extractJson('no json here')).toThrow();
    expect(() => extractJson('{"result":[]}')).toThrow();
  });
  it('drops malformed comment entries', () => {
    const out = extractJson('{"comments":[{"persona_id":"p1","paragraph_index":0,"text":"ok"},{"bad":true}]}');
    expect(out).toHaveLength(1);
  });
});

describe('sendToPersonas', () => {
  it('sends system+user messages and maps the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse('{"comments":[{"persona_id":"p1","paragraph_index":0,"text":"Elementary."}]}'));
    vi.stubGlobal('fetch', fetchMock);
    const out = await sendToPersonas(excerpt, [persona], settings);
    expect(out).toEqual([{ personaId: 'p1', paragraphIndex: 0, text: 'Elementary.' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/v1/chat/completions');
    const body = JSON.parse(init.body as string);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('Holmes');
    expect(body.messages[1].content).toContain('[0] Hello.');
  });

  it('retries once on malformed JSON', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse('I cannot do that'))
      .mockResolvedValueOnce(apiResponse('{"comments":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const out = await sendToPersonas(excerpt, [persona], settings);
    expect(out).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 with backoff then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse('rate limited', 429))
      .mockResolvedValueOnce(apiResponse('{"comments":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const promise = sendToPersonas(excerpt, [persona], settings);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws on persistent non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse('nope', 500)));
    await expect(sendToPersonas(excerpt, [persona], settings)).rejects.toThrow('API_ERROR_500');
  });

  it('routes through proxy when proxyUrl is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse('{"comments":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const proxiedSettings = { ...settings, proxyUrl: 'http://localhost:8787' };
    await sendToPersonas(excerpt, [persona], proxiedSettings);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8787?url=https%3A%2F%2Fapi.test%2Fv1%2Fchat%2Fcompletions');
  });

  it('passes user persona context into the system message when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse('{"comments":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const user: UserPersona = { id: 'u1', name: 'Alice', personality: 'Curious reader.', createdAt: 0 };
    await sendToPersonas(excerpt, [persona], settings, user);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messages[0].content).toContain('The reader you are conversing with');
    expect(body.messages[0].content).toContain('Alice');
  });
});

describe('continueWithPersona', () => {
  it('keeps the passage and the selected companion conversation in context', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse('Because the detail is suspicious.'));
    vi.stubGlobal('fetch', fetchMock);
    const thread: Thread = {
      id: 't1',
      bookId: 'b1',
      chapterId: '0',
      paragraphId: '0:0',
      selectedText: 'The door was locked from the inside.',
      comments: [
        { personaId: 'p1', text: 'That lock is the key clue.' },
        { role: 'user', text: 'What makes it important?' },
      ],
      createdAt: 1,
    };

    await expect(continueWithPersona(thread, persona, 'Could it be staged?', settings))
      .resolves.toBe('Because the detail is suspicious.');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messages[0].content).toContain('Holmes');
    expect(body.messages[1].content).toContain('The door was locked');
    expect(body.messages.at(-1).content).toBe('Could it be staged?');
  });

  it('keeps only the selected companion and the latest 12 conversation messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse('A focused answer.'));
    vi.stubGlobal('fetch', fetchMock);
    const comments: Thread['comments'] = [
      { personaId: 'other', role: 'persona', text: 'Ignore this companion.' },
      ...Array.from({ length: 14 }, (_, index) => (
        index % 2 === 0
          ? { role: 'user' as const, text: `Question ${index}` }
          : { personaId: 'p1', role: 'persona' as const, text: `Answer ${index}` }
      )),
    ];
    const thread: Thread = {
      id: 't2',
      bookId: 'b1',
      chapterId: '0',
      paragraphId: '0:1',
      selectedText: 'A short passage.',
      comments,
      createdAt: 1,
    };

    await continueWithPersona(thread, persona, 'One more question?', settings);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const history = body.messages.slice(2, -1);
    expect(history).toHaveLength(12);
    expect(history.map((message: { content: string }) => message.content)).not.toContain('Ignore this companion.');
    expect(history[0].content).toBe('Question 2');
  });
});
