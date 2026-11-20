import { expect, test } from 'vitest';
import type { Activity } from '@recordlife/shared';
import { ribbonSegments } from './ribbon';

const a = (id: string, start: string, end: string | null): Activity => ({ id, title: id, startedAt: start, endedAt: end });
const now = new Date('2026-11-20T03:00:00Z'); // KST 12:00

test('places blocks as percent of the Seoul day', () => {
  const [s] = ribbonSegments([a('x', '2026-11-20T00:00:00Z', '2026-11-20T03:00:00Z')], '2026-11-20', now); // 09–12
  expect(s.left).toBeCloseTo(37.5);
  expect(s.width).toBeCloseTo(12.5);
  expect(s.running).toBe(false);
});

test('running block extends to now and crossing-midnight block is clipped', () => {
  const r = ribbonSegments(
    [a('night', '2026-11-19T14:00:00Z', '2026-11-19T16:00:00Z'), a('run', '2026-11-20T02:00:00Z', null)],
    '2026-11-20',
    now,
  );
  expect(r.map((s) => [s.id, +s.left.toFixed(2), +s.width.toFixed(2), s.running])).toEqual([
    ['night', 0, 4.17, false],
    ['run', 45.83, 4.17, true],
  ]);
});
