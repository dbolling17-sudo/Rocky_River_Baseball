// Copies the team's Google Calendar into src/data/calendar/google-calendar.yaml,
// the format the website's calendar already reads.
//
// Runs on a schedule from .github/workflows/sync-google-calendar.yml. When the
// Google Calendar changed, the workflow commits the new file and Cloudflare
// rebuilds the site. If Google can't be reached or the feed looks broken, the
// script stops with an error and the live site keeps its last good calendar.
//
//   node tools/sync-google-calendar.mjs            (address from settings.yaml)
//   node tools/sync-google-calendar.mjs feed.ics   (a downloaded file, for testing)

import { readFile, writeFile } from 'node:fs/promises';
import ICAL from 'ical.js';
import yaml from 'js-yaml';

const SETTINGS = new URL('../src/data/settings.yaml', import.meta.url);
const OUTPUT = new URL('../src/data/calendar/google-calendar.yaml', import.meta.url);
const TZ = 'America/New_York';

// Window of events kept on the site: recent past (for results) through the next year.
const DAYS_BACK = 120;
const DAYS_AHEAD = 400;

// Event titles decide which calendar filter an event falls under. First match wins.
const TYPE_RULES = [
  ['cancelled-marker', /^\s*(cancel+ed|canceled)\b[:\s-]*/i],
  ['tryouts', /\btry\s?outs?\b/i],
  ['scrimmage', /\bscrimmage\b/i],
  ['game', /\b(game|doubleheader|vs\.?|versus)\b|(^|\s)@\s|^at\s/i],
  ['practice', /\bpractice\b/i],
  ['workout', /\b(workout|work-out|lift|lifting|weights?|conditioning|strength|throwing|speed|agility|open gym|cages?|hitting session)\b/i],
  ['youth', /\b(youth|clinic|camp|little league)\b/i],
  ['fundraiser', /\b(fundrais\w*|raffle|golf outing|car wash)\b/i],
  ['meeting', /\b(meeting|info(rmation)? night|parent night|orientation)\b/i],
  ['team-event', /\b(team|cleanup|clean-up|service|banquet|dinner|bonding|pictures|photo day|senior night)\b/i],
];

function typeFor(title) {
  for (const [type, re] of TYPE_RULES) if (type !== 'cancelled-marker' && re.test(title)) return type;
  return 'other';
}

/** "vs. Lakewood" / "@ Bay Village" / "at Avon" -> opponent and home/away, for games only. */
function opponentFor(title) {
  const away = title.match(/(?:^|\s)(?:@|at)\s+(.+)$/i);
  if (away) return { opponent: away[1].trim(), homeAway: 'away' };
  const home = title.match(/(?:^|\s)(?:vs\.?|versus)\s+(.+)$/i);
  if (home) return { opponent: home[1].trim(), homeAway: 'home' };
  return {};
}

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (t) => `${t.year}-${pad(t.month)}-${pad(t.day)}`;

function clockTime(t) {
  const h = t.hour % 12 || 12;
  return `${h}:${pad(t.minute)} ${t.hour < 12 ? 'AM' : 'PM'}`;
}

/** Seasons run August through July, e.g. 2026-10-15 -> "2026-27". */
function seasonFor(date) {
  const [y, m] = date.split('-').map(Number);
  const start = m >= 8 ? y : y - 1;
  return `${start}-${pad((start + 1) % 100)}`;
}

/** Google stores descriptions as simple HTML. Keep the words, drop the markup. */
function plainText(html) {
  if (!html) return undefined;
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
}

