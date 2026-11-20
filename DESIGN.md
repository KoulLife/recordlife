# Design System — recordlife

> 쓸 때는 앱처럼, 읽을 때는 책처럼.
> Visual reference: `design-preview.html` (open in a browser; light/dark toggle top right).

## Product Context
- **What this is:** 개인 일상 기록 서비스. 하루의 글, 사진, 장소, 기분을 짧게 남기고 다시 꺼내 읽는다.
- **Who it's for:** 매일 혹은 자주 하루를 기록하고 싶은 개인 사용자.
- **Space/industry:** Journaling / life log. Peers: Day One, Apple Journal, Journey.
- **Project type:** Mobile-first web app (PWA). Desktop은 중앙 단일 컬럼.

## Aesthetic Direction
- **Direction:** Refined Minimal, Apple HIG 문법
- **Decoration level:** minimal. 유일한 장식은 내비게이션/컨트롤의 반투명 블러(glass). 콘텐츠에는 glass를 쓰지 않는다.
- **Mood:** 틀(UI)은 애플 기본 앱처럼 익숙하고 조용하게. 내용(내가 쓴 글)은 종이 위 활자처럼 따뜻하게.
- **Reference:** Apple Journal, Day One, Apple HIG (Large Title, Inset Grouped, Liquid Glass)

### Deliberate departures (recordlife만의 얼굴)
1. **기록 본문은 세리프(마루부리).** 애플 앱은 전부 산세리프. 다시 읽을 때 책처럼 느껴지게.
2. **따뜻한 종이색 중립색.** 애플의 차가운 `#F2F2F7` 대신 `#F6F4F1`.
3. **날짜가 주인공.** 목록에서 큰 숫자 날짜(30px, weight 300)가 왼쪽 축을 만든다.

## Typography
- **UI / Labels / Body:** Pretendard Variable. SF Pro와 가장 가까운 한글 서체.
- **Entry title & body (사용자가 쓴 글만):** MaruBuri (fallback: Noto Serif KR)
- **Numbers / dates:** Pretendard + `font-variant-numeric: tabular-nums`
- **Code:** 필요 시 `ui-monospace, SF Mono, monospace`
- **Loading:**
  - `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
  - `https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css` (프로덕션에서는 self-host + subset 권장)
- **Stacks:**
  - `--font-ui: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
  - `--font-serif: "MaruBuri", "Noto Serif KR", serif`
- **Global:** `letter-spacing: -0.01em; word-break: keep-all;` (한글 단어 중간 줄바꿈 금지)

| Role | Font | Size / Weight / Line-height | Tracking |
|---|---|---|---|
| Large Title | UI | 34 / 700 / 1.2 | -3% |
| Section title | UI | 28 / 700 | -2.5% |
| Entry Title (read) | Serif | 26 / 600 / 1.3 | -3% |
| Entry Title (list) | Serif | 16.5 / 600 / 1.35 | -2% |
| Headline | UI | 17 / 600 | -1% |
| Entry Body | Serif | 16.5 / 400 / **1.85** | -1% |
| Body | UI | 16 / 400 / 1.5 | -1% |
| Subhead / list preview | Serif | 14 / 400 / 1.55 | |
| Footnote | UI | 13 / 500 | |
| Caption / tab label | UI | 10.5–12 / 500 | |
| Date Numeral | UI tabular | 30 / 300 / 1 | -4% |

Inputs는 iOS 자동 확대 방지를 위해 최소 16px.

## Color
- **Approach:** restrained. 포인트 색은 Ember 하나. 색은 드물고 의미 있게.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#F6F4F1` | `#000000` | 앱 배경 |
| `--surface` | `#FFFFFF` | `#1C1C1E` | 카드, 시트 |
| `--surface-2` | `#EFECE7` | `#2C2C2E` | 입력, 세그먼트, 보조 버튼, 태그 |
| `--text` | `#1C1B1A` | `#F5F3F0` | 본문 |
| `--text-2` | `#8A8580` | `#98938E` | 보조 텍스트, 메타 |
| `--text-3` | `#B5B0AA` | `#5E5A56` | placeholder, 비활성 |
| `--line` | `#E6E2DC` | `#2E2D2B` | 0.5px 구분선 |
| `--ember` | `#F26B3A` | `#FF7A4A` | **Primary.** 기록 버튼(FAB), 오늘 날짜, 연속 기록, 활성 탭, 포커스 링 |
| `--ember-soft` | `#FDE9E1` | `#3A1F15` | Ember 배경 틴트 |
| `--glass` | `rgba(255,255,255,.72)` | `rgba(30,30,32,.72)` | 탭바, 툴바, 상단바 + `backdrop-filter: saturate(180%) blur(20–24px)` |

