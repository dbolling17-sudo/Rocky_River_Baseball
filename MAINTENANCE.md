# Maintaining the site

The simplest way to update the site is to ask Claude in the Rocky River
Baseball project, in plain English. Claude edits the right file, checks the
build, and shows you a preview before anything goes live. This guide records
how each common update is done, so every future session does it the same way.

## Common requests

| You say | What changes |
| --- | --- |
| "Add a workout on Oct 15 at 3:15" | New block in `src/data/calendar/2026-27.yaml` |
| "Cancel Thursday's workout" | `cancelled: true` on that event (it stays visible, struck through) |
| "We beat Lakewood 7-4" | `result: W` and `score: "7-4"` on that game |
| "Post this announcement..." | New file in `src/content/news/` |
| "Change the banner at the top" | `announcement` in `src/data/settings.yaml` (delete it to hide the banner) |
| "Here's the varsity roster" | `src/data/rosters/2027.yaml` |
| "Add a sponsor" | `src/data/sponsors.yaml`, logo in `src/assets/photos/sponsors/` |
| "Add these photos from Saturday" | Files in `src/assets/photos/<year>/`, album in `src/data/albums.yaml` |

## Calendar entries

```yaml
- date: 2026-10-15        # year-month-day
  time: "3:15 PM"         # optional, keep the quotes
  endTime: "4:45 PM"      # optional
  type: workout           # game, scrimmage, practice, workout, team-event,
                          # meeting, fundraiser, youth, tryouts, other
  title: Fall strength and conditioning   # optional for games
  level: All              # Varsity, JV, Freshman, All
  opponent: Lakewood      # games only
  homeAway: home          # home, away, neutral
  location: RRHS weight room
  result: W               # W, L, T once the game is played
  score: "7-4"
  notes: Bring running shoes.
```

- The home page and calendar decide what is "upcoming" using today's date in
  the visitor's browser, so nothing needs updating when a date passes.
- Everyone who tapped **Add to my calendar** gets changes automatically
  (phones check every few hours).
- Start a new file each season, e.g. `2027-28.yaml`. Old seasons stay as archives.
- Events marked `sample: true` are placeholders from the initial build. Remove
  them when the real schedule is entered.

## Photos

- Send photos at full size; the site makes small, fast versions automatically.
- Every photo needs a short description (`alt`) for visitors using screen readers.
- The media release on file authorizes player names and photos online (confirmed
  by Coach Bolling, Oct 2026).
- For hundreds of photos from one event, link to an outside album with `link:`.

## Roster privacy

Only name, number, grade, position and bats/throws are shown. Do not add home
towns, birthdates, phone numbers or emails for players.

## Going live (record of accounts and settings)

| Item | Value |
| --- | --- |
| Code repository | https://github.com/dbolling17-sudo/Rocky_River_Baseball (public) |
| Hosting | Cloudflare Workers, project `rocky-river-baseball` (free tier), builds automatically from `main` |
| Backup address | https://rocky-river-baseball.dbolling17.workers.dev |
| Custom domain | https://rrpiratesbaseball.com (and www), bought 2026-10-07 through Cloudflare Registrar |
| Domain registrar and renewal date | Cloudflare Registrar, renews each October (auto-renew recommended) |

If the address ever changes, update `site` in `astro.config.mjs` to the new
address so links and the calendar feed use it.

## Previews before hosting is connected

For changes not yet published, Claude shares previews as a private
Claude artifact: run `npm run build`, copy `dist/` to a scratch folder, run
`node tools/relative-preview.mjs <folder>`, and publish the folder's
`index.html` with the other files (leave out `calendar.ics`, which artifacts
cannot serve). Current preview: https://claude.ai/artifact/KuG3mQ7roYBwpDuvkgWjNQ
