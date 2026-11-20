import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { todayKey } from '@recordlife/shared';
import NowPage from './now/NowPage';
import DayPage from './day/DayPage';
import MonthPage from './month/MonthPage';

function TopBar() {
  const { pathname } = useLocation();
  const tab = pathname.startsWith('/day') ? 'day' : pathname.startsWith('/month') ? 'month' : 'now';
  const item = (key: string, to: string, label: string) => (
    <Link to={to} className={tab === key ? 'on' : undefined} aria-current={tab === key ? 'page' : undefined}>
      {label}
    </Link>
  );
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="wordmark">
          record<i>life</i>
        </Link>
        <nav className="seg" aria-label="보기">
          {item('now', '/', '지금')}
          {item('day', '/day', '일')}
          {item('month', '/month', '월')}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const today = todayKey(new Date());
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<NowPage />} />
        <Route path="/day" element={<Navigate to={`/day/${today}`} replace />} />
        <Route path="/day/:date" element={<DayPage />} />
        <Route path="/month" element={<Navigate to={`/month/${today.slice(0, 7)}`} replace />} />
        <Route path="/month/:month" element={<MonthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