- **Semantic (iOS system):** success `#34C759` / `#30D158`, warning `#FF9F0A` / `#FFB340`, error `#FF3B30` / `#FF453A`, info `#0A84FF` / `#409CFF`. 알림 배경은 해당 색 12–14% 틴트.
- **Ember 사용 규칙:** 한 화면에 Ember 요소는 1–2개까지. 장식용으로 쓰지 않는다. 그라디언트 금지.
- **Dark mode:** 애플 방식. 순수 검정 배경 + `#1C1C1E` 표면. Ember는 살짝 밝게(`#FF7A4A`). 시스템 설정을 따르되 사용자 수동 전환 지원.

## Spacing
- **Base unit:** 4px
- **Density:** comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md-(12) md(16) **screen gutter(20)** lg(24) xl(32) 2xl(48) 3xl(64)
- **Touch target:** 최소 44×44px. 리스트 행 높이 50px, 기본 버튼 48px, 작은 pill 버튼 34px.

## Layout
- **Approach:** grid-disciplined, iOS 문법 (Large Title → content → floating glass tab bar)
- **Mobile:** 단일 컬럼, 좌우 여백 20px, 기준 폭 390px
- **Desktop:** 중앙 컬럼 max-width 640px (읽기 본문은 max 600px, 약 32–36자/줄)
- **Navigation:** 하단 floating glass 탭바(기록 · 캘린더 · 사진) + 우측 Ember FAB(+ 새 기록). 새 기록 작성은 바텀 시트.
- **Lists:** Inset Grouped. 구분선은 0.5px, 아이콘/날짜 열 다음부터 시작.
- **Border radius:** tag 6 · control 10 · button 14 · card 16 · sheet 24 · pill/tab bar 999
- **Shadow:** `0 1px 2px rgba(28,27,26,.04), 0 8px 24px rgba(28,27,26,.06)` 한 단계만. 다크 모드에서는 그림자 대신 표면 밝기로 위계.

## Motion
- **Approach:** intentional. 이해를 돕는 전환만, 튀는 장식 모션 없음.
- **Easing (단일):** `cubic-bezier(0.32, 0.72, 0, 1)` (iOS sheet curve)
- **Duration:** micro 100–150ms (press, toggle) · short 200–250ms (fade, segment) · medium 300ms (page push) · sheet 450ms
- **Press feedback:** `transform: scale(.97)`
- **`prefers-reduced-motion`:** 모든 transition/animation 제거

## Components (reference: design-preview.html)
- **Buttons:** Primary(Ember 배경, 흰 글자), Secondary(surface-2), Ghost(Ember 텍스트), Small pill(34px, radius 999)
- **Input:** surface-2 배경, 테두리 없음, 포커스 시 Ember 1.5px inset ring
- **Segmented control:** surface-2 트랙 + surface 선택 칩
- **Toggle:** iOS 51×31, on = success green
- **Entry list row:** [날짜 숫자 + 요일] [세리프 제목 + 2줄 미리보기 + 태그] [58px 썸네일(선택)]
- **Streak card:** Ember-soft 아이콘 + 주간 막대 7개

## Anti-patterns (하지 말 것)
- 보라색/그라디언트 포인트, 그라디언트 버튼
- 콘텐츠 카드에 glass/blur
- 아이콘 원형 배경 3열 기능 그리드
- 모든 요소에 같은 큰 radius
- UI 요소에 세리프 사용 (세리프는 사용자가 쓴 글 전용)
- Inter / Roboto 등을 주 서체로 사용

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-20 | Initial design system created | /design-consultation. 개인 일상 기록, 모바일 우선 웹앱, "애플 느낌" 요청. Day One/Apple Journal 조사 후 애플 문법 + 세리프 본문 + 따뜻한 중립색으로 차별화 |
