# Cloudflare setup guide

This guide moves ppo.gg from Appwrite to Cloudflare. You do each step yourself. Appwrite stays live until the last step, so you can go back at any time before that.

Dashboard menu names change from time to time. When a step says "look for", the name may be a little different in your dashboard. Run every command from the root of this repository.

## What lives where

| Part | Lives in | Notes |
|---|---|---|
| Site (pages and API) | Cloudflare Worker `ppogg` | Built by Nuxt, uploaded by `wrangler deploy` |
| Content (apps, posts, pages) | D1 database `ppogg` | Schema in `migrations/0001_init.sql` |
| Images | R2 bucket `ppogg-media` | Served at `/media/<id>` |
| Admin login | Cloudflare Access | Your email and a one-time code |

For local development, see the Run section in `README.md`: `cp .dev.vars.example .dev.vars`, `pnpm db:migrate:local`, `pnpm dev`. Local development does not touch Cloudflare.

## 0. Before you start

You need:

- A Cloudflare account that has the DNS for `ppo.gg`.
- R2 turned on in the account. Cloudflare can ask for a payment method, even on the free plan.
- Zero Trust (Access) turned on in the account. Cloudflare can ask for a payment method here too.
- Node and pnpm on your computer.
- The Appwrite project, still live. Do not delete it yet.

Plan for a short downtime at cutover (step 7). You accepted this.

## 1. Install and log in

1. Run `pnpm install`.
   Check: the command ends without an error.
2. Run `pnpm exec wrangler login`. A browser window opens. Allow access.
   Check: run `pnpm exec wrangler whoami`. It shows your account.

## 2. Create the database and the bucket

1. Run `pnpm exec wrangler d1 create ppogg`.
   Check: the output shows a `database_id` (a UUID).
2. Open `wrangler.jsonc`. Replace the `database_id` value `00000000-0000-0000-0000-000000000000` with the new id. Save the file.
   Check: the file no longer contains the zeros id.
3. Run `pnpm exec wrangler r2 bucket create ppogg-media`.
   Check: run `pnpm exec wrangler r2 bucket list`. It lists `ppogg-media`. If this command asks for R2 to be turned on, turn it on in the Cloudflare dashboard (look for R2 in the sidebar), then run the command again.

## 3. Create the tables

1. Run `pnpm db:migrate`. This script applies `migrations/` to the remote database. Answer yes when it asks.
   Check: run this command. The list must show `apps`, `pages` and `posts`.

   ```bash
   pnpm exec wrangler d1 execute ppogg --remote --command "select name from sqlite_master where type='table'"
   ```

## 4. First deploy to workers.dev

1. Run `pnpm cf:deploy`. Do not run `pnpm deploy`: it is a built-in pnpm command and does not run this script.
   Check: the output ends with a `https://ppogg.<your-subdomain>.workers.dev` address. Open it. The public site loads. The site shows its built-in defaults, because the database has no content yet.
2. Open `/api/admin/me` on that address.
   Check: you get a 500 error with "Access is not configured". This is expected and correct. The admin API refuses every request until you set the Access values in step 5.

## 5. Protect the admin with Access

Do these steps in the Cloudflare dashboard. Look for **Zero Trust** in the sidebar (it can also be called "Cloudflare One").

1. Choose a team name if Zero Trust asks for one. The team domain is `<team>.cloudflareaccess.com`. Look in Zero Trust settings (look for Settings, then Custom Pages or General) if you do not know it.
2. Make sure One-time PIN is a login method. Look for Settings > Authentication > Login methods. Add "One-time PIN" if it is not there.
3. Create the application. Look for Access > Applications > Add an application. Choose type **Self-hosted**.
4. Add these destinations (public hostnames), with the workers.dev host from step 4:
   - `ppogg.<your-subdomain>.workers.dev`, path `/admin*`
   - `ppogg.<your-subdomain>.workers.dev`, path `/api/admin*`

   Look for the field for the path. The dashboard may ask for the host and the path in two fields. You add the `ppo.gg` destinations in step 7.
5. Add one policy. Action: **Allow**. Rule: Emails, with your email address only. Do not add any other rule.
6. Set the login method for the application to One-time PIN only.
7. Check the cookie settings in the application. Leave SameSite at the default, or set it to Lax or Strict. Never set it to None. The CSRF defence in the code needs the cookie to stay out of cross-site requests.
8. Save the application. Open it again and copy the **Application Audience (AUD) Tag**.
9. Open `wrangler.jsonc`. Set the two values in the file:
   - `ACCESS_TEAM_DOMAIN`: the team domain only, for example `myteam.cloudflareaccess.com`. No `https://`, no `/` at the end, no path.
   - `ACCESS_AUD`: the AUD tag.

   Edit the file. Do not set these values in the dashboard: `wrangler deploy` replaces dashboard values with the values in the file.
10. Run `pnpm cf:deploy` again.

Public routes must stay outside Access: `/`, `/blog`, `/api/content/*` and `/media/*`. The application covers only `/admin*` and `/api/admin*`.

Check:

- Open `/admin` on the workers.dev address. Access asks for your email, then for the code it sends. After that, the admin shows.
- Open `/api/admin/me` in the same browser. It returns your email.
- Open `/api/admin/me` in a private window with no login. You get the Access login page, not data.
- Open `/` and `/blog` in the private window. They load without a login.

## 6. Test on workers.dev

Do this before you touch the DNS. Use the admin on the workers.dev address.

