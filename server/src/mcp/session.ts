import { db, agentInvocations } from '../config/database';
import { eq } from 'drizzle-orm';
import { getOrCreateAccount, getAccountMetrics } from '../lib/exchange/helper';

const INITIAL_BALANCE = Number.parseInt(process.env.INITIAL_BALANCE ?? '', 10) || 10000;

let accountIdPromise: Promise<string> | null = null;
let invocationIdPromise: Promise<string> | null = null;

const startedAt = Date.now();

export function getAccountId(): Promise<string> {
  if (!accountIdPromise) {
    accountIdPromise = getOrCreateAccount(INITIAL_BALANCE).then(account => account.id);
  }
  return accountIdPromise;
}

export function currentInvocationId(): Promise<string> {
  if (!invocationIdPromise) {
    invocationIdPromise = (async () => {
      const accountId = await getAccountId();
      const metrics = await getAccountMetrics(accountId);
      const [row] = await db
        .insert(agentInvocations)
        .values({
          account_id: accountId,
          session_state: { startTime: startedAt, invocationCount: 0 } as any,
          market_data: {} as any,
          metrics: metrics as any,
          user_prompt: '',
          chain_of_thought: '',
          agent_response: null,
          finish_reason: null,
        })
        .returning();
      return row.id;
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
