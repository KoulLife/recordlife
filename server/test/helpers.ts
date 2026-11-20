import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createDb, runMigrations, type Db } from '../src/db/client';

const url = process.env.TEST_DATABASE_URL ?? 'postgres://recordlife:recordlife@localhost:5432/recordlife_test';
const migrations = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle');

export async function setupTestDb(): Promise<{ db: Db; reset(): Promise<void>; close(): Promise<void> }> {
  const { db, close } = createDb(url);
  await runMigrations(db, migrations);
  const reset = async () => {
    await db.execute(sql`truncate activities`);
  };
  await reset();
  return { db, reset, close };
}

export function fixedClock(iso: string): { now: () => Date; set(iso: string): void } {
  let current = new Date(iso);
  return {
    now: () => new Date(current.getTime()),
    set(next: string) {
      current = new Date(next);
    },
  };
}
