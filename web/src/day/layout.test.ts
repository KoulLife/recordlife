import { expect, test } from 'vitest';
import { layoutBlocks } from './layout';

const dayStart = new Date('2026-11-19T15:00:00Z'); // KST 11/20 00:00
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(dayStart.getTime() + (h * 60 + m) * 60000);
};
const b = (id: string, s: string, e: string) => ({ id, start: at(s), end: at(e) });

test('positions by minutes', () => {
  const [r] = layoutBlocks([b('a', '09:12', '10:36')], dayStart);
  expect(r.top).toBeCloseTo(9.2 * 56);
  expect(r.height).toBeCloseTo(1.4 * 56);
  expect(r.col).toBe(0);
  expect(r.cols).toBe(1);
});

test('overlapping blocks share columns', () => {
  const r = layoutBlocks([b('a', '09:00', '10:00'), b('b', '09:30', '11:00'), b('c', '10:30', '11:30')], dayStart);
  expect(r.map((x) => x.cols)).toEqual([2, 2, 2]);
  expect(r.map((x) => x.col)).toEqual([0, 1, 0]);
});

test('non-overlapping blocks get full width', () => {
  const r = layoutBlocks([b('a', '09:00', '10:00'), b('b', '10:00', '11:00')], dayStart);
  expect(r.map((x) => x.cols)).toEqual([1, 1]);
});

test('min height', () => {
  const [r] = layoutBlocks([b('a', '09:00', '09:01')], dayStart);
  expect(r.height).toBe(14);
});

test('tiny back-to-back blocks do not draw on top of each other', () => {
  const r = layoutBlocks([b('a', '10:18', '10:19'), b('b', '10:19', '10:20')], dayStart);
  expect(r.map((x) => x.cols)).toEqual([2, 2]);
  expect(r.map((x) => x.col)).toEqual([0, 1]);
});
