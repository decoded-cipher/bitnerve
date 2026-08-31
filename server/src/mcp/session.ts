import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, agentInvocations } from '../config/database';
import { and, desc, eq, gte, ne } from 'drizzle-orm';
import { getOrCreateAccount, getAccountMetrics, createAccountSnapshot } from '../lib/exchange/helper';

const INITIAL_BALANCE = Number.parseInt(process.env.INITIAL_BALANCE ?? '', 10) || 10000;

// MCP never sees the conversation, so the prompt is reassembled from the files the launcher sends
const PROMPT_DIR = fileURLToPath(new URL('../../prompts/', import.meta.url));

function readPrompt(name: string): string {
  try {
    return readFileSync(`${PROMPT_DIR}${name}`, 'utf8').trim();
  } catch {
    return '';
  }
}

export function systemPrompt(): string {
  return process.env.SYSTEM_PROMPT?.trim() || readPrompt('system.md');
}

export function fullPrompt(userPrompt: string): string {
  return [
    `# System prompt\n\n${systemPrompt()}`,
    `# User prompt\n\n${userPrompt.trim()}`,
  ].join('\n\n');
}

let accountIdPromise: Promise<string> | null = null;
let invocationIdPromise: Promise<string> | null = null;
let snapshotPromise: Promise<void> | null = null;

const startedAt = Date.now();

export function getAccountId(): Promise<string> {
  if (!accountIdPromise) {
    accountIdPromise = getOrCreateAccount(INITIAL_BALANCE).then(account => account.id);
  }
  return accountIdPromise;
}

const ADOPT_WINDOW_MS = Number.parseInt(process.env.INVOCATION_ADOPT_MS ?? '', 10) || 1_800_000;

async function insertInvocation(accountId: string, userPrompt: string, marketData: unknown): Promise<string> {
  const metrics = await getAccountMetrics(accountId);
  const [row] = await db
    .insert(agentInvocations)
    .values({
      account_id: accountId,
      session_state: { startTime: startedAt, invocationCount: 0 } as any,
      market_data: (marketData ?? {}) as any,
      metrics: metrics as any,
      user_prompt: fullPrompt(userPrompt),
      chain_of_thought: '',
      agent_response: null,
      finish_reason: null,
    })
    .returning();
  return row.id;
}

export async function startInvocation(userPrompt: string, marketData: unknown): Promise<string> {
  const accountId = await getAccountId();
  const id = await insertInvocation(accountId, userPrompt, marketData);
  invocationIdPromise = Promise.resolve(id);
  return id;
}

// The brief opens the invocation in its own process; the tools attach to that same row
export function currentInvocationId(): Promise<string> {
  if (!invocationIdPromise) {
    invocationIdPromise = (async () => {
      const accountId = await getAccountId();
      const cutoff = new Date(Date.now() - ADOPT_WINDOW_MS);
      const [pending] = await db
        .select({ id: agentInvocations.id })
        .from(agentInvocations)
        .where(
          and(
            eq(agentInvocations.account_id, accountId),
            eq(agentInvocations.chain_of_thought, ''),
            gte(agentInvocations.created_at, cutoff)
          )
        )
        .orderBy(desc(agentInvocations.created_at))
        .limit(1);

      return pending ? pending.id : insertInvocation(accountId, 'Cycle started without a brief.', {});
    })();
  }
  return invocationIdPromise;
}

export async function recordMarketData(data: unknown): Promise<void> {
  const id = await currentInvocationId();
  await db
    .update(agentInvocations)
    .set({ market_data: data as any })
    .where(eq(agentInvocations.id, id));
}

export async function recordAnalysis(
  reasoning: string,
  finishReason: string = 'stop'
): Promise<void> {
  const id = await currentInvocationId();
  await db
    .update(agentInvocations)
    .set({ chain_of_thought: reasoning, finish_reason: finishReason })
    .where(eq(agentInvocations.id, id));
}

export async function appendToolCall(entry: {
  toolName: string;
  input: unknown;
  result: unknown;
  error: string | null;
}): Promise<void> {
  const id = await currentInvocationId();
  const [row] = await db
    .select({ existing: agentInvocations.agent_response })
    .from(agentInvocations)
    .where(eq(agentInvocations.id, id))
    .limit(1);

  const calls = Array.isArray(row?.existing) ? (row.existing as unknown[]) : [];
  await db
    .update(agentInvocations)
    .set({ agent_response: [...calls, entry] as any })
    .where(eq(agentInvocations.id, id));
}

export function snapshotOnce(): Promise<void> {
  if (!snapshotPromise) {
    snapshotPromise = getAccountId().then(createAccountSnapshot);
  }
  return snapshotPromise;
}
