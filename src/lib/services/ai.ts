import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { env, features } from '@/lib/env';
import { prisma } from '@/lib/db';
import type { AIFeature } from '@prisma/client';
import { badRequest } from '@/lib/errors';

/**
 * Every AI call runs here, server-side. The API key never reaches the browser.
 * Output is schema-validated before it is returned, and nothing is ever written
 * to a profile — callers receive a draft that the user has to accept.
 */

const MAX_INPUT_CHARS = 6000;

interface Provider {
  name: string;
  model: string;
  complete(system: string, user: string): Promise<string>;
}

const anthropicProvider: Provider = {
  name: 'anthropic',
  model: env.AI_MODEL,
  async complete(system, user) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.AI_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')
      .trim();
  },
};

/**
 * Offline provider. It rewrites and tightens what the user already wrote
 * rather than inventing anything, so the feature still works — and stays
 * truthful — with no API key present.
 */
const localProvider: Provider = {
  name: 'local',
  model: 'doorkey-draft-v1',
  async complete(_system, user) {
    const source = user.split('---')[1] ?? user;
    const sentences = source
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const capped = sentences.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    return capped.slice(0, 4).join(' ');
  },
};

const provider: Provider = features.realAI ? anthropicProvider : localProvider;
export const aiConfigured = features.realAI;

const draftSchema = z.object({
  draft: z.string().min(1).max(4000),
  provider: z.string(),
  generated: z.literal(true),
});
export type AIDraft = z.infer<typeof draftSchema>;

async function run(userId: string, feature: AIFeature, system: string, input: string): Promise<AIDraft> {
  if (input.length > MAX_INPUT_CHARS) throw badRequest('That is too much text to work with. Trim it down.');
  const started = Date.now();
  const inputHash = createHash('sha256').update(input).digest('hex').slice(0, 32);

  try {
    const text = await provider.complete(system, input);
    const parsed = draftSchema.parse({ draft: text.slice(0, 4000), provider: provider.name, generated: true });

    await prisma.aIRequest.create({
      data: {
        userId, feature, provider: provider.name, model: provider.model, status: 'OK',
        inputHash, inputChars: input.length, outputChars: parsed.draft.length, latencyMs: Date.now() - started,
      },
    });
    return parsed;
  } catch (err) {
    await prisma.aIRequest.create({
      data: {
        userId, feature, provider: provider.name, model: provider.model, status: 'FAILED',
        inputHash, inputChars: input.length, latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message.slice(0, 300) : 'unknown',
      },
    }).catch(() => {});
    throw badRequest('The writing assistant is unavailable right now. Your text has not been changed.');
  }
}

const NO_INVENTION =
  'Use only facts present in the input. Never invent metrics, customers, funding, dates or names. ' +
  'If a fact is missing, leave it out rather than guessing. Plain sentences, no marketing language, no em dashes.';

export const ai = {
  async profileText(userId: string, kind: 'bio' | 'startup_description' | 'one_liner' | 'thesis', rough: string) {
    const shape = {
      bio: 'Write a 2–3 sentence professional bio in the first person.',
      startup_description: 'Write a 3–4 sentence description of the company for an investor audience.',
      one_liner: 'Write a single sentence of at most 140 characters describing what the company does.',
      thesis: 'Write a 2–3 sentence investment thesis in the first person.',
    }[kind];
    return run(userId, 'PROFILE_ASSISTANT', `You help people write clear profile copy for a professional network. ${shape} ${NO_INVENTION}`, `---\n${rough}\n---`);
  },

  async introMessage(userId: string, args: { senderSummary: string; recipientSummary: string; context?: string }) {
    const system =
      'You draft short, specific first messages between founders and investors. ' +
      'Under 90 words, no flattery, no subject line, state plainly why the two are relevant to each other and propose one concrete next step. ' +
      NO_INVENTION;
    const input = `---\nAbout me: ${args.senderSummary}\nAbout them: ${args.recipientSummary}\nContext: ${args.context ?? 'none given'}\n---`;
    return run(userId, 'INTRODUCTION_ASSISTANT', system, input);
  },

  async startupSummary(userId: string, facts: string) {
    const system =
      'You summarise a startup profile for an investor. Three short sentences. ' +
      'Separate what the company claims from what is evidenced. ' + NO_INVENTION;
    return run(userId, 'STARTUP_SUMMARY', system, `---\n${facts}\n---`);
  },
};
