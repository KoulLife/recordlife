import path from 'node:path';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

export function createDb(url: string): { db: Db; close(): Promise<void> } {
  const client = postgres(url, { onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

// Resolved from the working directory: `server/` in dev, `/app` in the container.
const defaultMigrations = () => path.resolve(process.env.MIGRATIONS_DIR ?? 'drizzle');

export async function runMigrations(db: Db, migrationsFolder = defaultMigrations()) {
  await migrate(db, { migrationsFolder });
}
