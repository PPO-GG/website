# ppo.gg

Landing page, portfolio and blog for ppo.gg. Nuxt 4 on Cloudflare Workers, with content in D1, images in R2 and the admin behind Cloudflare Access.

## Run

```bash
pnpm install
cp .dev.vars.example .dev.vars   # ADMIN_DEV_BYPASS=1: no Access login under `nuxt dev`
pnpm db:migrate:local            # creates the tables in the local D1 (.wrangler/state)
pnpm dev
```

- `pnpm dev` gets local D1 (`DB`), R2 (`MEDIA`) and the values in `.dev.vars` from `wrangler.jsonc` through `nitro-cloudflare-dev`. Nothing goes to Cloudflare.
- `ADMIN_DEV_BYPASS=1` works only under `nuxt dev` (`import.meta.dev`). The production build ignores it, also under `wrangler dev`.
- To run the production build locally: `pnpm build`, then `npx wrangler dev` (uses the same local D1/R2). `/api/admin/*` then needs a real Access token, so admin requests get 401 (or 500 while `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are empty).

## Content

- Portfolio items (`apps`), blog posts (`posts`) and pages (`pages`) live in the D1 database `ppogg`. The schema is in `migrations/0001_init.sql`.
- Uploaded images live in the R2 bucket `ppogg-media` and are served from `/media/<id>` with long cache headers. SVGs get `Content-Security-Policy: sandbox`.
- Edit content at `/admin`. Cloudflare Access protects `/admin` and `/api/admin/*`; the server checks the Access token on every admin request.
- Public routes read only rows with `published = 1`, so drafts never reach a public page or `/api/content/*`.

## Caching

There is no page cache. Every public request reads D1 when it renders, so a publish or unpublish shows on the next request, and a draft can never be served from a cache.

Why: Nitro's default cache on Workers is memory in one isolate (not shared and lost often), a KV cache would need one more binding and still serve stale pages for up to its TTL plus KV propagation (about a minute) after an unpublish, and Workers responses are not cached by the Cloudflare CDN unless the code uses the Cache API. The site has little traffic and each page does one to three small indexed D1 reads, so the cache is not worth the risk of serving an unpublished row. If you add one later, it must drop or bypass cached entries on every admin write.

## Page builder

- Pages made at `/admin` > Pages use blocks: hero, text, card grid, key figures, image and call to action. Reorder, duplicate and preview them there.
- A built page is saved as JSON in the page `body` (`{"v":1,"blocks":[...]}`), so no schema change is needed. Older Markdown pages still work and can be moved into the builder.
- The home page, `/services` and the header/footer are editable under `/admin` > Pages > Site pages. Until you save a change they use the built-in defaults in `app/data/site.ts` and `app/data/defaults.ts`. "Reset to built-in" deletes the saved row.
- These are stored in the `pages` table under the reserved slugs `home`, `services` and `site-settings`. Publishing the row ("Use this version on the site") is what makes it live.

## Deploy

1. `wrangler d1 create ppogg` and put the `database_id` in `wrangler.jsonc`. `wrangler r2 bucket create ppogg-media`.
2. Create a Cloudflare Access application for `/admin` and `/api/admin/*` on the site domain. Put the team domain and the application AUD tag in `wrangler.jsonc` (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`).
3. `pnpm db:migrate` (applies `migrations/` to the remote D1), then `pnpm deploy` (`nuxt build && wrangler deploy`).

Never set `ADMIN_DEV_BYPASS` on the deployed Worker; it has no effect there, but it should not exist.

## Troubleshooting

- `nuxt prepare` fails with "The requested module 'simple-git' does not provide an export named 'default'" and a stack in another project's `node_modules`: a `node_modules` folder (or link) above this repo, such as `C:\node_modules`, is being found before this repo's packages. `@nuxt/devtools` is a declared dev dependency so that Nuxt finds its own copy; if another undeclared package leaks in, remove the stray parent `node_modules`.

## Test

```bash
npx vitest run
```
