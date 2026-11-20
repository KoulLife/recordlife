import { expect, test } from 'vitest';
import { monthGrid, shiftMonth } from './grid';

test('2026-11 starts on Sunday', () => {
  const g = monthGrid('2026-11');
  expect(g[0]).toBe('2026-11-01');
  expect(g).toHaveLength(35);
  expect(g[29]).toBe('2026-11-30');
  expect(g.slice(30)).toEqual([null, null, null, null, null]);
});

test('2026-02 has no blanks', () => {
  const g = monthGrid('2026-02');
  expect(g[0]).toBe('2026-02-01');
  expect(g).toHaveLength(28);
});

test('2026-10 leading blanks', () => {
  const g = monthGrid('2026-10');
  expect(g.slice(0, 4)).toEqual([null, null, null, null]);
  expect(g[4]).toBe('2026-10-01');
  expect(g.length % 7).toBe(0);
});

test('shiftMonth crosses years', () => {
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
});
