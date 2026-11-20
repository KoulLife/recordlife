// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { Activity, MonthSummary } from '@recordlife/shared';
import App from './App';

type Deferred<T> = { promise: Promise<T>; resolve(v: T): void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

const h = vi.hoisted(() => ({
  days: new Map<string, Deferred<Activity[]>>(),
  months: new Map<string, Deferred<MonthSummary>>(),
  manual: false,
}));

vi.mock('./api', () => {
  const pending = <T,>(map: Map<string, Deferred<T>>, key: string, empty: T) => {
    if (!h.manual) return Promise.resolve(empty);
    if (!map.has(key)) map.set(key, deferred<T>());
    return map.get(key)!.promise;
  };
  return {
    ApiError: class extends Error {},
    getCurrent: () => Promise.resolve({ activity: null, serverNow: new Date().toISOString() }),
    getDay: (d: string) => pending(h.days, d, [] as Activity[]),
    getMonth: (m: string) => pending(h.months, m, {} as MonthSummary),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let path = '';
function Probe() {
  path = useLocation().pathname;
  return null;
}

let root: Root;
let el: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  window.scrollTo = vi.fn() as typeof window.scrollTo; // not implemented in jsdom
  h.days.clear();
  h.months.clear();
  h.manual = false;
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
});
afterEach(() => {
  act(() => root.unmount());
  el.remove();
  vi.useRealTimers();
});

const render = (at: string) =>
  act(async () =>
    root.render(
      <MemoryRouter initialEntries={[at]}>
        <App />
        <Probe />
      </MemoryRouter>,
    ),
  );
const click = (selector: string) => act(async () => (el.querySelector(selector) as HTMLElement).click());
const act0 = (fn: () => void) => act(async () => fn());

const activity = (title: string, start: string, end: string): Activity => ({ id: title, title, startedAt: start, endedAt: end });

test('day and month tabs follow the date at click time', async () => {
  vi.setSystemTime(new Date('2026-11-20T14:00:00Z')); // KST 11/20 23:00
  await render('/');
  vi.setSystemTime(new Date('2026-11-30T15:30:00Z')); // KST 12/01 00:30
  await click('a[href="/day"]');
  expect(path).toBe('/day/2026-12-01');
  await click('a[href="/month"]');
  expect(path).toBe('/month/2026-12');
});

test('a slow response for the previous day does not replace the current day', async () => {
  vi.setSystemTime(new Date('2026-11-20T05:00:00Z'));
  h.manual = true;
  await render('/day/2026-11-19');
  await click('a[aria-label="다음 날"]');
  expect(path).toBe('/day/2026-11-20');
  await act0(() => h.days.get('2026-11-20')!.resolve([activity('오늘 일', '2026-11-20T01:00:00Z', '2026-11-20T02:00:00Z')]));
  await act0(() => h.days.get('2026-11-19')!.resolve([activity('어제 일', '2026-11-19T01:00:00Z', '2026-11-19T02:00:00Z')]));
  const titles = [...el.querySelectorAll('.block-title')].map((n) => n.textContent);
  expect(titles).toEqual(['오늘 일']);
});

test('a slow response for the previous month does not replace the current month', async () => {
  vi.setSystemTime(new Date('2026-11-20T05:00:00Z'));
  h.manual = true;
  await render('/month/2026-10');
  await click('a[aria-label="다음 달"]');
  expect(path).toBe('/month/2026-11');
  await act0(() => h.months.get('2026-11')!.resolve({ '2026-11-03': 500 }));
  await act0(() => h.months.get('2026-10')!.resolve({ '2026-11-03': 0 }));
  expect(el.querySelector('a[href="/day/2026-11-03"] .cal-dot')?.className).toContain('lv4');
});
