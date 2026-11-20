# Design System — recordlife

> 쓸 때는 앱처럼, 읽을 때는 책처럼.
> Visual reference: `design-preview.html` (open in a browser; light/dark toggle top right).

## Product Context
- **What this is:** 1인용 활동 기록. 지금 하는 일을 한 줄로 적고 시작/종료하면, 하루가 시간 블록으로 남는다. (스펙: `docs/superpowers/specs/2026-11-20-recordlife-design.md`)
- **Who it's for:** 본인 한 명. 집 노트북에 띄우고 VPN으로 폰과 PC에서 접속.
- **Space/industry:** Time log / life log. Peers: Day One, Apple Journal (톤), 타임 트래커들 (기능).
- **Project type:** 반응형 웹앱 (폰 + 데스크톱). Desktop은 중앙 단일 컬럼.
- **원칙:** 화면에 보이는 것은 최소한. 첫 화면은 입력칸 하나.

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
- **Dark mode:** 없음. 라이트 모드만 쓴다 (`color-scheme: light`). 표의 Dark 열은 참고용으로만 남긴다.

## Spacing
- **Base unit:** 4px
- **Density:** comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md-(12) md(16) **screen gutter(20)** lg(24) xl(32) 2xl(48) 3xl(64)
- **Touch target:** 최소 44×44px. 리스트 행 높이 50px, 기본 버튼 48px, 작은 pill 버튼 34px.

## Layout
- **Approach:** grid-disciplined, iOS 문법 (Large Title → content → floating glass tab bar)
- **Mobile:** 단일 컬럼, 좌우 여백 20px, 기준 폭 390px
- **Desktop:** 중앙 컬럼 max-width 640px (읽기 본문은 max 600px, 약 32–36자/줄)
- **Navigation:** 상단 glass 바 하나. 좌측 워드마크, 우측 작은 세그먼트 `지금 · 일 · 월`. 하단 탭바와 FAB는 쓰지 않는다. 기록 수정은 바텀 시트.
- **Day timeline:** 세로 24시간, 1시간 = 56px. 빈 시간은 여백 그대로.
- **Month:** 7열 달력, 날마다 지름 32px 원. 진하기 = 기록 시간 5단계(Ember 0/25/50/75/100%).
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
- **Now (대기):** 날짜(15/600, text-2) + 큰 시계(`HH:mm`, 72–104px/200) + 세리프 질문 `지금, 무엇을 하고 있나요?`.
- **Now (진행 중):** Ember-soft 칩(맥박 점 + `진행 중 · HH:mm 시작`) + 활동 이름(세리프 26–32/600) + 타이머(56–76px/200) + 흰 pill 종료 버튼(■ 아이콘).
- **Composer:** 높이 60 pill, surface + 그림자, 세리프 입력, 오른쪽 44px Ember 원형 → 버튼. 포커스 시 Ember 1.5px 링.
- **Today ribbon:** 24시간 10px 막대(시간 눈금), 기록은 Ember 70%, 진행 중 100%, 현재 시각 2px 표식, 아래 `오늘 N시간 M분 기록했어요`. 누르면 일 보기.
- **배경:** Now 화면만 상단에서 은은한 Ember 빛(radial, 10% 이하). 진행 중일 때 살짝 더 따뜻하게.
- **Time block:** surface 배경, `--line` 0.5px 테두리, radius 10, 이름 세리프 + `HH:mm–HH:mm`. 진행 중은 Ember 테두리. 현재 시각선 Ember 1px.
- **Ember 사용처:** 시작 버튼, 진행 중 표시, 현재 시각선, 월별 원 진하기, 활성 포커스.
- 일기 미리보기의 연속 기록 카드, 사진 썸네일, 기분 칩은 사용하지 않는다 (design-preview.html은 톤 참고용).

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
| 2026-11-20 | 다크 모드 제거, Now 화면 재디자인(큰 시계, pill 입력, 오늘 리본) | 사용자: 입력칸만 있어 비어 보임, 화이트 모드만 원함 |
| 2026-11-20 | 제품을 활동 타이머로 전환, 내비게이션을 상단 세그먼트로 | 사용자가 "순간 기록 + 시간 블록" 서비스로 정의. 토큰은 유지, 화면 구성만 변경 |
| 2026-11-20 | Initial design system created | /design-consultation. 개인 일상 기록, 모바일 우선 웹앱, "애플 느낌" 요청. Day One/Apple Journal 조사 후 애플 문법 + 세리프 본문 + 따뜻한 중립색으로 차별화 |
