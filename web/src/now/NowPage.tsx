import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { formatClock, formatTimer, titleLength, type CurrentResponse } from '@recordlife/shared';
import * as api from '../api';
import { useRefetchOnFocus, useServerClock, useTick } from '../useServerClock';
import './now.css';

const ERROR = '연결이 불안정해요. 다시 시도해 주세요.';

export default function NowPage() {
  const [current, setCurrent] = useState<CurrentResponse | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clock = useServerClock(current?.serverNow);

  const load = useCallback(async () => {
    try {
      setCurrent(await api.getCurrent());
      setError(null);
    } catch {
      setError(ERROR);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefetchOnFocus(load);

  const running = current?.activity ?? null;
  useTick(!!running);

  const elapsed = running ? clock().getTime() - Date.parse(running.startedAt) : 0;
  const timer = formatTimer(elapsed);

  useEffect(() => {
    document.title = running ? `${timer.slice(0, -3)} ${running.title}` : 'recordlife';
  }, [running, timer]);
  useEffect(() => () => void (document.title = 'recordlife'), []);

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
    <main className="page now">
      {running && (
        <section className="now-running" aria-live="polite">
          <h1 className="now-title serif">{running.title}</h1>
          <div className="now-timer num">{timer}</div>
          <div className="now-since num">{formatClock(new Date(running.startedAt))} 시작</div>
          <button className="btn btn-secondary now-stop" onClick={onStop} disabled={busy}>
            종료
          </button>
        </section>
      )}

      <form className={running ? 'now-form compact' : 'now-form'} onSubmit={onStart}>
        <input
          ref={inputRef}
          className="field now-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={running ? '다음에 할 일' : '지금 뭐 하고 있나요?'}
          aria-label="활동 이름"
          autoFocus
          enterKeyHint="go"
        />
        <button className="btn btn-primary" type="submit" disabled={!canStart}>
          시작
        </button>
      </form>
      {error && <p className="error-line">{error}</p>}
    </main>
  );
}
