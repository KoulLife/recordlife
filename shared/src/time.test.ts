import { expect, test } from 'vitest';
import {
  clipToDay,
  dayRange,
  formatClock,
  formatMinutes,
  formatTimer,
  intensity,
  minutesPerDay,
  titleLength,
  todayKey,
} from './index';

const at = (iso: string) => new Date(iso);

test('todayKey uses Seoul', () => {
  expect(todayKey(at('2026-11-19T15:30:00Z'))).toBe('2026-11-20'); // KST 00:30
});

test('dayRange', () => {
  expect(dayRange('2026-11-20')).toEqual({
    start: at('2026-11-19T15:00:00Z'),
    end: at('2026-11-20T15:00:00Z'),
  });
});

test('clipToDay splits across midnight', () => {
  const s = { startedAt: at('2026-11-20T14:00:00Z'), endedAt: at('2026-11-20T16:00:00Z') }; // KST 23:00–01:00
  const now = at('2026-11-21T00:00:00Z');
  expect(clipToDay(s, '2026-11-20', now)).toEqual({ start: at('2026-11-20T14:00:00Z'), end: at('2026-11-20T15:00:00Z') });
  expect(clipToDay(s, '2026-11-21', now)).toEqual({ start: at('2026-11-20T15:00:00Z'), end: at('2026-11-20T16:00:00Z') });
  expect(clipToDay(s, '2026-11-22', now)).toBeNull();
});

test('caps a multi-day running activity at 1440 per day', () => {
  const s = { startedAt: at('2026-11-17T15:00:00Z'), endedAt: null }; // KST 11/18 00:00
  const m = minutesPerDay([s], '2026-11', at('2026-11-20T03:00:00Z')); // KST 11/20 12:00
  expect(m['2026-11-18']).toBe(1440);
  expect(m['2026-11-19']).toBe(1440);
  expect(m['2026-11-20']).toBe(720);
  expect(m['2026-11-21']).toBe(0);
  expect(Object.keys(m)).toHaveLength(30);
});

test('overlapping activities are capped at 1440 per day', () => {
  const a = { startedAt: at('2026-11-19T15:00:00Z'), endedAt: at('2026-11-20T15:00:00Z') };
  const m = minutesPerDay([a, a], '2026-11', at('2026-11-25T00:00:00Z'));
  expect(m['2026-11-20']).toBe(1440);
});

test('intensity thresholds', () => {
  expect([0, 1, 120, 121, 240, 241, 360, 361].map(intensity)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
});

test('formatters', () => {
  expect(formatTimer(5047000)).toBe('1:24:07');
  expect(formatTimer(-3000)).toBe('0:00:00'); // formatTimer clamps negatives
  expect([84, 40, 360, 0].map(formatMinutes)).toEqual(['1시간 24분', '40분', '6시간', '0분']);
  expect(formatClock(at('2026-11-20T00:12:00Z'))).toBe('09:12');
  expect(titleLength('😀'.repeat(100))).toBe(100);
});