/** Converts one occurrence (start/end in the event's own zone) into a site calendar entry. */
function toEntry(event, start, end) {
  let title = (event.summary ?? '').trim() || 'Team event';
  let cancelled = event.component.getFirstPropertyValue('status') === 'CANCELLED';
  const marker = TYPE_RULES[0][1];
  if (marker.test(title)) {
    cancelled = true;
    title = title.replace(marker, '').trim() || 'Team event';
  }

  const entry = {};
  if (start.isDate) {
    entry.date = isoDay(start);
    // All-day events end the morning after their last day.
    const last = end.clone();
    last.adjust(-1, 0, 0, 0);
    if (isoDay(last) > entry.date) entry.endDate = isoDay(last);
  } else {
    const s = start.convertToZone(ICAL.TimezoneService.get(TZ) ?? ICAL.Timezone.utcTimezone);
    const e = end.convertToZone(ICAL.TimezoneService.get(TZ) ?? ICAL.Timezone.utcTimezone);
    entry.date = isoDay(s);
    entry.time = clockTime(s);
    if (isoDay(e) > entry.date) entry.endDate = isoDay(e);
    if (e.compare(s) > 0) entry.endTime = clockTime(e);
  }

  entry.type = typeFor(title);
  entry.title = title;
  const level = title.match(/\b(varsity|jv|junior varsity|freshman|freshmen)\b/i)?.[1].toLowerCase();
  if (level) entry.level = { varsity: 'Varsity', jv: 'JV', 'junior varsity': 'JV', freshman: 'Freshman', freshmen: 'Freshman' }[level];
  if (entry.type === 'game' || entry.type === 'scrimmage') Object.assign(entry, opponentFor(title));
  const location = event.location?.trim();
  if (location) entry.location = location;
  const notes = plainText(event.description);
  if (notes) entry.notes = notes;
  if (cancelled) entry.cancelled = true;
  entry.season = seasonFor(entry.date);
  return entry;
}

async function loadFeed() {
  const file = process.argv[2];
  if (file) return readFile(file, 'utf-8');

  const settings = yaml.load(await readFile(SETTINGS, 'utf-8'), { schema: yaml.CORE_SCHEMA });
  const url = settings?.googleCalendar?.ics;
  if (!url) {
    console.log('No googleCalendar.ics address in settings.yaml; nothing to sync.');
    process.exit(0);
  }
  const res = await fetch(url, { headers: { 'user-agent': 'rocky-river-baseball-site' } });
  if (!res.ok) throw new Error(`Google Calendar returned ${res.status} ${res.statusText}`);
  return res.text();
}

const text = await loadFeed();
if (!text.includes('BEGIN:VCALENDAR')) {
  throw new Error('That address did not return a calendar. Check it is the "Public address in iCal format".');
}

const root = new ICAL.Component(ICAL.parse(text));
for (const tz of root.getAllSubcomponents('vtimezone')) {
  ICAL.TimezoneService.register(new ICAL.Timezone(tz));
}

const now = ICAL.Time.now();
const from = now.clone();
from.adjust(-DAYS_BACK, 0, 0, 0);
const until = now.clone();
until.adjust(DAYS_AHEAD, 0, 0, 0);

// Changed single dates of a repeating event ("this event only" edits in Google).
const exceptions = new Map();
const masters = [];
for (const vevent of root.getAllSubcomponents('vevent')) {
  const event = new ICAL.Event(vevent);
  if (event.isRecurrenceException()) {
    if (!exceptions.has(event.uid)) exceptions.set(event.uid, []);
    exceptions.get(event.uid).push(event);
  } else {
    masters.push(event);
  }
}

const entries = [];
for (const event of masters) {
  for (const ex of exceptions.get(event.uid) ?? []) event.relateException(ex);

  if (!event.isRecurring()) {
    if (event.endDate.compare(from) >= 0 && event.startDate.compare(until) <= 0) {
      entries.push(toEntry(event, event.startDate, event.endDate));
    }
    continue;
  }

  const it = event.iterator();
  for (let next = it.next(), guard = 0; next && guard < 2000; next = it.next(), guard++) {
    if (next.compare(until) > 0) break;
    const occ = event.getOccurrenceDetails(next);
    if (occ.endDate.compare(from) < 0) continue;
    entries.push(toEntry(occ.item, occ.startDate, occ.endDate));
  }
}

// Same order the site uses: by date, then time.
const sortKey = (e) => {
  const m = e.time?.match(/(\d+):(\d+) (AM|PM)/);
  const h = m ? (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0) : 0;
  return `${e.date} ${pad(h)}:${m?.[2] ?? '00'} ${e.title}`;
};
entries.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

const header = `# GENERATED FROM THE TEAM GOOGLE CALENDAR. Do not edit this file by hand:
# change the event in Google Calendar and the website follows within about an hour.
# Event titles decide the calendar filter (see TYPE_RULES in tools/sync-google-calendar.mjs).
`;
const body = entries.length
  ? yaml.dump(entries, { lineWidth: -1, noRefs: true, quotingType: '"', schema: yaml.CORE_SCHEMA })
  : '[]\n';
const output = `${header}\n${body}`;

let previous = '';
try {
  previous = await readFile(OUTPUT, 'utf-8');
} catch {}
if (previous === output) {
  console.log(`No changes (${entries.length} events).`);
} else {
  await writeFile(OUTPUT, output);
  console.log(`Updated ${entries.length} events.`);
}
