import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SOURCE = fileURLToPath(new URL('../config/database/schema.ts', import.meta.url));
const TARGET = fileURLToPath(new URL('../../../client/server/utils/schema.ts', import.meta.url));

const BANNER = '// Generated from server/src/config/database/schema.ts by `bun run schema:sync` - do not edit\n\n';

const expected = BANNER + readFileSync(SOURCE, 'utf8');
const actual = (() => {
  try {
    return readFileSync(TARGET, 'utf8');
  } catch {
    return null;
  }
})();

if (process.argv.includes('--check')) {
  if (actual !== expected) {
    console.error(`${TARGET} is out of date. Run: bun run schema:sync`);
    process.exit(1);
  }
  console.log('Client schema is in sync');
} else if (actual === expected) {
  console.log('Client schema already in sync');
} else {
  writeFileSync(TARGET, expected);
  console.log(`Wrote ${TARGET}`);
}
