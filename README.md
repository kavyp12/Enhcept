# Enhcept website

One-page site for Enhcept (ENHC × ConceptDrafter) with an enquiry form, and a password-protected `/admin` page to read, search, export and delete enquiries.

Built with Next.js 16 (App Router, TypeScript), plain CSS, three.js for the hero film, and Node's built-in SQLite for storage. No other runtime dependencies.

## Run it locally

```bash
npm install
cp .env.example .env      # then set ADMIN_PASSWORD and SESSION_SECRET
npm run dev               # http://localhost:3000
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (password = `ADMIN_PASSWORD` from `.env`)

Requires Node 22.13 or newer (for `node:sqlite`).

## Environment (`.env`)

| Name | What |
|---|---|
| `ADMIN_PASSWORD` | Password for `/admin`. Admin stays switched off until it is set. |
| `SESSION_SECRET` | Long random string that signs the admin cookie. Keeps admins signed in across restarts. |
| `DB_PATH` | Optional. Where the SQLite file lives (default `storage/enquiries.db`). |
| `SITE_URL` | The live address, e.g. `https://enhcept.com`. Read at **build** time to make the share-preview image link absolute (default `http://localhost:3000`). |

## Tests

```bash
npm test
```

Unit tests run on their own. The HTTP tests need the site running (`npm run dev`) and skip cleanly if it isn't. They use their own fake IPs and delete what they create.

A browser end-to-end check of the contact form → admin flow lives in the project tools: `node ../tools/e2e-form.mjs`. Keyboard focus rings and mobile side gutters (390 and 360 px): `node ../tools/a11y-check.mjs`. Both take a base URL, default `http://localhost:3000`.

## Where things are

| Path | What |
|---|---|
| `src/app/page.tsx` | The one page: section order |
| `src/app/layout.tsx` | Fonts (Inter Tight + Geist Mono, a free stand-in for Season Sans) and metadata |
| `src/app/globals.css` | Colour and type tokens, buttons, cards, status pills |
| `src/components/` | Sections, the contact form, the hero film (`hero/`) and the isometric icons (`iso.tsx`) |
| `src/components/house.ts` | Our own 12 × 9 m sample house: the one source for the plugin demo and the hero |
| `src/components/PluginDemo.tsx` | The interactive "Run plugin" demo in section 03, drawn from `house.ts` |
| `public/img/partners/` | ConceptDrafter and ENHC logos, made by `../tools/prep_partner_logos.py` |
| `src/app/api/` | Enquiry and admin endpoints |
| `src/app/admin/` | Admin page |
| `src/lib/` | Validation, CSV export, storage, sessions, rate limits |
| `public/media/` | Videos and posters, made by `../tools/encode-media.sh` |

## Deploying

- **Needs a server with a disk** (a VPS, Railway or Render with a persistent volume): enquiries are stored in a SQLite file. On Railway or Render, point `DB_PATH` at the volume.
- **Vercel** has no persistent disk. Swap the storage in `src/lib/server.ts` for Turso or Neon first.
- Run **one instance** behind **one** proxy that terminates HTTPS. Rate limits read the client IP from the right-most `X-Forwarded-For` entry, and they live in memory.
- Build and start: `npm run build && npm start`.
- Set `ADMIN_PASSWORD` and `SESSION_SECRET` on the host. Admin cookies are `Secure` in production, so serve over HTTPS.
- Set `SITE_URL` **before** `npm run build`, or link previews will point at localhost.
- Last check (2026-10-21, production build, Lighthouse 12.6): desktop 100 / 100 / 100 / 100; mobile performance 73–77 (the live WebGL hero), accessibility, best practices and SEO 100.

## Content rules

- The AI division is shown as **In development**. Don't add clients, numbers or certifications that aren't real.
- Software names are plain text (no logos), with the trademark note in the footer.
- Project footage is used only with the client's written permission. Never use client material marked NDA or confidential.
