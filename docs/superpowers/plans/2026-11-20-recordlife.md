# recordlife Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한 줄 입력으로 지금 하는 일을 시작/종료하고, 일별 시간 블록과 월별 원 달력으로 돌아보는 1인용 활동 기록 웹앱.

**Architecture:** pnpm workspace 3개 패키지(`shared`, `server`, `web`). `server`는 Hono + Drizzle + PostgreSQL API이며 운영 시 `web`의 Vite 빌드 결과를 정적 서빙한다. docker-compose로 `app` + `db` 두 컨테이너.

**Tech Stack:** Node 22, pnpm 10, TypeScript 5, Hono 4 (`@hono/node-server`, `@hono/zod-validator`, zod), Drizzle ORM + drizzle-kit + `postgres`(postgres.js), PostgreSQL 17, React 19 + Vite + React Router 7, date-fns 4 + `@date-fns/tz`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-recordlife-design.md` (디자인 토큰: `DESIGN.md`, 시각 참고: `design-preview.html`)

## Global Constraints

- 시간대: 모든 날짜 경계/표시는 `Asia/Seoul`. DB는 `timestamptz`(UTC). 노트북/컨테이너 TZ에 의존 금지.
- 시작/종료 시각은 서버 시각. 진행 중 기록은 최대 1개.
- 활동 이름: trim 후 1–100자(코드포인트 기준 `[...s].length`).
- 표시 형식: 타이머 `H:MM:SS`(예 `1:24:07`), 구간 `HH:mm–HH:mm`, 길이 `1시간 24분` / `40분` / `6시간`.
- 월별 진하기 5단계: 0분 → 0, 1–120 → 1, 121–240 → 2, 241–360 → 3, 361+ → 4 (Ember 0/25/50/75/100%).
- 일별 타임라인: 1시간 = 56px, 24시간.
- 인증 없음. 포트 `3000`. 컨테이너 2개(`app`, `db`), `restart: unless-stopped`.
- UI 문구: 짧은 해요체. 스타일은 DESIGN.md 토큰을 CSS 변수로(순수 CSS, Tailwind 미사용). 사용자가 입력한 활동 이름은 세리프(`--font-serif`).
- 첫 화면에는 입력칸 + (진행 중일 때) 활동 이름·타이머·시작 시각·종료 버튼 외 아무것도 없음.

## Review Focus

1. 두 기기에서 거의 동시에 시작 → 500이 아니라 진행 중 기록이 정확히 1개 남아야 함. (Task 3 테스트 `concurrent starts leave exactly one running`)
2. 종료를 깜빡해 3일째 진행 중 → 각 날 블록은 그날 범위로 잘리고 월별 합산은 하루 최대 1440분. (Task 1 `caps a multi-day running activity at 1440 per day`)
3. 기기 시계가 서버보다 늦음 → 타이머가 음수나 `-0:00:03`이 되면 안 됨. `/api/current`가 `serverNow`를 주고 클라이언트는 오프셋 보정 + 0 하한. (Task 1 `formatTimer clamps negatives`, Task 3 `current includes serverNow`)
4. 공백만 입력 / 이모지 포함 100자 → 공백은 400, 이모지 100개는 허용(코드포인트 기준). (Task 3 `title validation`)
5. 폰이 백그라운드였다가 돌아옴 → 타이머는 누적 증가가 아니라 매 틱 `serverNow 보정된 now - startedAt`으로 계산, 그리고 `visibilitychange` 시 재조회. (Task 7 수동 확인 단계)

---

## File Structure

```
recordlife/
  package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore, .env.example
  docker-compose.yml          # db(+test DB init), app
  docker/initdb/01-test-db.sql
  Dockerfile                  # 멀티스테이지
  README.md
  shared/src/
    types.ts                  # Activity, CurrentResponse, MonthSummary
    time.ts                   # 날짜 경계, 자르기, 합산, 진하기, 포맷
    time.test.ts
  server/
    drizzle.config.ts
    drizzle/                  # 생성된 마이그레이션
    src/db/schema.ts          # activities 테이블
    src/db/client.ts          # createDb, runMigrations
    src/app.ts                # createApp({db, now})
    src/routes/activities.ts  # current/start/stop/patch/delete
    src/routes/calendar.ts    # days/months
    src/index.ts              # 진입점 + 정적 서빙
    test/helpers.ts           # 테스트 DB, 고정 시계
    test/activities.test.ts
    test/calendar.test.ts
  web/
    index.html, vite.config.ts
    src/main.tsx, src/App.tsx           # 라우터 + 상단 바
    src/styles/tokens.css, base.css     # DESIGN.md 토큰
    src/api.ts                          # fetch 래퍼
    src/useServerClock.ts               # serverNow 오프셋
    src/now/NowPage.tsx, now.css
    src/day/DayPage.tsx, layout.ts, layout.test.ts, EditSheet.tsx, day.css
    src/month/MonthPage.tsx, grid.ts, grid.test.ts, month.css
