# ppo.gg

Landing page, portfolio and blog for ppo.gg. Nuxt 4, with content and login in Appwrite.

## Run

```bash
pnpm install
node node_modules/nuxt/bin/nuxt.mjs dev   # or: pnpm dev
```

## Content

- Portfolio items, blog posts and pages live in Appwrite (database `ppogg`, bucket `media`).
- Edit them at `/admin`. Log in with a user that has the `admin` label.
- `scripts/appwrite-setup.sh` creates the tables and bucket with the Appwrite CLI.
- Published items carry a `read("any")` row permission. Drafts have none, so Appwrite hides them.

## Page builder

- Pages made at `/admin` > Pages use blocks: hero, text, card grid, key figures, image and call to action. Reorder, duplicate and preview them there.
- A built page is saved as JSON in the page `body` (`{"v":1,"blocks":[...]}`), so no Appwrite schema change is needed. Older Markdown pages still work and can be moved into the builder.
- Services, hero taglines and the process steps live in `app/data/site.ts`.

## Deploy

Appwrite Sites: Nuxt, server rendering, `npm install`, `npm run build`, output `.output`.

## Test

```bash
npx vitest run
```
