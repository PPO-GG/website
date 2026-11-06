# Move ppo.gg from Appwrite to Cloudflare

## Intent

ppo.gg runs on Appwrite's free tier. Appwrite pauses a free project after 7 days without activity, and a pause takes the whole project down: hosting, database, login and image storage. The owner wants a site that stays up without being touched. Cloudflare's free tier has no inactivity pause, and the domain's DNS is already on Cloudflare.

The move replaces all four Appwrite jobs (hosting, content database, media storage, admin login). Moving only the hosting would not fix the problem, because the content API would still pause.

## Goals

- The public site (home, `/services`, `/blog`, `/blog/[slug]`, `/[slug]`) looks and behaves the same as today, served from Cloudflare.
- `/admin` keeps its current editing features (apps, posts, pages, page builder, image upload) for one person, the owner.
- Nothing in the running site depends on Appwrite. The `appwrite` and `node-appwrite` packages, `appwrite.config.json` and `scripts/appwrite-setup.sh` are gone.
- Everything runs on Cloudflare's free tier.

## Non-goals

- Migrating existing content. The Appwrite content is test data and is re-entered by hand.
- More than one admin user, roles, or a self-built login system.
- New features, redesigns, or refactors of components that only need their data source swapped.
- Keeping Appwrite as a fallback after cutover.

## Anti-goals

- Admin writes reachable without a verified Cloudflare Access identity. A check that fails open is worse than no admin.
- A draft (unpublished row) visible on a public route or in a public API response.
- Moving the hosting but leaving a hidden Appwrite dependency that still pauses.

## Decisions made

By the owner:

- Only the owner logs in to `/admin`.
- Existing content can be rewritten, so there is no data migration.
- `ppo.gg` is already on Cloudflare DNS.
- Hosting, content, media and login all move to Cloudflare.

My calls (the owner has not reviewed these):

- **Hosting:** Nuxt on Cloudflare Workers, with the Nitro `cloudflare_module` preset, deployed with `wrangler`. Cutover is done by first deploying to a `workers.dev` address, checking it, then attaching `ppo.gg` as a route.
- **Content:** a D1 database with the same three tables (`apps`, `posts`, `pages`) and the same fields as the current Appwrite tables (see `scripts/appwrite-setup.sh` for the field list). The schema lives in `migrations/0001_init.sql`, applied with `wrangler d1 migrations`. `published` is an integer 0/1. `stack` on `apps` is stored as JSON text. Row ids are generated UUIDs, exposed as `id` (the `$id` field in `app/types/app.ts` and `app/utils/content/mappers.ts` becomes `id`). `slug` is unique on `posts` and `pages`; `apps` has an index on `order`.
- **Public reads:** Nitro server routes under `/api/content/*` read D1 and always filter on `published = 1`. `useContent()` keeps its current shape (`apps()`, `posts()`, `post(slug)`, `page(slug)`, `fileUrl(id)` and the `{ data, failed }` result) and calls these routes, so pages and block components change as little as possible.
- **Admin writes:** Nitro server routes under `/api/admin/*` for list, save, delete and upload. Each route verifies the `Cf-Access-Jwt-Assertion` header against the Access team's public keys and the application audience tag before doing anything. `useAdmin()` keeps its list/save/remove/upload surface and calls these routes. `AdminLogin.vue` and the login/logout flow are removed. `restore()` becomes a call to an `/api/admin/me` route that tells the page whether the caller is the owner.
- **Admin protection:** a Cloudflare Access application covers `/admin*` and `/api/admin*`, allowing the owner's email with a one-time email code.
- **Media:** an R2 bucket. Upload goes through `/api/admin/upload`, which keeps the current limits (png, jpg, jpeg, webp, gif, svg; 10 MB). Images are served from `/media/[id]` on the same origin with long cache headers. SVGs are served with a `Content-Security-Policy: sandbox` header so a hostile SVG cannot run script on the site origin.
- **Deploy command:** a `pnpm cf:deploy` script that builds and runs `wrangler deploy` (not `deploy`: `pnpm deploy` is a pnpm built-in). `wrangler.jsonc` holds the D1 and R2 bindings.
- **Error text:** `explain()` in `useAdmin.ts` is rewritten for the new routes (401/403 "login ended", 409 "slug in use"). UI text follows the existing ASD-STE100 style.
- **Docs:** `README.md` is updated (content, deploy, setup sections).

- **Server-side rules:** the admin routes re-run `validateApp`, `validatePost` and `validatePage` on every save. The server generates ids and timestamps and returns 409 on a duplicate slug. The reserved system slugs (`home`, `services`, `site-settings`) keep today's behaviour: they are hidden from the page list, and the public `/[slug]` route does not serve `site-settings`.
- **Dead code:** `rowPermissions` and its tests are deleted with the Appwrite permission model. Other tests change only from `$id` to `id`.
- **Images:** both `imageId` and `imageUrl` stay, as today (`imageId` wins, `imageUrl` is the fallback for an external image).
- **D1 failure on public reads:** the content API returns a 5xx and `useContent()` returns `failed: true`, so pages show the same "could not load" state as today. No stale fallback and no silent empty site.
- **Access values:** the team domain and audience tag reach the Worker as `wrangler` vars (not secrets: they are not secret). The dev bypass is controlled by one env variable that exists only in local dev config.
- **Pre-cutover check:** the `workers.dev` hostname is added to the same Access application, so the admin can be tested there before `ppo.gg` is attached.

## Constraints

- The owner must have a Cloudflare account with R2 and Zero Trust (Access) turned on. Both can ask for a payment method on file even on the free plan. Creating or enabling these is the owner's action, not something the build does.
- The Worker bundle, D1 and R2 free-tier limits apply (Workers: 100k requests/day; D1: 5 GB; R2: 10 GB). Nothing here is expected to come near them.
- `/admin/**` stays client-rendered (`ssr: false`) as it is today.
- Existing tests (`npx vitest run`) must keep passing; pure logic in `app/utils/content/*` stays unit-testable without Cloudflare.
- Local development must work without Cloudflare Access: either `wrangler`/Nitro dev with local D1 and R2 emulation, plus an explicit dev-only bypass for the Access check that is off unless a dev env variable is set and can never be on in a deployed build.

## Left to the builder

- Exact route names and file layout under `server/`.
- How to replace the `routeRules` `cache: { maxAge: 60, swr: true }` rules. Nitro's default cache storage on Workers is per-isolate memory, so this needs a real choice (Cloudflare KV, the Cache API, or dropping it if D1 reads are fast enough). Public pages should stay fast and drafts must never be cached into public responses after an unpublish.
- Whether `/media/[id]` reads R2 through the Worker or through an R2 public domain.
- Test strategy for the Access JWT check and the `published = 1` filter, including fixtures and the dev bypass.
- Cleaning up fonts, `GlobeBackground.vue` and other files that are unrelated to this change: leave them alone (there is an uncommitted edit to `GlobeBackground.vue` that is not part of this work).

## Definition of done

- `ppo.gg` serves from Cloudflare with all public routes working and no request to an `appwrite.io` host.
- `/admin` is unreachable without passing Access, API routes reject requests without a valid Access token, and the owner can create, edit, publish, unpublish and delete an app, a post and a page, and upload an image.
- An unpublished row never appears in any public route or API response.
- `grep -ri appwrite` over source, config and `package.json` finds nothing except historical notes in this document.
- The Appwrite project can be deleted without the site noticing.
