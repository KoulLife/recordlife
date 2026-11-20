import { TZDate } from '@date-fns/tz';
import { addDays, format, getDaysInMonth } from 'date-fns';
import type { MonthSummary, Span } from './types';

export const ZONE = 'Asia/Seoul';
const DAY_MINUTES = 1440;

const inZone = (d: Date) => new TZDate(d.getTime(), ZONE);

/** `yyyy-MM-dd` of `now` in Asia/Seoul. */
export function todayKey(now: Date): string {
  return format(inZone(now), 'yyyy-MM-dd');
}

/** Asia/Seoul 00:00 of `day` to 00:00 of the next day. */
export function dayRange(day: string): { start: Date; end: Date } {
  const [y, m, d] = day.split('-').map(Number);
  const start = new TZDate(y, m - 1, d, ZONE);
  const end = addDays(start, 1);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** Portion of `span` inside `day`; a running span extends to `now`. */
export function clipToDay(span: Span, day: string, now: Date): { start: Date; end: Date } | null {
  const { start: dayStart, end: dayEnd } = dayRange(day);
  const spanEnd = span.endedAt ?? now;
  const start = Math.max(span.startedAt.getTime(), dayStart.getTime());
  const end = Math.min(spanEnd.getTime(), dayEnd.getTime());
  if (end <= start) return null;
  return { start: new Date(start), end: new Date(end) };
}

/** Minutes per day for every day of `month` (`yyyy-MM`), capped at 1440. */
export function minutesPerDay(spans: Span[], month: string, now: Date): MonthSummary {
  const [y, m] = month.split('-').map(Number);
  const days = getDaysInMonth(new Date(y, m - 1, 1));
  const out: MonthSummary = {};
  for (let d = 1; d <= days; d++) {
    const key = `${month}-${String(d).padStart(2, '0')}`;
    let ms = 0;
    for (const s of spans) {
      const c = clipToDay(s, key, now);
      if (c) ms += c.end.getTime() - c.start.getTime();
    }
    out[key] = Math.min(Math.floor(ms / 60000), DAY_MINUTES);
  }
  return out;
}

export function intensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes <= 120) return 1;
  if (minutes <= 240) return 2;
  if (minutes <= 360) return 3;
  return 4;
}

/** `H:MM:SS`, never negative. */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** `1시간 24분` / `40분` / `6시간` / `0분`. */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** `HH:mm` in Asia/Seoul. */
export function formatClock(d: Date): string {
  return format(inZone(d), 'HH:mm');
}

/** Length in code points (matches Postgres char_length). */
export function titleLength(s: string): number {
  return [...s].length;
}
