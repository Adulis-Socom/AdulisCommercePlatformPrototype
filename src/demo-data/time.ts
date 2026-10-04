// Story time (docs/DEMO_DATA.md › Conventions, › Story timeline). Every timestamp is market-local time written with its
// explicit offset, EAT (+03:00). Events that share a timestamp carry an explicit `sequence` in DEMO_DATA's order.
// A snapshot shows every event that happened strictly before its own (at, sequence).

/** An ISO 8601 timestamp in EAT, for example '2026-10-02T10:25:00+03:00'. */
export type Timestamp = string

/** A date or month without a time of day, for example '2026-09-24' or '2026-03'. */
export type CalendarDate = string

/** A point on the story timeline. */
export interface Moment {
  readonly at: Timestamp
  /** Orders events that share `at` (0 when absent). */
  readonly sequence?: number
}

/** The default canonical demo snapshot: Friday 2 October 2026, 10:25 EAT. */
export const DEFAULT_SNAPSHOT: Moment = { at: '2026-10-02T10:25:00+03:00' }

const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):00\+03:00$/
const DATE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/

function epoch(value: Timestamp | CalendarDate): number {
  if (TIMESTAMP.test(value)) return Date.parse(value)
  const m = DATE.exec(value)
  if (m) return Date.parse(`${m[1]}-${m[2]}-${m[3] ?? '01'}T00:00:00+03:00`)
  throw new Error(`Not a story timestamp or date: ${value}`)
}

/**
 * True when `event` happened strictly before `snapshot`. An event without a recorded time had already happened; a
 * timestamp or date given on its own has sequence 0.
 */
export function happenedBefore(event: Moment | Timestamp | CalendarDate | undefined, snapshot: Moment): boolean {
  if (event === undefined) return true
  const e = typeof event === 'string' ? { at: event } : event
  const a = epoch(e.at), b = epoch(snapshot.at)
  return a < b || (a === b && (e.sequence ?? 0) < (snapshot.sequence ?? 0))
}

/** Whole minutes from `from` to `to`. */
export function minutesBetween(from: Timestamp | CalendarDate, to: Timestamp): number {
  return Math.floor((epoch(to) - epoch(from)) / 60000)
}

/** How long ago `event` was at `now`, as list rows show it: 'Now', '13m', '3h', 'Yesterday', '3d', then '12 Sep'. */
export function formatAge(event: Timestamp | CalendarDate, now: Timestamp): string {
  const minutes = minutesBetween(event, now)
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m`
  const sameDay = event.slice(0, 10) === now.slice(0, 10)
  if (sameDay) return `${Math.floor(minutes / 60)}h`
  const days = Math.round((epoch(now.slice(0, 10)) - epoch(event.slice(0, 10))) / 86400000)
  if (days === 1) return 'Yesterday'
  return days < 7 ? `${days}d` : formatDayMonth(event)
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function parts(value: Timestamp | CalendarDate) {
  const t = TIMESTAMP.exec(value)
  if (t) return { year: +t[1], month: +t[2], day: +t[3], hour: +t[4], minute: +t[5] }
  const d = DATE.exec(value)
  if (d) return { year: +d[1], month: +d[2], day: d[3] ? +d[3] : undefined, hour: undefined, minute: undefined }
  throw new Error(`Not a story timestamp or date: ${value}`)
}

/** '10:25' (24-hour clock, EAT). */
export function formatClock(at: Timestamp): string {
  const p = parts(at)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

/** '10:25', '9:12': a phone status-bar clock (24-hour, no leading zero). */
export function formatClockShort(at: Timestamp): string {
  return formatClock(at).replace(/^0/, '')
}

/** '2:14 PM' (12-hour clock, EAT). */
export function formatClock12(at: Timestamp): string {
  const { hour = 0, minute = 0 } = parts(at)
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

/** '2 Oct' */
export function formatDayMonth(value: Timestamp | CalendarDate): string {
  const p = parts(value)
  return `${p.day} ${MONTHS[p.month - 1].slice(0, 3)}`
}

/** '2 Oct 2026' */
export function formatDate(value: Timestamp | CalendarDate): string {
  const p = parts(value)
  return `${p.day} ${MONTHS[p.month - 1].slice(0, 3)} ${p.year}`
}

/** '2 October 2026' */
export function formatLongDate(value: Timestamp | CalendarDate): string {
  const p = parts(value)
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`
}

/** 'March 2026' */
export function formatMonthYear(value: Timestamp | CalendarDate): string {
  const p = parts(value)
  return `${MONTHS[p.month - 1]} ${p.year}`
}

/** 'March 2026' for a month, '10 September 2026' for a day: a calendar date at its own precision. */
export function formatCalendarDate(value: CalendarDate): string {
  return parts(value).day === undefined ? formatMonthYear(value) : formatLongDate(value)
}

/** 'Oct 2026' */
export function formatMonthShortYear(value: Timestamp | CalendarDate): string {
  const p = parts(value)
  return `${MONTHS[p.month - 1].slice(0, 3)} ${p.year}`
}

/** 'Friday' */
export function formatWeekday(value: Timestamp | CalendarDate): string {
  const p = parts(value)
  return WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day ?? 1)).getUTCDay()]
}
