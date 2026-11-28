// The simulated clock shared by the pure simulation modules: minutes after the dataset snapshot (27 Nov 2026 10:00 EAT). No wall clock is ever read.
export const SNAPSHOT = '2026-11-27T10:00:00+03:00'
export function isoAt(minutes: number): string {
  const ms = Date.parse(SNAPSHOT) + minutes * 60000 + 3 * 3600000
  return new Date(ms).toISOString().slice(0, 19) + '+03:00'
}
/** Whether a dataset timestamp has been reached by the simulated clock (`now` = minutes after the snapshot). */
export const reached = (iso: string, now: number) => Date.parse(iso) <= Date.parse(SNAPSHOT) + now * 60000
