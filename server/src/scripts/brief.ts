import { closeDatabase } from '../config/database';
import { getAccountId, snapshotOnce, startInvocation } from '../mcp/session';
import { buildBrief } from '../mcp/brief';

const accountId = await getAccountId();
const { text, rows } = await buildBrief(accountId);
await snapshotOnce();
await startInvocation(text, rows);

console.log(text);
await closeDatabase();
