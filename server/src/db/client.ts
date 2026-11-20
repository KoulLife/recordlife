import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

export function createDb(url: string): { db: Db; close(): Promise<void> } {
  const client = postgres(url, { onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

const defaultMigrations = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../drizzle');

export async function runMigrations(db: Db, migrationsFolder = process.env.MIGRATIONS_DIR ?? defaultMigrations) {
  await migrate(db, { migrationsFolder });
}
