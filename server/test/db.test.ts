import { afterAll, beforeAll, expect, test } from 'vitest';
import { activities } from '../src/db/schema';
import { setupTestDb } from './helpers';

let t: Awaited<ReturnType<typeof setupTestDb>>;
beforeAll(async () => {
  t = await setupTestDb();
});
afterAll(async () => {
  await t.close();
});

test('only one running activity can exist', async () => {
  await t.db.insert(activities).values({ title: 'a', startedAt: new Date('2026-11-20T00:00:00Z') });
  const err = await t.db
    .insert(activities)
    .values({ title: 'b', startedAt: new Date('2026-11-20T01:00:00Z') })
    .then(() => null, (e: unknown) => e as { code?: string; cause?: { code?: string } });
  expect(err?.code ?? err?.cause?.code).toBe('23505');
});