- [ ] Create an app, publish it, unpublish it, delete it.
- [ ] Create a post, publish it, unpublish it, delete it.
- [ ] Create a page, publish it, unpublish it, delete it.
- [ ] Upload a png image. It shows at `/media/<id>` (the admin shows the id).
- [ ] An unpublished item disappears from the public site at once (reload the public page).
- [ ] Use the same slug on two posts. The admin shows the "slug in use" message.
- [ ] Open the header and footer settings page. Change a value and save it. The change shows on the site on the next page load.
- [ ] Log out: open `/cdn-cgi/access/logout`. Then open `/admin`. Access asks for the code again.

Delete your test items when you finish.

## 7. Cutover to ppo.gg

Today Appwrite Sites serves `ppo.gg`. In this step the Worker takes over. Expect a short downtime.

1. In the Cloudflare dashboard, open the DNS records for `ppo.gg` (look for DNS > Records). Find the record that points `ppo.gg` to Appwrite. Take a screenshot or copy its type, name and value. You need it for the rollback.
2. Add `ppo.gg` to the Access application. Add these destinations: host `ppo.gg`, path `/admin*`, and host `ppo.gg`, path `/api/admin*`. Save.
3. Remove the DNS record that points to Appwrite. Cloudflare will not let you attach a custom domain while a conflicting record exists.
4. Attach the Worker to `ppo.gg`. Look for Workers & Pages > `ppogg` > Settings > Domains & Routes (the name may differ). Add a **Custom domain** and enter `ppo.gg`. Cloudflare creates the DNS record for you.
5. Wait. The new record and the certificate can take a few minutes. Plan for up to an hour in the worst case. During this time `ppo.gg` can show an error.

Check on `https://ppo.gg`: do all the items from step 6 again. Also do the Access checks from step 5 on `https://ppo.gg` (`/admin` asks for the code, `/api/admin/me` in a private window shows the Access login page).

**Rollback.** If something is wrong and you cannot fix it fast: remove the Worker custom domain for `ppo.gg`, then restore the DNS record you saved in step 1. Appwrite is still live and nothing is deleted, so the old site returns when DNS has propagated.

## 8. Content

The Appwrite content was test data. Enter the real content again at `/admin` on `https://ppo.gg`.

The home page, `/services` and the header and footer use built-in defaults until you save a change. See the Page builder section in `README.md`.

## 9. Definition of done

Do not go on to step 10 until every box is checked.

- [ ] `https://ppo.gg` serves from Cloudflare. All public routes work: `/`, `/services`, `/blog`, `/blog/<slug>`, `/<slug>`.
- [ ] No request goes to an `appwrite.io` host. Open the browser network tab on each public page and on `/admin`, and look for `appwrite.io`.
- [ ] `/admin` and `/api/admin/*` are not reachable without passing Access (private window test).
- [ ] You can create, edit, publish, unpublish and delete an app, a post and a page, and upload an image.
- [ ] An unpublished item never shows on a public route or in `/api/content/*`.
- [ ] From the root of the repository, `grep -ri appwrite` over the source, config and `package.json` finds nothing. Run it like this, so that it skips `node_modules` and the history notes in `docs/`:

  ```bash
  grep -ri appwrite app server tests nuxt.config.ts package.json README.md wrangler.jsonc
  ```

- [ ] The site works while the Appwrite project is paused or deleted. If you want to be sure, wait a few days, longer than the 7-day Appwrite pause, then check the site again.

## 10. Delete the Appwrite project

Do this last. Do it only when every box in step 9 is checked. You can wait a few days first if you prefer.

**This step cannot be undone.** Appwrite deletes the project, its database and its files for good. Download anything you still want before you start.

1. In the Appwrite console, open the project settings and delete the project. Look for Settings > Delete project.
   Check: `https://ppo.gg` still works.

## 11. Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| 500 "Access is not configured" on `/api/admin/*` | `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is empty or not in `wrangler.jsonc` | Set both in `wrangler.jsonc` (team domain only: no `https://`, no `/`, no path). Run `pnpm cf:deploy`. |
| 401 on the admin after you log in | Wrong AUD tag; or the Access application does not cover `/api/admin*`; or the cookie does not reach that path | Copy the AUD tag again. Check the application destinations for `/admin*` and `/api/admin*` on the host you use. Check that SameSite is not None and that the host in the address bar is a host in the application. |
| Admin writes return 403 | The code compares the host in the `Origin` header with the `Host` header. They are different if a proxy rewrites `Host`. | Do not rewrite the `Host` header in front of the Worker. A direct Custom domain or workers.dev address does not rewrite it. |
| "Error 1102" or "CPU limit exceeded" on a page | The free plan gives 10 ms of CPU for each request. The site has no page cache, so each page renders in full. | Add a Cache API layer with a TTL shorter than 60 seconds (and drop it on every admin write), or use the paid Workers plan. See Caching in `README.md`. |
| 409 "That slug is already in use" when you save | Another post or page has this slug | Use a different slug. |
| 422 when you save | The server checked the fields and found a problem. The message lists them. | Fix the fields in the message and save again. |
| `nuxt prepare` fails with a `simple-git` error | A `node_modules` folder above the repo is found first | See Troubleshooting in `README.md`. |
| D1 error "no such table" | The migration was not applied to the remote database | Run `pnpm db:migrate`. It uses `--remote`. Use the `select name from sqlite_master` command in step 3 to check. |
