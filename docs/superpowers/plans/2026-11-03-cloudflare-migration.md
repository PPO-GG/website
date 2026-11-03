# Move ppo.gg from Appwrite to Cloudflare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve ppo.gg (public site and `/admin`) from Cloudflare Workers, D1 and R2, with Cloudflare Access as the only login, and no Appwrite dependency left.

**Architecture:** Nuxt 4 builds with the Nitro `cloudflare_module` preset. Nitro server routes own all data: public reads under `/api/content/*`, owner-only writes under `/api/admin/*`, images under `/media/[id]`. The browser composables `useContent()` and `useAdmin()` keep their current surface and call these routes. Pure validation, mapping and form code in `app/utils/content/*` is reused by the server.

**Tech Stack:** Nuxt 4, Nitro (`cloudflare_module`), Cloudflare D1 + R2 + Access, `wrangler`, `jose` (JWT check), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-cloudflare-migration-design.md`

## Global Constraints

- Stay on the free tier: Workers, D1, R2, Access. No paid add-ons.
- Each task is two commits: `Add failing tests for <area>` (stubs compile, tests fail on an assertion), then `Implement <area>`. Do not push.
- Tests: `npx vitest run`. Typecheck: `pnpm typecheck`. Both pass at the end of every task.
- No opportunistic refactors. `app/components/GlobeBackground.vue` has an unrelated uncommitted edit: never stage it.
- UI text follows ASD-STE100 (short, active sentences), same style as today's strings.
- `/admin/**` stays `ssr: false`.
- Every D1 statement uses bound parameters. Table names come from the `TABLE` whitelist, never from raw input.
- `grep -ri appwrite` over `app server tests nuxt.config.ts package.json README.md wrangler.jsonc` finds nothing at the end of Task 8.
- Access values are `wrangler` vars `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`. The dev bypass needs `import.meta.dev` and `ADMIN_DEV_BYPASS=1` together.

## Review Focus

1. Unpublish then read: a row set to `published = 0` is gone from `/api/content/*` immediately and is never served from a cache. (Task 4, Task 8)
2. Any admin route, any method, with no token, an expired token, a wrong-audience token or a token signed by another key returns 401, and writes nothing. (Task 3, Task 5)
3. Two saves with the same slug at once: the unique index decides, and the loser gets 409, not 500. (Task 5)
4. An SVG upload cannot run script on the site origin; a file over 10 MB or of another type is rejected before it reaches R2. (Task 6)
5. A missing D1 binding or a D1 error on a public read gives 5xx and `failed: true`, never an empty 200. (Task 4, Task 7)

---

### Task 1: Rename `$id` to `id`, drop Appwrite permissions

**Files:**
- Modify: `app/types/app.ts` (`AppRow`, `PostRow`, `PageRow`: `$id` becomes `id`), `app/utils/content/mappers.ts`, `app/utils/content/admin.ts` (delete `rowPermissions`), `app/pages/admin/index.vue` (`r.$id` to `r.id`)
- Test: `tests/admin.test.ts`, `tests/mappers.test.ts`, `tests/blocks.test.ts`

**Interfaces:**
- Produces: row types with `id: string`; `mapApp/mapPost/mapPage` read `row.id`.

- [ ] **Step 1:** Update the three test files: every `$id:` fixture becomes `id:`; delete the `rowPermissions` `describe`; rename the mapper test title to "uses id as id". Run `npx vitest run`; expected: mapper and form tests FAIL on `id` being `undefined`.
- [ ] **Step 2:** Commit `Add failing tests for id rename`.
- [ ] **Step 3:** Make the type, mapper, util and admin page changes above. Run `npx vitest run` and `pnpm typecheck`; expected: PASS.
- [ ] **Step 4:** Commit `Rename $id to id and remove rowPermissions`.

### Task 2: D1 schema and row conversion

**Files:**
- Create: `migrations/0001_init.sql`, `server/utils/rows.ts`
- Test: `tests/rows.test.ts`, `tests/helpers/d1.ts`

**Interfaces:**
- Produces:
  - `D1Like` (type, in `server/utils/db.ts`, created in this task): the `prepare(sql).bind(...).all() / first() / run()` subset of D1 that server code uses. Task 4 adds `useDb` to the same file.
  - `TABLE = { Apps: 'apps', Posts: 'posts', Pages: 'pages' } as const` and `type Table`.
  - `dbToRow(table: Table, raw: Record<string, unknown>): AppRow | PostRow | PageRow` (published `0/1` to boolean, `stack` JSON text to `string[]`).
  - `dataToDb(table: Table, id: string, data: Record<string, unknown>): Record<string, unknown>` (the reverse; `stack` to JSON text, boolean to `0/1`).
  - `tests/helpers/d1.ts`: `makeTestDb(): D1Like`, an in-memory SQLite (`node:sqlite`; use `better-sqlite3` only if the Node version lacks it) with `migrations/0001_init.sql` applied, exposing the `prepare().bind().all()/first()/run()` subset of D1 that the server code uses.
- Schema: columns exactly as in `scripts/appwrite-setup.sh` (apps: name, kind, stack, year, status, href, order, description, imageId, imageUrl, published; posts: slug, title, description, body, publishedAt, published; pages: slug, title, body, published), plus `id TEXT PRIMARY KEY`, `createdAt`, `updatedAt`. `UNIQUE(slug)` on posts and pages; index on `apps(\`order\`)`. `order` is quoted because it is a SQL keyword.

- [ ] **Step 1:** Write tests: `dbToRow('apps', { stack: '["a","b"]', published: 1, ... })` gives `stack: ['a','b']` and `published: true`; `dataToDb` round-trips; unknown `published` values (`2`, `null`) map to `false`; the migration applies to `makeTestDb()` and inserting two posts with the same slug throws. Run; expected FAIL.
- [ ] **Step 2:** Commit `Add failing tests for D1 rows`.
- [ ] **Step 3:** Write the migration and `rows.ts`. Run `npx vitest run tests/rows.test.ts`; expected PASS.
- [ ] **Step 4:** Commit `Add D1 schema and row conversion`.

### Task 3: Access JWT check

**Files:**
- Create: `server/utils/access.ts`
- Test: `tests/access.test.ts`
- Modify: `package.json` (add `jose`)

**Interfaces:**
- Produces:
  - `verifyAccessToken(token: string | undefined, cfg: { teamDomain: string; aud: string }, keys: JWTVerifyGetKey): Promise<{ email: string }>`; throws on every failure.
  - `requireOwner(event: H3Event): Promise<{ email: string }>`; reads `Cf-Access-Jwt-Assertion`, builds the remote JWKS from `https://<teamDomain>/cdn-cgi/access/certs`, throws an H3 error with status 401 on any failure, and 500 if `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is not set (a missing setting never lets a request through).
  - Dev bypass: when `import.meta.dev && ADMIN_DEV_BYPASS === '1'`, `requireOwner` returns `{ email: 'dev@localhost' }`.

- [ ] **Step 1:** Write tests with a locally generated keypair and a static JWKS: valid token returns the email claim; no token, empty string, expired, wrong `aud`, wrong `iss`, `alg: none`, and a token signed by a different key each reject. Test that `requireOwner` with no vars set returns 500, and that `ADMIN_DEV_BYPASS=1` alone (without `import.meta.dev`) does not bypass. Run; expected FAIL.
- [ ] **Step 2:** Commit `Add failing tests for Access check`.
- [ ] **Step 3:** Implement with `jose` `jwtVerify`, passing `issuer` and `audience`. Run tests; expected PASS.
- [ ] **Step 4:** Commit `Add Access JWT check`.

### Task 4: Public content routes

**Files:**
- Create: `server/utils/db.ts` (`useDb(event): D1Like`, reads `event.context.cloudflare.env.DB`, throws 500 if absent), `server/utils/content-repo.ts`, `server/api/content/apps.get.ts`, `server/api/content/posts/index.get.ts`, `server/api/content/posts/[slug].get.ts`, `server/api/content/pages/[slug].get.ts`
- Test: `tests/content-repo.test.ts`

**Interfaces:**
- Consumes: `dbToRow`, `TABLE`, `makeTestDb`.
- Produces (in `content-repo.ts`, all take `db: D1Like`): `listPublishedApps(db): Promise<AppRow[]>` (ordered by `order` asc, limit 100); `listPublishedPosts(db): Promise<PostRow[]>` (`publishedAt` desc, limit 100); `getPublishedPost(db, slug): Promise<PostRow | null>`; `getPublishedPage(db, slug): Promise<PageRow | null>`. Routes return rows as JSON; a missing row is `null` with status 200, a D1 error is thrown as 500.

- [ ] **Step 1:** Tests against `makeTestDb()`: with one published and one draft row in each table, every function returns only the published one; a draft slug returns `null`; unpublishing a row and calling again drops it (Review Focus 1); a closed or broken db makes the function throw (Review Focus 5). Run; expected FAIL.
- [ ] **Step 2:** Commit `Add failing tests for public content`.
- [ ] **Step 3:** Implement the repo and the four routes. Run tests; expected PASS.
- [ ] **Step 4:** Commit `Add public content routes`.

### Task 5: Admin content routes

**Files:**
- Create: `server/utils/admin-repo.ts`, `server/api/admin/me.get.ts`, `server/api/admin/[table]/index.get.ts`, `server/api/admin/[table]/index.post.ts`, `server/api/admin/[table]/[id].put.ts`, `server/api/admin/[table]/[id].delete.ts`
- Test: `tests/admin-repo.test.ts`, `tests/admin-routes.test.ts`

**Interfaces:**
- Consumes: `requireOwner`, `dataToDb`, `dbToRow`, `appToForm/postToForm/pageToForm`, `validateApp/validatePost/validatePage`.
- Produces:
  - `listRows(db, table, sort: { key: string; desc?: boolean }): Promise<Row[]>`; `key` must be in a per-table whitelist (`apps`: `order`, `name`; `posts`: `publishedAt`, `title`; `pages`: `title`, `slug`), otherwise 400. Lists include drafts. Limit 100.
  - `createRow(db, table, data): Promise<void>`, `updateRow(db, table, id, data): Promise<void>`, `deleteRow(db, table, id): Promise<void>`. Each validates first by building a row from `data` and running it through `xToForm` then `validateX`; failures throw 422 with `{ errors: string[] }`. The server generates `id` (`crypto.randomUUID()`) and `createdAt/updatedAt`. A `UNIQUE` violation on `slug` throws 409. An unknown `id` on update or delete throws 404.
  - Every route calls `requireOwner(event)` first. `[table]` outside `apps|posts|pages` is 404.
  - `GET /api/admin/me` returns `{ email }`.
  - System slugs (`home`, `services`, `site-settings`) are saved like any page row and pass `validatePage`.

- [ ] **Step 1:** Repo tests against `makeTestDb()`: create then list round-trips each table; invalid year / empty title / bad slug give 422 with the existing messages; duplicate slug gives 409 (and a concurrent pair via `Promise.all` leaves exactly one row, Review Focus 3); update and delete of an unknown id give 404; a bad sort key gives 400; a system-slug page saves. Route tests call each handler with a mock event and no, expired or wrong-audience token and assert 401 with no row written, for every route and method (Review Focus 2). Run; expected FAIL.
- [ ] **Step 2:** Commit `Add failing tests for admin routes`.
- [ ] **Step 3:** Implement. Run tests; expected PASS.
- [ ] **Step 4:** Commit `Add admin content routes`.

### Task 6: Media upload and serving

**Files:**
- Create: `server/api/admin/upload.post.ts`, `server/routes/media/[id].get.ts`, `server/utils/media.ts`
- Test: `tests/media.test.ts`

**Interfaces:**
- Produces:
  - `checkUpload(name: string, size: number, type: string): void`; throws 415 for an extension outside png, jpg, jpeg, webp, gif, svg, and 413 above `10 * 1024 * 1024` bytes.
  - `POST /api/admin/upload` (multipart, owner only) stores the file in the R2 binding `MEDIA` under `crypto.randomUUID()` plus the extension, with `contentType`, and returns `{ id, url: '/media/<id>' }`.
  - `GET /media/[id]`: streams the object, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`; for `image/svg+xml` also `Content-Security-Policy: sandbox`. Unknown id is 404. `id` must match `^[0-9a-f-]{36}\.[a-z]+$` before touching R2.

- [ ] **Step 1:** Tests: `checkUpload` rejects `.html`, `.exe`, a double extension `x.png.html`, 10 MB + 1 byte, and accepts each allowed type at exactly 10 MB; `id` validation rejects `../x` and an empty id; the SVG response carries the sandbox header and the png response does not; upload with no token is 401 (Review Focus 4). Run; expected FAIL.
- [ ] **Step 2:** Commit `Add failing tests for media`.
- [ ] **Step 3:** Implement. Run tests; expected PASS.
- [ ] **Step 4:** Commit `Add media upload and serving`.

### Task 7: Browser composables and admin page

**Files:**
- Modify: `app/composables/useContent.ts`, `app/composables/useAdmin.ts`, `app/pages/admin/index.vue`, `app/components/admin/AppEditor.vue`, `app/components/admin/MarkdownField.vue`, `app/components/admin/PageBuilder.vue`
- Delete: `app/components/admin/AdminLogin.vue`
- Test: `tests/explain.test.ts`

**Interfaces:**
- `useContent()` keeps `fileUrl(id) => '/media/' + id`, `apps()`, `posts()`, `post(slug)`, `page(slug)` and the `Loaded<T>` result; each uses `$fetch('/api/content/...')`, and a thrown error still logs and returns `failed: true`.
- `useAdmin()` keeps `list`, `save`, `remove`, `upload`; drops `login`/`logout`. `restore()` calls `/api/admin/me` and sets `user` to `{ email }` or `null`. `ADMIN_TABLE` stays exported. `explain(e: unknown): string` maps a `$fetch` error with status 401/403 to the existing "Your login ended or has no access. Log in again." text, 409 to the existing slug text, 422 to `data.errors.join(' ')`, otherwise the error message.
- `admin/index.vue`: remove the `AdminLogin` branch and the logout button. Access guards the page, so when `restore()` returns false show one line: "You have no access. Log in with Cloudflare Access."

- [ ] **Step 1:** Write `explain` tests for 401, 403, 409, 422 and a plain `Error`. Run; expected FAIL.
- [ ] **Step 2:** Commit `Add failing tests for explain`.
- [ ] **Step 3:** Rewrite the composables and page. Run `npx vitest run` and `pnpm typecheck`; expected PASS.
- [ ] **Step 4:** Commit `Switch browser code to Cloudflare routes`.

### Task 8: Cloudflare build, config and Appwrite removal

**Files:**
- Create: `wrangler.jsonc`, `.dev.vars.example`
- Modify: `nuxt.config.ts`, `package.json`, `README.md`
- Delete: `appwrite.config.json`, `scripts/appwrite-setup.sh`

**Interfaces:**
- `nuxt.config.ts`: `nitro: { preset: 'cloudflare_module' }`; remove `runtimeConfig.public.appwrite`; replace the three `cache: { swr }` route rules with the mechanism chosen in step 1. `/admin/**` stays `ssr: false`.
- `wrangler.jsonc`: `name: "ppogg"`, D1 binding `DB` (database `ppogg`), R2 binding `MEDIA` (bucket `ppogg-media`), `migrations_dir: "migrations"`, vars `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` (empty placeholders), `compatibility_date` as in `nuxt.config.ts`.
- `package.json`: remove `appwrite` and `node-appwrite`; add `wrangler` (dev) and scripts `cf:deploy` (`nuxt build && wrangler deploy`; not `deploy`, which `pnpm deploy` shadows as a built-in) and `db:migrate` (`wrangler d1 migrations apply ppogg --remote`).

- [ ] **Step 1:** Choose the public caching mechanism (KV, Cache API, or none) and record the choice in the README. Constraint: an unpublish must be visible within one minute and a draft must never be cached (Review Focus 1). If you cache, add a test that a cached response is dropped after a write.
- [ ] **Step 2:** Make the changes. Run `pnpm build`; expected: the build succeeds and `.output/server` targets Cloudflare.
- [ ] **Step 3:** Run `pnpm dev` with local D1/R2, `.dev.vars` set to `ADMIN_DEV_BYPASS=1`; create, publish and unpublish an app, post and page and upload an image through `/admin`; confirm the public pages follow. Run the final `grep -ri appwrite` from Global Constraints; expected: no matches.
- [ ] **Step 4:** Commit `Build for Cloudflare and remove Appwrite`.

### Task 9: Cloudflare setup guide and cutover

**Files:**
- Create: `docs/cloudflare-setup.md`

The owner does the account steps; this task writes them and checks the result.

- [ ] **Step 1:** Write exact dashboard steps with the exact commands: create D1 `ppogg` and R2 `ppogg-media` (copy the new D1 id into `wrangler.jsonc`); `pnpm db:migrate` (the script already passes `--remote`); create the Access application covering `/admin*` and `/api/admin*` on `ppo.gg` and the `workers.dev` host, with one policy allowing the owner's email via one-time PIN; copy the team domain and AUD tag into `wrangler.jsonc` vars; `pnpm cf:deploy`; test `/admin` on the `workers.dev` address; replace the DNS record that points at Appwrite with the Worker route; check the Definition of Done in the spec; delete the Appwrite project last.
- [ ] **Step 2:** Commit `Add Cloudflare setup guide`. Stop here and hand the guide to the owner; do not run `wrangler deploy` or change DNS without their go-ahead.
