# recordlife

지금 하는 일을 한 줄로 적고 시작/종료하면, 하루가 시간 블록으로 남는 1인용 활동 기록.

- **지금**: 입력하고 Enter → 타이머 시작. 진행 중에 새로 입력하면 이전 기록은 자동 종료.
- **일**: 24시간 타임라인. 블록을 누르면 이름·시각 수정, 삭제.
- **월**: 날마다 원 하나. 기록 시간이 많을수록 진해짐.

스택: React + Vite / Hono / PostgreSQL / Drizzle, pnpm workspace (`shared`, `server`, `web`).
설계: [`docs/superpowers/specs/2026-11-20-recordlife-design.md`](docs/superpowers/specs/2026-11-20-recordlife-design.md), 디자인 토큰: [`DESIGN.md`](DESIGN.md).

## 노트북에 배포

Docker만 있으면 됩니다.

```bash
docker compose up -d --build
```

`http://localhost:3000` 에서 열립니다. DB 데이터는 `pgdata` 볼륨에 남고, 두 컨테이너 모두 재부팅 후 자동으로 다시 뜹니다(`restart: unless-stopped`, Docker가 부팅 시 실행되도록 설정해 두세요).

업데이트:

```bash
git pull && docker compose up -d --build
```

## 폰/다른 PC에서 접속 (Tailscale)

앱과 DB 포트는 노트북 자신(`127.0.0.1`)에만 열려 있습니다. 카페 와이파이 같은 같은 네트워크의 다른 기기에서는 접근할 수 없고, Tailscale을 통해서만 들어옵니다.

1. 노트북과 폰에 [Tailscale](https://tailscale.com/download) 설치 후 같은 계정으로 로그인
2. 노트북에서 한 번 실행 (재부팅 후에도 유지):

```bash
tailscale serve --bg 3000
```

3. 폰/다른 PC에서 `https://<노트북 이름>.<tailnet>.ts.net` 으로 접속 (HTTPS라 홈 화면에 앱처럼 추가도 가능)

앱 자체 로그인은 없습니다. tailnet 밖으로 공개하는 `tailscale funnel`은 쓰지 마세요.

## 백업

```bash
docker compose exec db pg_dump -U recordlife recordlife > backup.sql
```

복구: `docker compose exec -T db psql -U recordlife recordlife < backup.sql`

## 로컬 개발

Node 22, pnpm 10, Docker 필요.

```bash
cp .env.example .env
docker compose up -d db
pnpm install
pnpm dev
```

- 웹: `http://localhost:5173` (`/api`는 3000으로 프록시)
- API: `http://localhost:3000`
- 테스트: `pnpm test` (서버 테스트는 `recordlife_test` DB 사용, `docker compose up -d db` 필요)
- 스키마 변경 후: `pnpm --filter server db:generate` → 서버 시작 시 자동 마이그레이션

개발 중에는 `app` 컨테이너가 3000 포트를 쓰지 않도록 `docker compose stop app` 하세요.
