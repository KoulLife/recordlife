import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import type { Activity, CurrentResponse } from '@recordlife/shared';
import { createApp } from '../src/app';
import { fixedClock, setupTestDb } from './helpers';

let t: Awaited<ReturnType<typeof setupTestDb>>;
let clock: ReturnType<typeof fixedClock>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  t = await setupTestDb();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.reset();
  clock = fixedClock('2026-11-20T00:12:00Z');
  app = createApp({ db: t.db, now: clock.now });
});

const json = (body: unknown) => ({
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
});
const start = (title: string) => app.request('/api/activities/start', { method: 'POST', ...json({ title }) });
const current = async () => (await (await app.request('/api/current')).json()) as CurrentResponse;
const NOPE = '00000000-0000-0000-0000-000000000000';

test('start creates running activity', async () => {
  const res = await start('회사 이슈 처리');
  expect(res.status).toBe(201);
  const a = (await res.json()) as Activity;
  expect(a.title).toBe('회사 이슈 처리');
  expect(a.startedAt).toBe('2026-11-20T00:12:00.000Z');
  expect(a.endedAt).toBeNull();
  expect((await current()).activity?.id).toBe(a.id);
});

test('current includes serverNow', async () => {
  const c = await current();
  expect(c.serverNow).toBe('2026-11-20T00:12:00.000Z');
  expect(c.activity).toBeNull();
});

test('start while running auto-stops previous', async () => {
  const first = (await (await start('회사 이슈 처리')).json()) as Activity;
  clock.set('2026-11-20T00:40:00Z');
  const second = (await (await start('점심')).json()) as Activity;
  const rows = await t.db.execute<{ id: string; ended_at: Date | null }>(sql`select id, ended_at from activities`);
  const firstRow = rows.find((r) => r.id === first.id)!;
  expect(new Date(firstRow.ended_at!).toISOString()).toBe('2026-11-20T00:40:00.000Z');
  expect((await current()).activity?.id).toBe(second.id);
});

test('concurrent starts leave exactly one running', async () => {
  const results = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((x) => start(x)));
  expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
  const [{ n }] = await t.db.execute<{ n: number }>(sql`select count(*)::int as n from activities where ended_at is null`);
  expect(n).toBe(1);
});

test('title validation', async () => {
  expect((await start('   ')).status).toBe(400);
  expect((await start('가'.repeat(101))).status).toBe(400);
  expect((await start('😀'.repeat(100))).status).toBe(201);
  const trimmed = (await (await start('  점심  ')).json()) as Activity;
  expect(trimmed.title).toBe('점심');
});

test('stop', async () => {
  const a = (await (await start('회사 이슈 처리')).json()) as Activity;
  clock.set('2026-11-20T01:36:00Z');
  const res = await app.request(`/api/activities/${a.id}/stop`, { method: 'POST' });
  expect(res.status).toBe(200);
  expect(((await res.json()) as Activity).endedAt).toBe('2026-11-20T01:36:00.000Z');
  expect((await app.request(`/api/activities/${a.id}/stop`, { method: 'POST' })).status).toBe(409);
  expect((await app.request(`/api/activities/${NOPE}/stop`, { method: 'POST' })).status).toBe(404);
});

test('patch', async () => {
  const a = (await (await start('회사 이슈 처리')).json()) as Activity;
  const patch = (id: string, body: unknown) => app.request(`/api/activities/${id}`, { method: 'PATCH', ...json(body) });

  // running: endedAt not allowed, title/startedAt allowed
  expect((await patch(a.id, { endedAt: '2026-11-20T00:30:00Z' })).status).toBe(400);
  const r1 = await patch(a.id, { title: '버그 수정', startedAt: '2026-11-20T00:00:00Z' });
  expect(r1.status).toBe(200);
  expect(((await r1.json()) as Activity).title).toBe('버그 수정');

  clock.set('2026-11-20T02:00:00Z');
  await app.request(`/api/activities/${a.id}/stop`, { method: 'POST' });

  const r2 = await patch(a.id, { startedAt: '2026-11-20T00:10:00Z', endedAt: '2026-11-20T01:00:00Z' });
  expect(r2.status).toBe(200);
  const p = (await r2.json()) as Activity;
  expect(p.startedAt).toBe('2026-11-20T00:10:00.000Z');
  expect(p.endedAt).toBe('2026-11-20T01:00:00.000Z');

  expect((await patch(a.id, { endedAt: '2026-11-20T00:10:00Z' })).status).toBe(400); // end <= start
  expect((await patch(a.id, { startedAt: '2026-11-20T03:00:00Z' })).status).toBe(400); // future
  expect((await patch(a.id, { endedAt: '2026-11-20T03:00:00Z' })).status).toBe(400); // future
  expect((await patch(a.id, { title: ' ' })).status).toBe(400);
  expect((await patch(NOPE, { title: 'x' })).status).toBe(404);
});

test('delete', async () => {
  const a = (await (await start('회사 이슈 처리')).json()) as Activity;
  expect((await app.request(`/api/activities/${a.id}`, { method: 'DELETE' })).status).toBe(204);
  expect((await current()).activity).toBeNull();
  expect((await app.request(`/api/activities/${a.id}`, { method: 'DELETE' })).status).toBe(404);
});

test('errors have an error message body', async () => {
  const res = await app.request(`/api/activities/${NOPE}/stop`, { method: 'POST' });
  expect(await res.json()).toEqual({ error: expect.any(String) });
});
