/** Activity as sent over the wire (ISO 8601 strings). */
export type Activity = {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
};

export type CurrentResponse = {
  activity: Activity | null;
  serverNow: string;
};

/** Minutes recorded per day, keyed by `yyyy-MM-dd` (Asia/Seoul). */
export type MonthSummary = Record<string, number>;

export type Span = { startedAt: Date; endedAt: Date | null };
