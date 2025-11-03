
import type { Config } from 'drizzle-kit';
import { connectionString } from './src/config/database';


const config: Config = {
  schema: './src/config/database/schema.ts',
  out: './src/config/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString(),
  },
  verbose: true,
  strict: true,
} satisfies Config;

export default config;
