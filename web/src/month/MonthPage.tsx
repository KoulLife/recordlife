import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { formatMinutes, intensity, todayKey, type MonthSummary } from '@recordlife/shared';
import * as api from '../api';
import { useRefetchOnFocus } from '../useServerClock';
import { monthGrid, shiftMonth } from './grid';
import './month.css';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function MonthPage() {
  const { month = '' } = useParams();
  const [data, setData] = useState<MonthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const today = todayKey(new Date());
  const thisMonth = today.slice(0, 7);

  const latest = useRef(0);
  const load = useCallback(async () => {
    if (!valid) return;
    const req = ++latest.current;
    try {
      const summary = await api.getMonth(month);
      if (req !== latest.current) return; // a newer load (other month or refetch) owns the page
      setData(summary);
      setError(null);
    } catch {
      if (req === latest.current) setError('기록을 불러오지 못했어요. 다시 시도해 주세요.');
    }
  }, [month, valid]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  useRefetchOnFocus(load);

  if (!valid || month > thisMonth) return <Navigate to={`/month/${thisMonth}`} replace />;

  const [y, m] = month.split('-').map(Number);
  const isThisMonth = month === thisMonth;

  return (
    <main className="page month">
      <div className="day-head month-head">
        <Link className="icon-btn" to={`/month/${shiftMonth(month, -1)}`} aria-label="이전 달">
          <Chevron dir="left" />
        </Link>
        <h1 className="day-title">
          {y}년 {m}월
        </h1>
        {isThisMonth ? (
          <span className="icon-btn" aria-hidden="true" />
        ) : (
          <Link className="icon-btn" to={`/month/${shiftMonth(month, 1)}`} aria-label="다음 달">
            <Chevron dir="right" />
          </Link>
        )}
      </div>
      {error && <p className="error-line">{error}</p>}

      <div className="cal" role="grid" aria-label={`${y}년 ${m}월`}>
        {WEEK.map((w) => (
          <div key={w} className="cal-wd" role="columnheader">
            {w}
          </div>
        ))}
        {monthGrid(month).map((d, i) => {
          if (!d) return <div key={`b${i}`} className="cal-cell" aria-hidden="true" />;
          const min = data?.[d] ?? 0;
          const level = intensity(min);
          const future = d > today;
          const label = `${Number(d.slice(8))}일 ${formatMinutes(min)}`;
          const dot = (
            <>
              <span className={`cal-dot lv${data ? level : 0}${d === today ? ' today' : ''}`} />
              <span className="cal-num num">{Number(d.slice(8))}</span>
            </>
          );
          return future ? (
            <div key={d} className="cal-cell future" role="gridcell" aria-disabled="true">
              {dot}
            </div>
          ) : (
            <Link key={d} to={`/day/${d}`} className="cal-cell" role="gridcell" title={label} aria-label={label}>
              {dot}
            </Link>
          );
        })}
      </div>
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
