# Venue Promo Studio

Enter a venue's name, address, website and socials. The site reads those pages, asks Claude what the venue offers, and writes ten 1920×1080 promo slides for in-venue screens. Edit them, then download PNGs or a zip.

## Deploy on Vercel

1. Import this repo at vercel.com/new (no framework, no build command).
2. In Settings → Environment Variables add:
   - `ANTHROPIC_API_KEY` — from console.anthropic.com (required)
   - `APP_PASSWORD` — a shared password for the site (recommended, so strangers can't use your API credit)
   - `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-5-5`
3. Redeploy after adding variables.

## Files

- `index.html` — the whole front end (slide rendering happens in the browser)
- `api/claude.js` — sends prompts and images to the Claude API
- `api/fetch-page.js` — fetches a venue page and returns its text plus likely menu/events links
- `api/_auth.js` — the `APP_PASSWORD` check

Facebook and Instagram usually block server fetching; paste details into Notes or upload screenshots instead.
