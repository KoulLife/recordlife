import { useEffect, useState, type FormEvent } from 'react';
import { fromSeoulInput, titleLength, toSeoulInput, type Activity } from '@recordlife/shared';
import * as api from '../api';

type Props = {
  activity: Activity;
  now: () => Date;
  onClose(): void;
  onChanged(): void;
};

export default function EditSheet({ activity, now, onClose, onChanged }: Props) {
  const running = !activity.endedAt;
  const [title, setTitle] = useState(activity.title);
  const [start, setStart] = useState(toSeoulInput(new Date(activity.startedAt)));
  const [end, setEnd] = useState(activity.endedAt ? toSeoulInput(new Date(activity.endedAt)) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : '문제가 생겼어요. 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (titleLength(t) < 1 || titleLength(t) > 100) return setError('이름은 1–100자로 입력해 주세요.');
    const s = fromSeoulInput(start);
    const en = running ? null : fromSeoulInput(end);
    if (!s || (!running && !en)) return setError('시각을 확인해 주세요.');

    const body: Parameters<typeof api.patch>[1] = {};
    if (t !== activity.title) body.title = t;
    // Only send times the user actually changed (inputs are minute precision).
    if (start !== toSeoulInput(new Date(activity.startedAt))) body.startedAt = s.toISOString();
    if (en && end !== toSeoulInput(new Date(activity.endedAt!))) body.endedAt = en.toISOString();
    if (Object.keys(body).length === 0) return onClose();
    run(() => api.patch(activity.id, body));
  };

  const onDelete = () => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    run(() => api.remove(activity.id));
  };

  const max = toSeoulInput(now());

  return (
    <div className={`sheet-layer${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="기록 수정">
      <div className="sheet-dim" onClick={onClose} />
      <form className="sheet" onSubmit={onSave}>
        <div className="sheet-grabber" />
        <div className="sheet-nav">
          <button type="button" className="sheet-cancel" onClick={onClose}>
            취소
          </button>
          <span className="sheet-heading">기록 수정</span>
          <button type="submit" className="btn btn-primary sheet-save" disabled={busy}>
            저장
          </button>
        </div>

        <label className="sheet-label" htmlFor="edit-title">
          이름
        </label>
        <input id="edit-title" className="field serif" value={title} onChange={(e) => setTitle(e.target.value)} />

        <div className="sheet-times">
          <div>
            <label className="sheet-label" htmlFor="edit-start">
              시작
            </label>
            <input id="edit-start" className="field num" type="datetime-local" value={start} max={max} onChange={(e) => setStart(e.target.value)} />
          </div>
          {!running && (
            <div>
              <label className="sheet-label" htmlFor="edit-end">
                종료
              </label>
              <input id="edit-end" className="field num" type="datetime-local" value={end} max={max} onChange={(e) => setEnd(e.target.value)} />
            </div>
          )}
        </div>

        {error && <p className="error-line">{error}</p>}

        <div className="sheet-actions">
          {running && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(() => api.stop(activity.id))}>
              지금 종료
            </button>
          )}
          <button type="button" className="btn btn-danger" disabled={busy} onClick={onDelete}>
            삭제
          </button>
        </div>
      </form>
    </div>
  );
}
