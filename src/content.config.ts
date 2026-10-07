// Defines every kind of content on the site and checks it at build time.
// If a schedule entry is missing a date or has a misspelled type, the build
// stops with a message naming the file and item, and the live site is unchanged.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { yamlFile, yamlFolder } from './lib/yamlLoader';

// Dates are kept as "YYYY-MM-DD" text. Markdown front matter turns them into
// date objects, so those are converted back.
const isoDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must look like 2026-10-15 (year-month-day).'),
  z.date().transform((d) => d.toISOString().slice(0, 10)),
]);

export const EVENT_TYPES = [
  'game',
  'scrimmage',
  'practice',
  'workout',
  'team-event',
  'meeting',
  'fundraiser',
  'youth',
  'tryouts',
  'other',
] as const;

const events = defineCollection({
  loader: yamlFolder('./src/data/calendar'),
  schema: z.object({
    season: z.string(),
    date: isoDate,
    endDate: isoDate.optional(),
    time: z.string().optional(),
    endTime: z.string().optional(),
    type: z.enum(EVENT_TYPES),
    title: z.string().optional(),
    level: z.string().optional(),
    opponent: z.string().optional(),
    homeAway: z.enum(['home', 'away', 'neutral']).optional(),
    location: z.string().optional(),
    result: z.enum(['W', 'L', 'T']).optional(),
    score: z.string().optional(),
    notes: z.string().optional(),
    link: z.url().optional(),
    cancelled: z.boolean().default(false),
    sample: z.boolean().default(false),
  }),
});

const roster = defineCollection({
  loader: yamlFolder('./src/data/rosters'),
  schema: z.object({
    season: z.string(),
    level: z.string().default('Varsity'),
    number: z.union([z.string(), z.number()]).transform(String).optional(),
    first: z.string(),
    last: z.string(),
    grade: z.union([z.string(), z.number()]).transform(String),
    position: z.string().optional(),
    bats: z.enum(['R', 'L', 'S']).optional(),
    throws: z.enum(['R', 'L']).optional(),
    photo: z.string().optional(),
  }),
});

const coaches = defineCollection({
  loader: yamlFile('./src/data/coaches.yaml'),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    bio: z.string().optional(),
    photo: z.string().optional(),
    email: z.email().optional(),
    placeholder: z.boolean().default(false),
  }),
});

const sponsors = defineCollection({
  loader: yamlFile('./src/data/sponsors.yaml'),
  schema: z.object({
    name: z.string(),
    tier: z.string().optional(),
    url: z.url().optional(),
    logo: z.string().optional(),
    blurb: z.string().optional(),
    placeholder: z.boolean().default(false),
  }),
});

const albums = defineCollection({
  loader: yamlFile('./src/data/albums.yaml'),
  schema: z.object({
    title: z.string(),
    date: isoDate,
    description: z.string().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    link: z.url().optional(),
    photos: z.array(z.object({ file: z.string(), alt: z.string() })).default([]),
    placeholder: z.boolean().default(false),
  }),
});

const settings = defineCollection({
  loader: yamlFile('./src/data/settings.yaml'),
  schema: z.object({
    programName: z.string(),
    schoolName: z.string(),
    mascot: z.string(),
    city: z.string(),
    tagline: z.string(),
    description: z.string(),
    logo: z.string().optional(),
    logoAlt: z.string().optional(),
    heroPhoto: z.string().optional(),
    heroPhotoAlt: z.string().optional(),
    announcement: z
      .object({ text: z.string(), link: z.string().optional(), linkText: z.string().optional() })
      .optional(),
    contact: z.object({
      headCoach: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
    }),
    field: z.object({
      name: z.string(),
      address: z.string().optional(),
      mapUrl: z.url().optional(),
    }),
    social: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    boosterClub: z.object({ name: z.string(), url: z.url(), blurb: z.string() }).optional(),
    values: z.array(z.object({ name: z.string(), text: z.string() })).default([]),
    // Public iCal address of the team Google Calendar; see tools/sync-google-calendar.mjs.
    googleCalendar: z.object({ ics: z.url() }).optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: isoDate,
    summary: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { events, roster, coaches, sponsors, albums, settings, news, pages };
