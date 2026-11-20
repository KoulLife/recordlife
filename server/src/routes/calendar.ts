import { and, asc, gt, isNull, lt, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { dayRange, minutesPerDay } from '@recordlife/shared';
import type { Deps } from '../app';
import { activities } from '../db/schema';
import { toActivity } from './activities';

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(\d{2})$/;

function isValidDay(s: string): boolean {
  const m = DAY.exec(s);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function isValidMonth(s: string): boolean {
  const m = MONTH.exec(s);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

export function calendarRoutes({ db, now }: Deps) {
  const r = new Hono();

  // Activities overlapping [start, end).
  const overlapping = (start: Date, end: Date) =>
    db
      .select()
      .from(activities)
      .where(and(lt(activities.startedAt, end), or(isNull(activities.endedAt), gt(activities.endedAt, start))))
      .orderBy(asc(activities.startedAt));

  r.get('/days/:date', async (c) => {
    const date = c.req.param('date');
    if (!isValidDay(date)) return c.json({ error: '날짜 형식이 올바르지 않아요.' }, 400);
    const { start, end } = dayRange(date);
    const rows = await overlapping(start, end);
    return c.json(rows.map(toActivity));
  });

  r.get('/months/:month', async (c) => {
    const month = c.req.param('month');
    if (!isValidMonth(month)) return c.json({ error: '월 형식이 올바르지 않아요.' }, 400);
    const [y, m] = month.split('-').map(Number);
    const first = `${month}-01`;
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const rows = await overlapping(dayRange(first).start, dayRange(next).start);
    return c.json(minutesPerDay(rows, month, now()));
  });

  return r;
}
