import { Hono } from 'hono';
import type { Db } from './db/client';
import { activityRoutes } from './routes/activities';
import { calendarRoutes } from './routes/calendar';

export type Deps = { db: Db; now: () => Date };

export function createApp(deps: { db: Db; now?: () => Date }) {
  const d: Deps = { db: deps.db, now: deps.now ?? (() => new Date()) };
  const app = new Hono();
  app.route('/api', activityRoutes(d));
  app.route('/api', calendarRoutes(d));
  app.notFound((c) => c.json({ error: '찾을 수 없어요.' }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: '서버 오류가 발생했어요.' }, 500);
  });
  return app;
}
