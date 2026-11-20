import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  dayLabel,
  formatClock,
  formatMinutes,
  formatTimer,
  titleLength,
  todayKey,
  type Activity,
  type CurrentResponse,
} from '@recordlife/shared';
import * as api from '../api';
import { useRefetchOnFocus, useServerClock, useTick } from '../useServerClock';
import { ribbonSegments } from './ribbon';
import './now.css';

const ERROR = '연결이 불안정해요. 다시 시도해 주세요.';

export default function NowPage() {
  const [current, setCurrent] = useState<CurrentResponse | null>(null);
  const [today, setToday] = useState<Activity[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clock = useServerClock(current?.serverNow);

  const load = useCallback(async () => {
    try {
      const cur = await api.getCurrent();
      const day = todayKey(new Date(cur.serverNow));
      const list = await api.getDay(day);
      setCurrent(cur);
      setToday(list);
      setError(null);
    } catch {
      setError(ERROR);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefetchOnFocus(load);
  useTick(true);

  const now = clock();
  const day = todayKey(now);
  const running = current?.activity ?? null;
  const timer = running ? formatTimer(now.getTime() - Date.parse(running.startedAt)) : '';

  useEffect(() => {
    document.title = running ? `${timer.slice(0, -3)} ${running.title}` : 'recordlife';
  }, [running, timer]);
  useEffect(() => () => void (document.title = 'recordlife'), []);

  const segments = ribbonSegments(today, day, now);
  const todayMin = Math.min(1440, Math.floor(segments.reduce((s, x) => s + x.width, 0) * 14.4));
  const nowPct = ((now.getTime() - Date.parse(`${day}T00:00:00+09:00`)) / 86_400_000) * 100;

  const trimmed = title.trim();
  const canStart = !busy && titleLength(trimmed) >= 1 && titleLength(trimmed) <= 100;

  const onStart = async (e: FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    setBusy(true);
    try {
      await api.start(trimmed);
      setTitle('');
      await load();
    } catch (err) {
      setError(err instanceof api.ApiError && err.status === 400 ? err.message : ERROR);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onStop = async () => {
    if (!running) return;
    setBusy(true);
    try {
      await api.stop(running.id);
      await load();
    } catch {
      setError(ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`page now${running ? ' is-running' : ''}`}>
      <div className="now-glow" aria-hidden="true" />

      <section className="now-hero" aria-live="polite">
        {running ? (
          <>
            <span className="now-chip num">
              <span className="now-pulse" />
              진행 중 · {formatClock(new Date(running.startedAt))} 시작
            </span>
            <h1 className="now-title serif">{running.title}</h1>
            <div className="now-timer num">{timer}</div>
            <button className="now-stop" onClick={onStop} disabled={busy}>
              <span className="now-stop-icon" aria-hidden="true" />
              종료
            </button>
          </>
        ) : (
          <>
            <p className="now-date">{dayLabel(day)}</p>
            <div className="now-clock num">{formatClock(now)}</div>
            <p className="now-prompt serif">지금, 무엇을 하고 있나요?</p>
          </>
        )}
      </section>

      <form className="composer" onSubmit={onStart}>
        <input
          ref={inputRef}
          className="composer-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={running ? '다음에 할 일' : '예: 회사 이슈 처리'}
          aria-label="활동 이름"
          autoFocus
          enterKeyHint="go"
        />
        <button className="composer-go" type="submit" disabled={!canStart} aria-label="시작">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
      {error && <p className="error-line now-error">{error}</p>}

      <Link to={`/day/${day}`} className="ribbon-wrap" aria-label={`오늘 ${formatMinutes(todayMin)} 기록, 일 보기로 이동`}>
        <div className="ribbon">
          {segments.map((s) => (
            <span
              key={s.id}
              className={`ribbon-seg${s.running ? ' running' : ''}`}
              style={{ left: `${s.left}%`, width: `max(${s.width}%, 2px)` }}
            />
          ))}
          <span className="ribbon-now" style={{ left: `${Math.min(100, Math.max(0, nowPct))}%` }} />
        </div>
        <div className="ribbon-scale num" aria-hidden="true">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <p className="ribbon-total">
          {todayMin > 0 ? (
            <>
              오늘 <b className="num">{formatMinutes(todayMin)}</b> 기록했어요
            </>
          ) : (
            '오늘 첫 기록을 남겨 보세요'
          )}
        </p>
      </Link>
    </main>
  );
}
