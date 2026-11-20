import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import type { Activity, MonthSummary } from '@recordlife/shared';
import { createApp } from '../src/app';
import { activities } from '../src/db/schema';
import { fixedClock, setupTestDb } from './helpers';

let t: Awaited<ReturnType<typeof setupTestDb>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  t = await setupTestDb();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.reset();
  app = createApp({ db: t.db, now: fixedClock('2026-11-21T03:00:00Z').now }); // KST 11/21 12:00
});

const insert = (title: string, start: string, end: string | null) =>
  t.db.insert(activities).values({ title, startedAt: new Date(start), endedAt: end ? new Date(end) : null });
const day = async (d: string) => (await (await app.request(`/api/days/${d}`)).json()) as Activity[];

test('day includes activity crossing midnight on both days', async () => {
  await insert('야근', '2026-11-20T14:00:00Z', '2026-11-20T16:00:00Z'); // KST 23:00–01:00
  expect((await day('2026-11-20')).map((a) => a.title)).toEqual(['야근']);
  expect((await day('2026-11-21')).map((a) => a.title)).toEqual(['야근']);
  expect(await day('2026-11-22')).toEqual([]);
});

test('day lists activities in start order', async () => {
  await insert('점심', '2026-11-20T03:05:00Z', '2026-11-20T03:50:00Z');
  await insert('회사 이슈 처리', '2026-11-20T00:12:00Z', '2026-11-20T01:36:00Z');
  expect((await day('2026-11-20')).map((a) => a.title)).toEqual(['회사 이슈 처리', '점심']);
});

test('day includes running activity', async () => {
  await insert('공부', '2026-11-21T01:00:00Z', null);
  const list = await day('2026-11-21');
  expect(list).toHaveLength(1);
  expect(list[0].endedAt).toBeNull();
});

test('month sums minutes per day', async () => {
  await insert('회사 이슈 처리', '2026-11-20T00:12:00Z', '2026-11-20T01:36:00Z'); // 84
  await insert('점심', '2026-11-20T03:05:00Z', '2026-11-20T03:50:00Z'); // 45
  const res = await app.request('/api/months/2026-11');
  expect(res.status).toBe(200);
  const m = (await res.json()) as MonthSummary;
  expect(m['2026-11-20']).toBe(129);
  expect(m['2026-11-01']).toBe(0);
  expect(Object.keys(m)).toHaveLength(30);
});

test('month counts activity spilling in from the previous month', async () => {
  await insert('밤샘', '2026-10-31T14:00:00Z', '2026-10-31T16:00:00Z'); // KST 10/31 23:00 – 11/01 01:00
  const m = (await (await app.request('/api/months/2026-11')).json()) as MonthSummary;
  expect(m['2026-11-01']).toBe(60);
});

test('bad params', async () => {
  expect((await app.request('/api/days/2026-13-01')).status).toBe(400);
  expect((await app.request('/api/days/2026-11-31')).status).toBe(400);
  expect((await app.request('/api/days/hello')).status).toBe(400);
  expect((await app.request('/api/months/2026-1')).status).toBe(400);
  expect((await app.request('/api/months/2026-13')).status).toBe(400);
});
