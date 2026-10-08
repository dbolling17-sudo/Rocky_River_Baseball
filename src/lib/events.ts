import { getCollection, type CollectionEntry } from 'astro:content';

export type CalendarEvent = CollectionEntry<'events'>['data'] & { id: string };

export const TYPE_LABELS: Record<CalendarEvent['type'], string> = {
  game: 'Game',
  scrimmage: 'Scrimmage',
  practice: 'Practice',
  workout: 'Workout',
  'team-event': 'Team Event',
  meeting: 'Meeting',
  fundraiser: 'Fundraiser',
  youth: 'Youth',
  tryouts: 'Tryouts',
  other: 'Event',
};

/** Filter groups for the calendar page. */
export const TYPE_GROUPS = [
  { key: 'games', label: 'Games', types: ['game', 'scrimmage'] },
  { key: 'training', label: 'Workouts & Practices', types: ['workout', 'practice', 'tryouts'] },
  { key: 'team', label: 'Team & Community', types: ['team-event', 'meeting', 'fundraiser', 'youth', 'other'] },
] as const;

export function groupKey(type: CalendarEvent['type']): string {
  return TYPE_GROUPS.find((g) => (g.types as readonly string[]).includes(type))?.key ?? 'team';
}

export const isGame = (e: CalendarEvent) => e.type === 'game' || e.type === 'scrimmage';

export async function getEvents(): Promise<CalendarEvent[]> {
  const entries = await getCollection('events');
  return entries
    .map((e) => ({ ...e.data, id: e.id }))
    .sort((a, b) => (a.date + timeSortKey(a.time)).localeCompare(b.date + timeSortKey(b.time)));
}

/** "4:30 PM" -> "16:30" so events on the same day sort by time. Unknown times sort first. */
function timeSortKey(time?: string): string {
  const m = time?.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp])?/);
  if (!m) return '00:00';
  let h = Number(m[1]);
  const pm = m[3]?.toLowerCase() === 'p';
  if (pm && h < 12) h += 12;
  if (!pm && m[3] && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}

export function eventTitle(e: CalendarEvent): string {
  if (e.title) return e.title;
  if (e.opponent) {
    const prefix = e.homeAway === 'away' ? 'at' : 'vs.';
    return `${prefix} ${e.opponent}`;
  }
  return TYPE_LABELS[e.type];
}

// Dates are stored as "YYYY-MM-DD" text. Formatting at noon UTC means the
// printed day never drifts, whatever time zone the build runs in.
const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const fmt = (opts: Intl.DateTimeFormatOptions) => (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(asDate(iso));

export const formatLongDate = fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const formatShortDate = fmt({ weekday: 'short', month: 'short', day: 'numeric' });
export const formatWeekday = fmt({ weekday: 'short' });
export const formatMonthShort = fmt({ month: 'short' });
export const formatDay = fmt({ day: 'numeric' });
export const formatMonthYear = fmt({ month: 'long', year: 'numeric' });

export function groupByMonth(events: CalendarEvent[]) {
  const months = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push(e);
  }
  return [...months].map(([key, items]) => ({ key, label: formatMonthYear(`${key}-01`), items }));
}

/**
 * Google Calendar locations arrive as full postal addresses
 * ("Rocky River High School, 20951 Detroit Rd, Rocky River, OH 44116, USA").
 * Lists show just the place name; the full address stays in the map link.
 */
export function placeName(location: string): string {
  const parts = location.split(',').map((p) => p.trim()).filter((p) => p && p !== 'USA');
  const looksLikeAddress = parts.length >= 3 && /\d/.test(parts.slice(1).join(' '));
  return looksLikeAddress && !/^\d/.test(parts[0]) ? parts[0] : parts.join(', ');
}

export function mapLink(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function eventTimeText(e: CalendarEvent): string {
  if (!e.time) return 'Time TBA';
  return e.endTime ? `${e.time} – ${e.endTime}` : e.time;
}
