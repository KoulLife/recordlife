import { existsSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app';
import { createDb, runMigrations } from './db/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const port = Number(process.env.PORT ?? 3000);
const staticDir = path.resolve(process.env.STATIC_DIR ?? '../web/dist');

const { db } = createDb(databaseUrl);
await runMigrations(db);

const app = createApp({ db });

if (existsSync(path.join(staticDir, 'index.html'))) {
  // serveStatic resolves `root` against the working directory.
  const root = path.relative(process.cwd(), staticDir) || '.';
  const assets = serveStatic({ root });
  const spa = serveStatic({ root, path: 'index.html' });
  // Static files, then the SPA shell for client routes like /day/2026-11-20. /api stays JSON.
  app.get('*', (c, next) => (c.req.path.startsWith('/api/') ? next() : assets(c, next)));
  app.get('*', (c, next) => (c.req.path.startsWith('/api/') ? next() : spa(c, next)));
} else {
  console.warn(`No web build at ${staticDir}; serving API only.`);
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`recordlife listening on http://localhost:${info.port}`);
});
