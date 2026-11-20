import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { titleLength, type Activity, type CurrentResponse } from '@recordlife/shared';
import type { Deps } from '../app';
import { activities, type ActivityRow } from '../db/schema';

export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
  };
}

const title = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => titleLength(s) >= 1 && titleLength(s) <= 100, '이름은 1–100자로 입력해 주세요.');
const isoDate = z.string().datetime({ offset: true }).transform((s) => new Date(s));

const startBody = z.object({ title });
const patchBody = z.object({ title: title.optional(), startedAt: isoDate.optional(), endedAt: isoDate.optional() });
const idParam = z.object({ id: z.string().uuid() });

// Turns zod failures into `{ error }` bodies; an invalid id is a 404.
const invalid = (status: 400 | 404) => (result: { success: boolean; error?: z.ZodError }, c: any) => {
  if (!result.success) {
    const msg = status === 404 ? '기록을 찾을 수 없어요.' : (result.error?.issues[0]?.message ?? '잘못된 요청이에요.');
    return c.json({ error: msg }, status);
  }
};

const NOT_FOUND = { error: '기록을 찾을 수 없어요.' };

export function activityRoutes({ db, now }: Deps) {
  const r = new Hono();

  r.get('/current', async (c) => {
    const [row] = await db.select().from(activities).where(isNull(activities.endedAt)).limit(1);
    const body: CurrentResponse = { activity: row ? toActivity(row) : null, serverNow: now().toISOString() };
    return c.json(body);
  });

  r.post('/activities/start', zValidator('json', startBody, invalid(400)), async (c) => {
    const { title } = c.req.valid('json');
    const row = await db.transaction(async (tx) => {
      // Serialize starts so concurrent requests never race on the one-running index,
      // and read the clock only once we hold the lock.
      await tx.execute(sql`select pg_advisory_xact_lock(7140001)`);
      const at = now();
      let startAt = at;
      const [running] = await tx.select().from(activities).where(isNull(activities.endedAt)).for('update');
      if (running) {
        // Never delete: end it now, or 1ms after its start if our clock is not ahead of it.
        const endAt = at > running.startedAt ? at : new Date(running.startedAt.getTime() + 1);
        await tx.update(activities).set({ endedAt: endAt, updatedAt: at }).where(eq(activities.id, running.id));
        if (endAt > startAt) startAt = endAt;
      }
      const [created] = await tx.insert(activities).values({ title, startedAt: startAt, createdAt: at, updatedAt: at }).returning();
      return created;
    });
    return c.json(toActivity(row), 201);
  });

  r.post('/activities/:id/stop', zValidator('param', idParam, invalid(404)), async (c) => {
    const { id } = c.req.valid('param');
    const [row] = await db.select().from(activities).where(eq(activities.id, id));
    if (!row) return c.json(NOT_FOUND, 404);
    if (row.endedAt) return c.json({ error: '이미 종료된 기록이에요.' }, 409);
    const at = now();
    const endedAt = at > row.startedAt ? at : new Date(row.startedAt.getTime() + 1);
    const [updated] = await db
      .update(activities)
      .set({ endedAt, updatedAt: at })
      .where(and(eq(activities.id, id), isNull(activities.endedAt)))
      .returning();
    if (!updated) return c.json({ error: '이미 종료된 기록이에요.' }, 409);
    return c.json(toActivity(updated));
  });

  r.patch(
    '/activities/:id',
    zValidator('param', idParam, invalid(404)),
    zValidator('json', patchBody, invalid(400)),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const [row] = await db.select().from(activities).where(eq(activities.id, id));
      if (!row) return c.json(NOT_FOUND, 404);
      if (!row.endedAt && body.endedAt) {
        return c.json({ error: '진행 중인 기록은 종료 시각을 정할 수 없어요.' }, 400);
      }
      const at = now();
      const startedAt = body.startedAt ?? row.startedAt;
      const endedAt = body.endedAt ?? row.endedAt;
      if (startedAt > at || (endedAt && endedAt > at)) {
        return c.json({ error: '미래 시각은 입력할 수 없어요.' }, 400);
      }
      if (endedAt && endedAt <= startedAt) {
        return c.json({ error: '종료 시각은 시작 시각보다 뒤여야 해요.' }, 400);
      }
      const [updated] = await db
        .update(activities)
        .set({ title: body.title ?? row.title, startedAt, endedAt, updatedAt: at })
        .where(eq(activities.id, id))
        .returning();
      return c.json(toActivity(updated));
    },
  );

  r.delete('/activities/:id', zValidator('param', idParam, invalid(404)), async (c) => {
    const { id } = c.req.valid('param');
    const deleted = await db.delete(activities).where(eq(activities.id, id)).returning({ id: activities.id });
    if (deleted.length === 0) return c.json(NOT_FOUND, 404);
    return c.body(null, 204);
  });

  return r;
}
