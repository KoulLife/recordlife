import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import {
  clipToDay,
  dayLabel,
  dayRange,
  formatClock,
  formatMinutes,
  shiftDay,
  todayKey,
  type Activity,
} from '@recordlife/shared';
import * as api from '../api';
import { useRefetchOnFocus, useServerClock, useTick } from '../useServerClock';
import EditSheet from './EditSheet';
import { layoutBlocks } from './layout';
import './day.css';

const HOUR = 56;
const TWO_LINE_PX = 44; // below this a block shows title and time on one line
const TITLE_ONLY_PX = 22; // below this only the title fits

export default function DayPage() {
  const { date = '' } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [serverNow, setServerNow] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const clock = useServerClock(serverNow);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const today = todayKey(clock());
  const isToday = date === today;
  const isFuture = date > today;

  const load = useCallback(async () => {
    if (!valid) return;
    try {
      const [list, cur] = await Promise.all([api.getDay(date), api.getCurrent()]);
      setItems(list);
      setServerNow(cur.serverNow);
      setError(null);
    } catch {
      setError('기록을 불러오지 못했어요. 다시 시도해 주세요.');
    }
  }, [date, valid]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);
  useRefetchOnFocus(load);

  const hasRunning = !!items?.some((a) => !a.endedAt);
  useTick(isToday || hasRunning, 30_000);

  const now = clock();
  const { start: dayStart } = dayRange(date || today);

  const clipped = useMemo(
    () =>
      (items ?? []).flatMap((a) => {
        const c = clipToDay({ startedAt: new Date(a.startedAt), endedAt: a.endedAt ? new Date(a.endedAt) : null }, date, now);
        return c ? [{ activity: a, ...c }] : [];
      }),
    // `now` changes every tick; recompute with it so running blocks grow.
    [items, date, now.getTime()], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const layout = useMemo(
    () => layoutBlocks(clipped.map((c) => ({ id: c.activity.id, start: c.start, end: c.end })), dayStart, HOUR),
    [clipped, dayStart.getTime()], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const totalMin = Math.min(
    1440,
    Math.floor(clipped.reduce((sum, c) => sum + (c.end.getTime() - c.start.getTime()), 0) / 60000),
  );
  const nowTop = ((now.getTime() - dayStart.getTime()) / 3_600_000) * HOUR;

  // Scroll once per day: to the current time on today, otherwise to the first block.
  useLayoutEffect(() => {
    if (!items || scrolledFor.current === date || !timelineRef.current) return;
    scrolledFor.current = date;
    const target = isToday ? nowTop : layout.length ? Math.min(...layout.map((l) => l.top)) : 8 * HOUR;
    const base = timelineRef.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, base + target - window.innerHeight / 3) });
  }, [items, date, isToday, layout, nowTop]);

  // Swipe left/right to change day.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) navigate(`/day/${shiftDay(date, -1)}`);
    else if (!isToday) navigate(`/day/${shiftDay(date, 1)}`);
  };

  if (!valid || isFuture) return <Navigate to={`/day/${today}`} replace />;

  return (
    <main className="page day" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="day-head">
        <Link className="icon-btn" to={`/day/${shiftDay(date, -1)}`} aria-label="이전 날">
          <Chevron dir="left" />
        </Link>
        <h1 className="day-title">{dayLabel(date)}</h1>
        {isToday ? (
          <span className="icon-btn" aria-hidden="true" />
        ) : (
          <Link className="icon-btn" to={`/day/${shiftDay(date, 1)}`} aria-label="다음 날">
            <Chevron dir="right" />
          </Link>
        )}
      </div>
      <p className="day-total num">{items ? `총 ${formatMinutes(totalMin)}` : ' '}</p>
      {error && <p className="error-line">{error}</p>}

      <div className="timeline" ref={timelineRef} style={{ height: 24 * HOUR }}>
        {Array.from({ length: 25 }, (_, h) => (
          <div key={h} className="hour" style={{ top: h * HOUR }}>
            <span className="hour-label num">{String(h % 24).padStart(2, '0')}</span>
          </div>
        ))}

        <div className="blocks">
          {clipped.map((c, i) => {
            const l = layout[i];
            const running = !c.activity.endedAt;
            const short = l.height < TWO_LINE_PX;
            const titleOnly = l.height < TITLE_ONLY_PX;
            return (
              <button
                key={c.activity.id}
                className={`block${running ? ' running' : ''}${short ? ' short' : ''}`}
                style={{
                  top: l.top,
                  height: l.height,
                  left: `calc(${(l.col / l.cols) * 100}% + ${l.col ? 2 : 0}px)`,
                  width: `calc(${100 / l.cols}% - ${l.cols > 1 ? 2 : 0}px)`,
                }}
                onClick={() => setEditing(c.activity)}
              >
                <span className="block-title serif">{c.activity.title}</span>
                {!titleOnly && (
                  <span className="block-time num">
                    {formatClock(new Date(c.activity.startedAt))}–
                    {c.activity.endedAt ? formatClock(new Date(c.activity.endedAt)) : '진행 중'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isToday && <div className="now-line" style={{ top: nowTop }} aria-hidden="true" />}
        {items && clipped.length === 0 && <p className="day-empty">기록이 없어요</p>}
      </div>

      {editing && (
        <EditSheet
          activity={editing}
          now={clock}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </main>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d={dir === 'left' ? 'M8 2 2 8l6 6' : 'm2 2 6 6-6 6'} />
    </svg>
  );
}
