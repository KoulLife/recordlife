import { clipToDay, dayRange, type Activity } from '@recordlife/shared';

export type RibbonSegment = { id: string; left: number; width: number; running: boolean };

const DAY_MS = 86_400_000;

/** Today's activities as percentages of the Asia/Seoul day, for a thin 24h ribbon. */
export function ribbonSegments(items: Activity[], day: string, now: Date): RibbonSegment[] {
  const { start: dayStart } = dayRange(day);
  return items.flatMap((a) => {
    const c = clipToDay({ startedAt: new Date(a.startedAt), endedAt: a.endedAt ? new Date(a.endedAt) : null }, day, now);
    if (!c) return [];
    return [
      {
        id: a.id,
        left: ((c.start.getTime() - dayStart.getTime()) / DAY_MS) * 100,
        width: ((c.end.getTime() - c.start.getTime()) / DAY_MS) * 100,
        running: !a.endedAt,
      },
    ];
  });
}
