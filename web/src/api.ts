import type { Activity, CurrentResponse, MonthSummary } from '@recordlife/shared';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...rest,
      headers: json !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(0, '연결이 불안정해요. 다시 시도해 주세요.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? '문제가 생겼어요. 다시 시도해 주세요.');
  return body as T;
}

export const getCurrent = () => call<CurrentResponse>('/current');
export const start = (title: string) => call<Activity>('/activities/start', { method: 'POST', json: { title } });
export const stop = (id: string) => call<Activity>(`/activities/${id}/stop`, { method: 'POST' });
export const patch = (id: string, body: Partial<{ title: string; startedAt: string; endedAt: string }>) =>
  call<Activity>(`/activities/${id}`, { method: 'PATCH', json: body });
export const remove = (id: string) => call<void>(`/activities/${id}`, { method: 'DELETE' });
export const getDay = (date: string) => call<Activity[]>(`/days/${date}`);
export const getMonth = (month: string) => call<MonthSummary>(`/months/${month}`);