```

---

### Task 1: Workspace + shared 시간 유틸

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `shared/package.json`, `shared/tsconfig.json`, `shared/src/types.ts`, `shared/src/time.ts`
- Test: `shared/src/time.test.ts`

**Interfaces:**
- Produces (`@recordlife/shared`):
  - `ZONE = 'Asia/Seoul'`
  - `type Activity = { id: string; title: string; startedAt: string; endedAt: string | null }` (ISO 문자열)
  - `type CurrentResponse = { activity: Activity | null; serverNow: string }`
  - `type MonthSummary = Record<string, number>` (키 `yyyy-MM-dd`, 값 분)
  - `type Span = { startedAt: Date; endedAt: Date | null }`
  - `todayKey(now: Date): string` → Seoul 기준 `yyyy-MM-dd`
  - `dayRange(day: string): { start: Date; end: Date }` → Seoul 00:00 ~ 다음날 00:00
  - `clipToDay(span: Span, day: string, now: Date): { start: Date; end: Date } | null` (진행 중은 `now`까지)
  - `minutesPerDay(spans: Span[], month: string, now: Date): MonthSummary` (그 달의 모든 날 키 포함, 기록 없으면 0, 겹침은 단순 합산 후 1440 상한)
  - `intensity(minutes: number): 0 | 1 | 2 | 3 | 4`
  - `formatTimer(ms: number): string`, `formatMinutes(min: number): string`, `formatClock(d: Date): string` (Seoul `HH:mm`)
  - `titleLength(s: string): number` (코드포인트)

- [ ] **Step 1: 저장소/워크스페이스 생성**

`git init`, 루트 `package.json`(private, scripts: `test` = `pnpm -r test`, `build` = `pnpm --filter web build && pnpm --filter server build`, `dev`), `pnpm-workspace.yaml`(`shared`, `server`, `web`), `tsconfig.base.json`(strict, `module: ESNext`, `moduleResolution: Bundler`, `target: ES2022`), `.gitignore`(node_modules, dist, .env). `shared`는 소스 직접 export(`"exports": "./src/index.ts"`, 빌드 없음). 의존성: `date-fns`, `@date-fns/tz`; dev `vitest`, `typescript`.

- [ ] **Step 2: 실패하는 테스트 작성** (`shared/src/time.test.ts`)

```ts
const at = (iso: string) => new Date(iso);
test('todayKey uses Seoul', () => {
  expect(todayKey(at('2026-11-19T15:30:00Z'))).toBe('2026-11-20'); // KST 00:30
});
test('dayRange', () => {
  expect(dayRange('2026-11-20')).toEqual({ start: at('2026-11-19T15:00:00Z'), end: at('2026-11-20T15:00:00Z') });
});
test('clipToDay splits across midnight', () => {
  const s = { startedAt: at('2026-11-20T14:00:00Z'), endedAt: at('2026-11-20T16:00:00Z') }; // KST 23:00–01:00
  expect(clipToDay(s, '2026-11-20', at('2026-11-21T00:00:00Z'))).toEqual({ start: at('2026-11-20T14:00:00Z'), end: at('2026-11-20T15:00:00Z') });
  expect(clipToDay(s, '2026-11-21', at('2026-11-21T00:00:00Z'))).toEqual({ start: at('2026-11-20T15:00:00Z'), end: at('2026-11-20T16:00:00Z') });
  expect(clipToDay(s, '2026-11-22', at('2026-11-21T00:00:00Z'))).toBeNull();
});
test('caps a multi-day running activity at 1440 per day', () => {
  const s = { startedAt: at('2026-11-17T15:00:00Z'), endedAt: null }; // KST 11/18 00:00부터 진행 중
  const m = minutesPerDay([s], '2026-11', at('2026-11-20T03:00:00Z')); // KST 11/20 12:00
  expect(m['2026-11-18']).toBe(1440);
  expect(m['2026-11-19']).toBe(1440);
  expect(m['2026-11-20']).toBe(720);
  expect(m['2026-11-21']).toBe(0);
  expect(Object.keys(m)).toHaveLength(30);
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
```

- [ ] **Step 3: 실패 확인** — `pnpm --filter @recordlife/shared test` → FAIL (모듈 없음)

- [ ] **Step 4: `types.ts`, `time.ts`, `index.ts` 구현** — `TZDate`(`@date-fns/tz`)로 Seoul 기준 계산. 분은 `Math.floor(ms / 60000)`.

- [ ] **Step 5: 통과 확인** — 같은 명령 → PASS

- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: workspace and shared time utils"`

---

### Task 2: DB 스키마, 마이그레이션, docker-compose(db)

**Files:**
- Create: `docker-compose.yml`(이 단계는 `db`만), `docker/initdb/01-test-db.sql`, `.env.example`, `server/package.json`, `server/tsconfig.json`, `server/drizzle.config.ts`, `server/src/db/schema.ts`, `server/src/db/client.ts`, `server/test/helpers.ts`, `server/vitest.config.ts`
- Generate: `server/drizzle/*`

**Interfaces:**
- Produces:
  - `activities` 테이블(spec 8.2 그대로: `id uuid default gen_random_uuid()`, `title text`, `started_at`, `ended_at`, `created_at`, `updated_at`, check `ended_at > started_at`, check `char_length(title) between 1 and 100`, partial unique index `one_running ((true)) where ended_at is null`, index on `started_at`)
  - `createDb(url: string): { db: Db; close(): Promise<void> }`, `runMigrations(db: Db): Promise<void>` (`drizzle-orm/postgres-js/migrator`, 폴더 `server/drizzle`)
  - `test/helpers.ts`: `setupTestDb(): Promise<{ db: Db; reset(): Promise<void>; close(): Promise<void> }>` (`TEST_DATABASE_URL`, 기본 `postgres://recordlife:recordlife@localhost:5432/recordlife_test`, 마이그레이션 후 `reset`은 `truncate activities`), `fixedClock(iso: string): { now: () => Date; set(iso: string): void }`

- [ ] **Step 1: compose db 작성** — `postgres:17`, env `POSTGRES_USER/PASSWORD/DB = recordlife`, 포트 `5432:5432`, 볼륨 `pgdata`, `./docker/initdb:/docker-entrypoint-initdb.d`, healthcheck `pg_isready`. `01-test-db.sql`: `create database recordlife_test;`

- [ ] **Step 2: 기동 확인** — `docker compose up -d db` 후 `docker compose exec db psql -U recordlife -lqt` 출력에 `recordlife_test` 포함

- [ ] **Step 3: 스키마/클라이언트 작성 후 마이그레이션 생성** — `pnpm --filter server exec drizzle-kit generate` → `server/drizzle/0000_*.sql` 생성. partial unique index가 SQL에 없으면 생성된 SQL에 직접 추가.

- [ ] **Step 4: 스모크 테스트** (`server/test/db.test.ts`): `setupTestDb()` 후 두 번째 `ended_at null` insert가 unique violation(`code === '23505'`)으로 실패하는지 단언.

- [ ] **Step 5: 통과 확인** — `pnpm --filter server test` → PASS

- [ ] **Step 6: Commit** — `feat(server): activities schema and migrations`

---

### Task 3: 활동 API (current / start / stop / patch / delete)

**Files:**
- Create: `server/src/app.ts`, `server/src/routes/activities.ts`
- Test: `server/test/activities.test.ts`

**Interfaces:**
- Consumes: `Db`, `setupTestDb`, `fixedClock`, shared `Activity`, `CurrentResponse`, `titleLength`
- Produces: `createApp(deps: { db: Db; now?: () => Date }): Hono` (모든 라우트 `/api` 아래, `now` 기본값 `() => new Date()`); 응답 행은 `Activity`(ISO 문자열) 형태로 직렬화하는 `toActivity(row)`
- 엔드포인트 (spec 8.3):
  - `GET /api/current` → 200 `CurrentResponse`
  - `POST /api/activities/start` `{title}` → 201 `Activity`. 한 트랜잭션: 진행 중 행 `ended_at = now`, 새 행 insert. unique violation(`23505`) 시 한 번 재시도.
  - `POST /api/activities/:id/stop` → 200 `Activity`; 없음 404; 이미 종료 409
  - `PATCH /api/activities/:id` `{title?, startedAt?, endedAt?}` → 200; 진행 중 기록에 `endedAt` 주면 400; `endedAt <= startedAt` 400; 시작/종료가 `now` 이후면 400; 없음 404. `updated_at = now`.
  - `DELETE /api/activities/:id` → 204; 없음 404
  - 오류 본문 `{ error: string }`

- [ ] **Step 1: 실패하는 테스트 작성** — 각 테스트 `app.request(...)`로 호출, `fixedClock('2026-11-20T00:12:00Z')`.
  - `start creates running activity` → 201, `startedAt === '2026-11-20T00:12:00.000Z'`, `endedAt === null`; 이후 `GET /api/current`의 `activity.id` 동일
  - `current includes serverNow` → `serverNow === '2026-11-20T00:12:00.000Z'`, 진행 중 없으면 `activity === null`
  - `start while running auto-stops previous` → 시계 `00:40`으로 이동 후 두 번째 start; 첫 기록 `endedAt === '...00:40:00.000Z'`, 진행 중은 두 번째
  - `concurrent starts leave exactly one running` → `Promise.all` 5개 start, 모두 201, DB에서 `ended_at is null` 행 수 1
  - `title validation` → `'   '` 400, 101자 400, `'😀'.repeat(100)` 201, 앞뒤 공백은 trim되어 저장
  - `stop` → 200 + `endedAt`; 다시 stop 409; 없는 uuid 404
  - `patch` → 종료된 기록 title/시각 변경 200; `endedAt <= startedAt` 400; 미래 `startedAt` 400; 진행 중에 `endedAt` 400
  - `delete` → 204 후 current `null`; 없는 id 404

- [ ] **Step 2: 실패 확인** — `pnpm --filter server test activities` → FAIL

- [ ] **Step 3: 구현** — zod 스키마 + `@hono/zod-validator`; 시각 필드는 ISO 문자열로 받기.

- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS

- [ ] **Step 5: Commit** — `feat(server): activity endpoints`

---

### Task 4: 일별/월별 API

**Files:**
- Create: `server/src/routes/calendar.ts` (`createApp`에 마운트)
- Test: `server/test/calendar.test.ts`

**Interfaces:**
- Consumes: shared `dayRange`, `minutesPerDay`, `Span`
- Produces:
  - `GET /api/days/:date` (`yyyy-MM-dd`) → 200 `Activity[]`: `started_at < end and (ended_at is null or ended_at > start)`, `started_at` 오름차순. 잘린 값이 아니라 원본 행(자르기는 클라이언트가 `clipToDay`로).
  - `GET /api/months/:month` (`yyyy-MM`) → 200 `MonthSummary` (그 달과 겹치는 행을 가져와 `minutesPerDay(rows, month, now())`)
  - 형식 틀리면 400

- [ ] **Step 1: 실패하는 테스트 작성**
  - `day includes activity crossing midnight on both days` → KST 11/20 23:00–11/21 01:00 기록이 `/api/days/2026-11-20`, `/2026-11-21` 둘 다에 1건, `/2026-11-22`엔 0건
  - `day includes running activity` → 진행 중 기록이 오늘 목록에 `endedAt: null`로
  - `month sums minutes per day` → 11/20 KST 09:12–10:36(84분) + 12:05–12:50(45분) → `['2026-11-20'] === 129`, `['2026-11-01'] === 0`, 키 30개
  - `bad params` → `/api/days/2026-13-01` 400, `/api/months/2026-1` 400

- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `pnpm --filter server test` 전체 PASS
- [ ] **Step 5: Commit** — `feat(server): day and month endpoints`

---

### Task 5: 서버 진입점, Dockerfile, compose app

**Files:**
- Create: `server/src/index.ts`, `Dockerfile`, `.dockerignore`
- Modify: `docker-compose.yml` (`app` 서비스 추가), `server/package.json` (build/start 스크립트)

**Interfaces:**
- Consumes: `createApp`, `createDb`, `runMigrations`
- Produces: 실행 시 마이그레이션 → `/api/*` + `STATIC_DIR`(기본 `../web/dist`) 정적 서빙, 알 수 없는 비-API 경로는 `index.html`(SPA fallback). env `DATABASE_URL`, `PORT`(기본 3000).

- [ ] **Step 1: `index.ts` 작성** — `@hono/node-server`의 `serve`, `serveStatic`. 빌드는 `tsup`(또는 `tsc`)로 `server/dist/index.js`.
- [ ] **Step 2: Dockerfile** — stage1 `node:22-alpine`에서 `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm build`; stage2에 `server/dist`, `server/drizzle`, `web/dist`, 프로덕션 의존성만 복사. `CMD ["node","server/dist/index.js"]`.
- [ ] **Step 3: compose `app`** — `build: .`, `ports: "3000:3000"`, `DATABASE_URL=postgres://recordlife:recordlife@db:5432/recordlife`, `depends_on: db (service_healthy)`, `restart: unless-stopped`. `db`에도 `restart: unless-stopped`. (web 빌드는 Task 6에서 생기므로 이 단계 확인 시 `web/dist`가 비어 있어도 API는 동작해야 함 — 정적 폴더가 없으면 경고만.)
- [ ] **Step 4: 확인** — `docker compose up -d --build` 후 `curl -s localhost:3000/api/current` → `{"activity":null,"serverNow":"..."}`
- [ ] **Step 5: Commit** — `feat: server entry, Dockerfile, compose app`

---

### Task 6: Web 골격 (토큰, 상단 바, 라우터, API 클라이언트) + DESIGN.md 갱신

**Files:**
- Create: `web/package.json`, `web/index.html`, `web/vite.config.ts`, `web/tsconfig.json`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/styles/tokens.css`, `web/src/styles/base.css`, `web/src/api.ts`, `web/src/useServerClock.ts`
- Modify: `DESIGN.md` (spec 8.6: Product Context, Layout 내비게이션, Components, Decisions Log 한 줄)

**Interfaces:**
- Produces:
  - 라우트: `/` → `NowPage`, `/day` → 오늘로 redirect, `/day/:date` → `DayPage`, `/month` → 이번 달 redirect, `/month/:month` → `MonthPage` (Task 7–9에서 채움; 이 단계는 placeholder)
  - `api.ts`: `getCurrent(): Promise<CurrentResponse>`, `start(title: string): Promise<Activity>`, `stop(id: string): Promise<Activity>`, `patch(id: string, body: Partial<{title: string; startedAt: string; endedAt: string}>): Promise<Activity>`, `remove(id: string): Promise<void>`, `getDay(date: string): Promise<Activity[]>`, `getMonth(month: string): Promise<MonthSummary>`. 실패 시 `ApiError(status, message)` throw.
  - `useServerClock(serverNow: string | undefined): () => Date` — `offset = Date.parse(serverNow) - Date.now()` 기억, 보정된 now 반환
  - `useRefetchOnFocus(fn: () => void)` — `visibilitychange`(visible) / `focus` 시 호출 (`useServerClock.ts`에 함께)
- 상단 바: 좌측 워드마크 `record`+Ember `life`(세리프), 우측 세그먼트 `지금 · 일 · 월`(활성 경로 표시), glass 배경 sticky. 본문 중앙 컬럼 `max-width: 640px`, 좌우 20px.
- `tokens.css`: `design-preview.html`의 `:root`/다크 변수 그대로(다크는 `prefers-color-scheme`만), 폰트 링크는 `index.html`에.
- `vite.config.ts`: dev 서버 `/api` → `http://localhost:3000` 프록시. `<meta name="viewport" ... viewport-fit=cover>`, `theme-color`.

- [ ] **Step 1: 구성 작성**
- [ ] **Step 2: 확인** — 터미널 A `pnpm --filter server dev`(tsx watch, `DATABASE_URL` localhost), 터미널 B `pnpm --filter web dev`; 브라우저에서 `/`, `/day`, `/month` 이동 시 세그먼트 활성 변경, 라이트/다크(시스템) 토큰 적용, 390px 폭에서 가로 스크롤 없음
- [ ] **Step 3: DESIGN.md 갱신**
- [ ] **Step 4: Commit** — `feat(web): app shell, tokens, api client`

---

### Task 7: 지금 화면

**Files:**
- Create: `web/src/now/NowPage.tsx`, `web/src/now/now.css`

**Interfaces:**
- Consumes: `getCurrent`, `start`, `stop`, `useServerClock`, `useRefetchOnFocus`, shared `formatTimer`, `formatClock`, `titleLength`

동작 (spec 7.1):
- 입력칸 placeholder `지금 뭐 하고 있나요?`, 자동 포커스, `maxLength` 대신 `titleLength > 100`이면 버튼 비활성. Enter 또는 `시작` 버튼(Ember, 48px)으로 시작. 빈 입력(trim)이면 비활성. 시작 성공 시 입력칸 비움.
- 진행 중이면 입력칸 위에: 활동 이름(세리프 26/600), 타이머(tabular, 56px weight 300, 1초 간격 `setInterval`, 값은 매 틱 `formatTimer(clock() - startedAt)`), `HH:mm 시작`(footnote), `종료` 버튼(secondary). 진행 중일 때 입력 placeholder는 `다음에 할 일`, 시작하면 이전 기록은 서버가 자동 종료.
- `document.title`: 진행 중 `1:24 회사 이슈 처리`(시:분), 아니면 `recordlife`.
- 포커스 복귀 시 `getCurrent` 재조회. 요청 실패 시 입력칸 아래 한 줄 오류 `연결이 불안정해요. 다시 시도해 주세요.`(error 색).
- 그 외 요소 없음.

- [ ] **Step 1: 구현**
- [ ] **Step 2: 브라우저 확인** (dev 서버 두 개 띄운 상태)
  - 입력 `회사 이슈 처리` + Enter → 타이머 증가
  - F5 → 같은 활동, 타이머가 0으로 돌아가지 않음
  - 탭을 닫았다 다시 열기 → 유지
  - 진행 중 `점심` 입력 + Enter → 활동 교체, `/api/days/<오늘>`에 두 건, 첫 건 종료됨
  - `종료` → 입력칸만 남음
  - `   `(공백) → 버튼 비활성
  - 390px 폭과 데스크톱 폭 스크린샷 확인, 다크 모드 확인
- [ ] **Step 3: Commit** — `feat(web): now screen`

---

### Task 8: 일 화면 (타임라인 + 수정 시트)

**Files:**
- Create: `web/src/day/layout.ts`, `web/src/day/DayPage.tsx`, `web/src/day/EditSheet.tsx`, `web/src/day/day.css`, `web/vitest.config.ts`
- Test: `web/src/day/layout.test.ts`

**Interfaces:**
- Consumes: `getDay`, `patch`, `remove`, `stop`, shared `clipToDay`, `dayRange`, `formatClock`, `formatMinutes`, `todayKey`
- Produces: `layoutBlocks(items: { id: string; start: Date; end: Date }[], dayStart: Date, hourPx = 56): { id: string; top: number; height: number; col: number; cols: number }[]` — `top/height`는 분 × `hourPx/60`, 최소 높이 14px; 서로 겹치는 블록 묶음 안에서 탐욕적 열 배정, `cols`는 그 묶음의 열 수.

- [ ] **Step 1: 실패하는 테스트** (`layout.test.ts`)
  - `positions by minutes` → 09:12–10:36 → `top === 9.2*56`, `height === 1.4*56`, `col 0`, `cols 1`
  - `overlapping blocks share columns` → 09:00–10:00, 09:30–11:00, 10:30–11:30 → cols 모두 2, col은 [0,1,0]
  - `non-overlapping blocks get full width` → 09–10, 10–11 → 둘 다 `cols 1`
  - `min height` → 1분 기록 height `14`
- [ ] **Step 2: 실패 확인** — `pnpm --filter web test` → FAIL
- [ ] **Step 3: `layoutBlocks` 구현 → PASS 확인**
- [ ] **Step 4: DayPage 구현** (spec 7.2)
  - 헤더: `‹  11월 20일 금요일  ›` + 우측 `총 6시간 40분`(그날 잘린 합). 미래로 이동 불가(› 비활성). 좌우 스와이프(터치 이동 ≥ 60px)로도 이동.
  - 0–24시 눈금(시 라벨 footnote, 0.5px 선). 블록: surface 배경, `--line` 0.5px 테두리, radius 10, 이름 세리프, 아래 `09:12–10:36`; height < 20분 분량이면 이름 한 줄만. 진행 중 블록은 Ember 테두리, `now`까지.
  - 오늘이면 현재 시각선(Ember 1px)과 그 위치로 스크롤, 아니면 첫 블록으로 스크롤. 기록 없으면 가운데 `기록이 없어요`(text-2).
- [ ] **Step 5: EditSheet 구현** — 블록 탭 시 바텀 시트(radius 24, 시트 곡선 450ms): 이름 입력, 시작/종료 `<input type="datetime-local">`(Seoul 기준 값으로 변환), `저장`(Ember) / `삭제`(error 텍스트, `confirm('이 기록을 삭제할까요?')`) / 진행 중이면 종료 입력 대신 `지금 종료` 버튼. 서버 400 메시지는 시트 안 한 줄로 표시.
- [ ] **Step 6: 브라우저 확인** — 자정 넘긴 기록을 PATCH로 만들어 양쪽 날 표시 확인, 겹치는 기록 나란히 표시, 수정·삭제 반영, 390px/데스크톱/다크.
- [ ] **Step 7: Commit** — `feat(web): day timeline and edit sheet`

---

### Task 9: 월 화면

**Files:**
- Create: `web/src/month/grid.ts`, `web/src/month/MonthPage.tsx`, `web/src/month/month.css`
- Test: `web/src/month/grid.test.ts`

**Interfaces:**
- Consumes: `getMonth`, shared `intensity`, `todayKey`, `formatMinutes`
- Produces: `monthGrid(month: string): (string | null)[]` — 일요일 시작 7열, 앞쪽 빈칸 `null`, 길이는 7의 배수

- [ ] **Step 1: 실패하는 테스트**
  - `2026-11 starts on Sunday` → `grid[0] === '2026-11-01'`, 길이 35
  - `2026-02 leading blanks` → 2026-02-01은 일요일 → `grid[0] === '2026-02-01'`, 길이 28
  - `2026-10 leading blanks` → 2026-10-01은 목요일 → 앞 `null` 4개, `grid[4] === '2026-10-01'`
- [ ] **Step 2: 실패 확인 → 구현 → PASS 확인** (`pnpm --filter web test`)
- [ ] **Step 3: MonthPage 구현** (spec 7.3) — 헤더 `‹  2026년 11월  ›`(미래 달 이동 불가), 요일 줄 `일 월 화 수 목 금 토`(footnote), 각 칸에 지름 32px 원: 0단계는 `--line` 테두리만, 1–4단계는 Ember 배경 opacity 0.25/0.5/0.75/1, 원 아래 날짜 숫자(tabular, 12px). 오늘은 원 바깥 2px `--text` 링. 미래 날짜는 opacity 0.35. 원 탭 → `/day/:date`. `title` 속성에 `formatMinutes` 값.
- [ ] **Step 4: 브라우저 확인** — 기록 있는 날 진하기, 오늘 링, 날짜 이동, 390px/데스크톱/다크
- [ ] **Step 5: Commit** — `feat(web): month view`

---

### Task 10: README + 전체 검증

**Files:**
- Create: `README.md`

- [ ] **Step 1: README 작성** — 한 줄 소개, 로컬 개발(`docker compose up -d db`, `pnpm i`, `pnpm dev`), 노트북 배포(`docker compose up -d --build`), Tailscale 설치 후 `http://<tailscale-ip>:3000` 접속, `tailscale serve --bg 3000`으로 HTTPS, 백업 한 줄(`docker compose exec db pg_dump -U recordlife recordlife > backup.sql`).
- [ ] **Step 2: 전체 테스트** — `pnpm test` → shared/server/web 모두 PASS
- [ ] **Step 3: 운영 이미지 확인** — `docker compose up -d --build` → `http://localhost:3000`에서 시작 → F5 → 종료 → 일/월 화면 반영; `docker compose restart app` 후에도 진행 중 기록 유지
- [ ] **Step 4: Commit** — `docs: README and deploy notes`
