// The team calendar as a feed that phones and Google/Outlook calendars can subscribe to.
// Built automatically from the same calendar files as the Schedule page.
import type { APIRoute } from 'astro';
import { eventTitle, getEvents, TYPE_LABELS, type CalendarEvent } from '../lib/events';

const TZ = 'America/New_York';

const escape = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Lines longer than 75 characters must be folded per the calendar standard (RFC 5545). */
const fold = (line: string) => line.match(/.{1,74}/g)!.join('\r\n ');

/** "4:30 PM" -> "163000"; returns undefined if the time can't be read (e.g. "TBA"). */
function toTime(time?: string): string | undefined {
  const m = time?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?$/);
  if (!m) return undefined;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return `${String(h).padStart(2, '0')}${m[2] ?? '00'}00`;
}

const compact = (iso: string) => iso.replace(/-/g, '');

function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toVevent(e: CalendarEvent, uid: string, stamp: string): string[] {
  const start = toTime(e.time);
  const end = toTime(e.endTime);
  const lines = ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`];
  if (start) {
    lines.push(`DTSTART;TZID=${TZ}:${compact(e.date)}T${start}`);
    if (end) lines.push(`DTEND;TZID=${TZ}:${compact(e.endDate ?? e.date)}T${end}`);
    else lines.push('DURATION:PT2H');
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compact(nextDay(e.endDate ?? e.date))}`);
  }
  const prefix = e.cancelled ? 'CANCELLED: ' : '';
  lines.push(`SUMMARY:${escape(`${prefix}Rocky River Baseball: ${eventTitle(e)}`)}`);
  if (e.location) lines.push(`LOCATION:${escape(e.location)}`);
  const details = [
    TYPE_LABELS[e.type],
    e.level,
    e.result && e.score ? `Result: ${e.result} ${e.score}` : undefined,
    e.time && !start ? `Time: ${e.time}` : undefined,
    e.notes,
  ].filter(Boolean);
  if (details.length) lines.push(`DESCRIPTION:${escape(details.join('\n'))}`);
  if (e.cancelled) lines.push('STATUS:CANCELLED');
  lines.push('END:VEVENT');
  return lines;
}

export const GET: APIRoute = async ({ site }) => {
  const host = site?.host ?? 'rockyriverbaseball';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = await getEvents();
  // A stable ID per event (date + title), so adding an event never reshuffles
  // the ones already in people's calendars.
  const used = new Map<string, number>();
  const uidFor = (e: CalendarEvent) => {
    const base = `${e.date}-${eventTitle(e).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return `${n > 1 ? `${base}-${n}` : base}@${host}`;
  };
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rocky River Baseball//Team Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Rocky River Baseball',
    `X-WR-TIMEZONE:${TZ}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    // Eastern time zone rules, so every calendar app places events correctly.
    'BEGIN:VTIMEZONE',
    `TZID:${TZ}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events.filter((e) => !e.sample).flatMap((e) => toVevent(e, uidFor(e), stamp)),
    'END:VCALENDAR',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
