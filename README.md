# Neyomi

Neyomi is a custom web interface I made for [Suwayomi-Server](https://github.com/Suwayomi/Suwayomi-Server) cause I didn't like how the original looked, it's a mobile-first, fully themeable replacement for the stock WebUI, built on the server's GraphQL API.

React 19 · TypeScript · Vite · Tailwind CSS v4 · urql · JWT auth · installable PWA

Named it that cause it means reading lying down, sort of like how tachiyomi means standing reading and suwayomi means sitting reading (big brain ting ahlie)

If you find anything broken or you got some cool idea, lmk in issues

---

## Features

- **Home** - Has a featured manga section that's sort of like the hero image, a "Continue Reading" shelf of what you last had open, genre shortcuts, a "Trending Now" rail pulled from your most-used source, and recently updated titles. Mostly client-sided from one library query.
- **Continue Reading** - the shelf under the hero picks up mid-chapter where you actually stopped (with the page number and a progress bar), or rolls you on to the next unread chapter if you finished the last one. One card per series, most recent first. It's ordered off `lastReadAt` straight from the chapter table, so unlike the Library list it also keeps titles you're fully caught up on.
- **Themes** - fifteen built-in palettes, twelve dark and three light, plus a custom theme editor where every colour is a variable you can set by hand. Export/import as JSON. See [Theming](#theming).
- **Updates** - a feed of new chapters for the titles you follow, grouped by day and then by manga, so a series you just added doesn't bury the day under a few hundred backfilled chapters. Refresh kicks off a real library update on the server, shows live progress, and tells you how many titles the server's own update filters skipped.
- **Library** - cover grid with Library / Bookmarks / History tabs, plus a Continue Reading list with per-series progress bars.
- **Discover** - browse and search installed sources, with popular/latest listings.
- **Manga detail** - metadata, synopsis, bookmark toggle, and a paginated chapter list (100 per page). Uninitialized manga are fetched from the source on first open.
- **Reader** - left-to-right, right-to-left, and webtoon modes; fit-to-width/height/original; brightness; keyboard navigation; progress synced back to the server. Pinch, double-tap or ctrl+scroll to zoom, then drag to pan around; the tap zones fade in over the page for a moment when you open a chapter so you know where to press.
- **Settings** - appearance/themes and reader preferences (stored locally) plus real server settings: global updates, automatic backups, WebUI, SOCKS proxy, whatever else comes with Suwayomi.
- **Installable** - ships a manifest and a service worker, so it installs to a home screen / dock and runs in its own window, with covers cached on-device. Needs HTTPS - see [Installing as a PWA](#installing-as-a-pwa).

## Requirements

- Node.js 20+
- A running Suwayomi-Server with **`authMode` set to `ui_login`**
- auth mode is not optional. This thing authenticates with JWTs (the `login` / `refreshToken` mutations); `simple_login` and `basic_auth` are session-based and ignore JWTs entirely, so every query comes back `Unauthorized`. So add these variables below to avoid this issue. See [Troubleshooting](#troubleshooting).

```yaml
# docker-compose.yml
environment:
  - AUTH_MODE=ui_login
  - AUTH_USERNAME=admin
  - AUTH_PASSWORD=your-password
```

Running the JAR directly:

```bash
java -Dsuwayomi.tachidesk.config.server.authMode=ui_login -jar Suwayomi-Server-vX.Y-rZZZZ.jar
```

Note that environment variables **overwrite `server.conf` on every start**, so if `AUTH_MODE` is set anywhere, editing `server.conf` will not stick.

## Quick start

```bash
npm install
npm run codegen     # required - generates src/gql/ from schema.graphql
npm run dev
```

`src/gql/` is generated and git-ignored, so `codegen` must run before `dev` or `build` on a fresh clone, otherwise TypeScript will fail on the missing `./gql` imports. Annoying but sort of needed

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server, proxying `/api` to the Suwayomi server |
| `npm run build` | `tsc -b` then a production build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run codegen` | Generate typed documents in `src/gql/` from `schema.graphql` |
| `npm run codegen:watch` | Same, in watch mode |
| `npm run introspect` | Re-download `schema.graphql` from the live server |

## Configuration

The server host lives in two places, both pointing at `http://IP:PORT` - change them to match your setup:

- `vite.config.ts` - the dev proxy target for `/api` (GraphQL and the `/api/v1/...` image endpoints), with `ws: true` for future subscriptions.
- `package.json` - the `introspect` script URL.

In production there is no proxy: the UI is handled by Suwayomi and talks to `/api/graphql` same-origin. Basically it does everything for you.

## Deploying to the server

```bash
npm run build
```

Then copy the **contents** of `dist/` into the directory Suwayomi serves its WebUI from - `webUI/` inside the server data directory (e.g. `~/.local/share/Tachidesk/webUI/`), and set:

```
server.webUIFlavor = "Custom"
server.webUIUpdateCheckInterval = 0
```

`Custom` stops the server managing the WebUI itself; the `0` update interval stops it checking for stock WebUI releases and overwriting the UI.

Copy everything, not just `assets/` - the build also emits `sw.js`, `workbox-*.js`, `manifest.webmanifest`, `registerSW.js` and `icons/`, and the PWA half won't work without them. Because the service worker precaches the app shell, an already-installed client may serve the previous build for one load after you deploy; it registers with `autoUpdate`, so the next load picks up the new one.

Two things make the output drop-in friendly:

- `base: './'` in `vite.config.ts` emits relative asset paths, and the manifest uses a relative `start_url` / `scope` to match.
- The app uses `HashRouter`, so deep links and refreshes work with no server-side rewrite rules.

One exception: the login wallpaper is referenced as an absolute `/assets/wallpaper.png` in `src/components/Login.tsx`, so the app currently expects to be served from the origin root. Might change this in the future, idk yet.

## Installing as a PWA

The build emits a web app manifest and a service worker (`vite-plugin-pwa`), so it can be installed to a home screen / dock and run in its own standalone window. Icons are generated from the brand mark in `public/icons/`.

**This needs HTTPS.** Service workers only register in a secure context, and `http://` on a LAN address isn't one - so on plain HTTP you get the normal site with no install prompt and no offline caching. `http://localhost` is exempt, which is why it works in dev but not from another device.

Easiest fixes, both of which also give you HTTP/2 (see [Performance notes](#performance-notes)):

```
# Caddyfile - Caddy issues and renews the cert itself
manga.example.com {
    reverse_proxy localhost:4567
}
```

or `tailscale serve https / http://localhost:PORT` if the server is on a tailnet.

What you actually get: instant repeat loads, a standalone window, and covers cached hard on-device (`CacheFirst`, 800 entries, 30 days) which takes a real bite out of the cover-loading problem. What you *don't* get is offline reading - library data comes from GraphQL over POST, which isn't cacheable, and page images aren't precached. Offline chapters would be a separate feature.

Cached covers persist after signing out (they're in the Cache Storage bucket, not the token store). Clear site data if that matters to you.

## How it works

```
src/
  main.tsx          React root + urql Provider
  App.tsx           Auth gate - renders <Login> or the routed app shell
  urql.ts           GraphQL client, Bearer header, transparent token refresh
  auth.ts           Token store (localStorage) + pub/sub + image cookie
  useAuth.ts        useSyncExternalStore hook over the token store
  operations.ts     Every GraphQL document, in one place
  readerPrefs.ts    Reader preferences, persisted to localStorage
  theme.ts          Theme tokens, presets, and the localStorage store
  format.ts         Chapter labels, date formatting
  index.css         Tailwind theme tokens + the light-mode neutral ramp
  gql/              Generated (git-ignored)
  components/       One file per screen, plus MangaCard / Rail / ui primitives
```

**Auth.** `login` returns an access token (approx 5 min) and a refresh token (approx 60 days), both kept in `localStorage`. urql's `authExchange` attaches the Bearer header, decodes the `exp` claim to refresh *before* a request would fail, and falls back to refreshing on any `Unauthorized` response. A dead refresh token clears the store and drops you back to the login screen.

**Images.** An `<img>` can't send an `Authorization` header, so the access token is mirrored into the `suwayomi-server-token` cookie, which `ui_login` also accepts. That keeps cover URLs stable and cacheable across token refreshes. The cookie is only ever *written* on load, never cleared - in other auth modes the server owns that cookie, and clearing it would destroy a session the UI didn't create.

**GraphQL over POST.** `preferGetMethod: false` is required: urql defaults queries to GET, but Suwayomi only executes GraphQL over POST (GET serves the GraphiQL IDE).

**Date units differ.** `Chapter.fetchedAt` comes back in **seconds**, while `uploadDate` / `lastReadAt` / `inLibraryAt` are in **milliseconds**. Mix them up and you get 1970. `format.ts` has `fetchedAtToMs()` for the odd one out.

**Library updates live on the server.** The Updates page never keeps "is a refresh running" in component state - it reads `libraryUpdateStatus.jobsInfo` and polls it (2s while running, 8s idle). That means progress survives navigating away, a full reload, or a refresh started from another tab, and the job keeps going regardless of what the UI is doing.

**Mobile shell.** The app shell is a `100dvh` flex column whose content area scrolls internally, rather than the page scrolling under a `position: fixed` bottom bar. Fixed positioning anchors to the *layout* viewport, which doesn't shrink when a mobile browser auto-hides its address bar - so a fixed bottom nav visibly drifts. Laying it out in-flow means it can't.

## Theming

Settings → Appearance. Fifteen presets, plus a custom slot you can edit colour by colour:

- **Dark** - Ember (the default), Midnight, Forest, Sakura, GMK 8008, GMK Laser, Nord, Catppuccin Mocha, Gruvbox, Coffee, Mono, and Void - the last one being pure `#000000` surfaces for OLED screens, where black pixels are actually off.
- **Light** - Paper (warm), Frost (cool), and Catppuccin Latte.

Everything is stored in `localStorage` under `suwayomi-theme` and applied in `main.tsx` before React mounts, so there's no flash of the wrong palette on load.

**How it actually works.** Tailwind v4 compiles its colour utilities down to variable references - `bg-brand-500` becomes `var(--color-brand-500)`, and `bg-white/5` becomes `color-mix(in oklab, var(--color-white) 5%, transparent)`. So overriding those variables on `<html>` at runtime retints the entire app, and no component needs to know a theme system exists. The `white/x` trick is the useful half: one `ink` token drives every overlay, border and hairline in the app at once, which is what makes a light theme possible without rewriting ~110 class usages.

The 17 tokens in `theme.ts`:

| Group | Tokens | Drives |
| --- | --- | --- |
| Brand | `brand300` `brand400` `brand500` `brand600` | buttons, links, badges, progress bars |
| Secondary | `magenta400` `magenta500` `accent400` `accent500` | the far end of gradients, slider fill |
| Surfaces | `app` `appTint` `surface` `raised` `glass` | page background, cards, hover states, sticky bars |
| Details | `glow1` `glow2` `ink` `onBrand` | background glow, overlay tint, text on brand fills |

Two of those are worth knowing about:

- **`ink`** maps to Tailwind's own `--color-white`. Dark themes leave it white; light themes set it to a near-black, which flips every `white/x` overlay into a dark wash in one move.
- **`onBrand`** is text sitting on a brand fill, and it exists because white isn't always the answer. GMK 8008's gradient runs pink into sky blue, and white legends fail badly on the blue end (1.9:1), so that theme uses a dark plum instead - 4.8:1 on the pink, 8.8:1 on the blue. If you add a theme with light accents, set this to something dark.

Light themes also flip the neutral ramp. `index.css` mirrors `--color-zinc-50` through `--color-zinc-950` under `:root[data-theme-mode="light"]`, so `text-zinc-100` stays "primary text" and `text-zinc-500` stays "muted" without any component branching on the mode.

**Adding a preset** is one entry in the `PRESETS` array in `src/theme.ts` - id, name, mode, and the 17 tokens. It shows up in the picker automatically. The quicker route is to build it in the UI, hit Export, and paste the JSON in as a preset.

Surfaces are semantic rather than literal, so there are no hardcoded hex colours left in `src/components` - `bg-surface/85`, `bg-glass/88`, `bg-raised` and so on. If you add UI, use those instead of `bg-[#0b0e15]` or it won't follow the theme.

## Performance notes

Cover loading is the slow part of any Suwayomi UI, for reasons worth knowing about:

- Suwayomi serves the source's **original** cover image with no server-side resizing, so a card 150px wide may pull several hundred KB.
- Thumbnails are fetched from the source site on first request and then disk-cached, so the first browse of a source is always the slowest one.
- The server speaks **HTTP/1.1 only**, capping the browser at ~6 concurrent images. Putting Caddy or nginx with TLS in front of it enables HTTP/2 and is the single biggest available win.

On the client side: covers use `loading="lazy"` and `decoding="async"`, the hero and detail covers get `fetchPriority="high"` so they don't queue behind a screenful of thumbnails, and the Home "Trending Now" result is cached per session - it's a `fetchSourceManga` mutation that makes the server scrape the source live and returns non-library manga whose covers are all cold.

## Troubleshooting

**`Cannot login while already logged-in`**: The server is in `simple_login` (or `basic_auth`) mode, so the request already carries an authenticated session and the `login` mutation refuses. Switch to `ui_login`, clear cookies for the server's origin, and reload.

Quick check, no credentials needed:

```bash
curl -i http://IP:PORT/
# 303 → /login.html  = simple_login
# serves the SPA     = ui_login
```

**Every query returns `Unauthorized` despite a successful login** - same root cause. `login` still hands back a valid-looking JWT in `simple_login` mode, but the server rejects it as a Visitor. Don't try to fix this with the `setSettings` mutation; it requires an authenticated session, which is exactly what you don't have.

**Refresh only updates part of my library** - that's the server, not the UI. `updateLibrary` filters the library before it queues any jobs, so a 100-title library can produce 40 jobs. Suwayomi ships with "skip completed", "skip not started" and the unread-chapter filters *on*, which between them drop anything you've never opened, anything you're behind on, and anything finished. The progress panel reports the skipped count while a refresh runs; the toggles are in Settings → Server. Categories set to not update are skipped too.

**Type errors about `./gql`** - run `npm run codegen`.

**Schema drift after a server upgrade** - `npm run introspect && npm run codegen`.
