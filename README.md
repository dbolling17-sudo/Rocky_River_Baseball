# Rocky River Baseball website

Official website for Rocky River High School Baseball (Rocky River, Ohio).
Owner: Coach Devon Bolling, Head Baseball Coach.

Built with [Astro](https://astro.build) as a static site: plain, fast web pages
with no database or login server. All frequently changing information lives in
simple text files, separate from the design.

- **Day-to-day updates:** see [MAINTENANCE.md](MAINTENANCE.md).
- **Running it on a computer:** install Node.js 22 or newer, then
  `npm install` and `npm run dev`, and open http://localhost:4321.
- **Checking before publishing:** `npm run check` and `npm run build`. The build
  stops with a clear message if any content file has a mistake.

## Where things live

| What | File or folder |
| --- | --- |
| Calendar (workouts, events, games, results) | `src/data/calendar/<season>.yaml` |
| Rosters | `src/data/rosters/<year>.yaml` |
| Coaches | `src/data/coaches.yaml` |
| Sponsors | `src/data/sponsors.yaml` |
| Photo albums | `src/data/albums.yaml` |
| Site settings (contact, banner, field, social links, values) | `src/data/settings.yaml` |
| News posts | `src/content/news/<date>-<name>.md` |
| Text pages (Program, Player Development, Youth, Alumni) | `src/content/pages/<name>.md` |
| Photos and logos | `src/assets/photos/` |
| Colors and fonts | `src/styles/global.css` (top of file) |
| Menu | `src/lib/site.ts` |

## How it is built

- `src/content.config.ts` describes every kind of content and checks it.
- `src/lib/yamlLoader.ts` reads the YAML files and fails loudly on typos.
- `src/components/` holds reusable pieces (header, footer, event row, photo).
- `src/pages/` holds one file per page; `[slug].astro` renders the Markdown pages.
- `src/pages/calendar.ics.ts` produces the calendar feed people subscribe to.
  Events marked `sample: true` are left out of the feed.
