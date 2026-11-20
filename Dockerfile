# --- build ---
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r build && mkdir -p web/dist
RUN pnpm --filter server deploy --prod --legacy /out

# --- runtime ---
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/public \
    MIGRATIONS_DIR=/app/drizzle
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/server/dist ./dist
COPY --from=build /repo/server/drizzle ./drizzle
COPY --from=build /repo/web/dist ./public
EXPOSE 3000
CMD ["node", "dist/index.js"]
