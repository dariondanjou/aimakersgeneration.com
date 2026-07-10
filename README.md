# aimakersgeneration.com

Three surfaces, one Vercel project.

| URL | What | Built from |
|---|---|---|
| `aimakersgeneration.com/` | Public marketing landing. Crawlable, no login. | `index.html` — plain HTML, no React |
| `cohorts.aimakersgeneration.com/` | Cohort enrollment + Stripe checkout. | `apply.html` — plain HTML, no React |
| `aimakersgeneration.com/community` | The member app: Dashboard, profiles, AI Maker Bot. | `app.html` → `src/` (React SPA) |

`aimakersgeneration.com/apply` **301-redirects** to the cohorts subdomain, so old links keep working.

The public pages are deliberately **not** React. `WEBSITE-STRATEGY.md` argues the landing page must be
crawlable, and a client-rendered SPA shell isn't reliably read by the non-Google bots (ChatGPT,
Perplexity) that the Atlanta keyword strategy targets. Host routing lives in `vercel.json`.

---

## 🔴 Do these before you take a single real payment

| # | Task | Why |
|---|---|---|
| 1 | **Have a lawyer read the refund and liability wording** in `apply.html` (the red block + the seven acknowledgements). | It was drafted to protect AIMG, but it is **not legal advice**. "Non-refundable" interacts with Stripe's dispute rules and Georgia consumer law. |
| 2 | **Run the migration** `supabase/migrations/20260709_cohort_applications.sql`. | Without the table, every checkout 500s. |
| 3 | **Set the env vars** (below) in Vercel. | Missing `STRIPE_SECRET_KEY` → checkout returns "Payments are not configured yet." |
| 4 | **Test the whole flow in Stripe test mode** with card `4242 4242 4242 4242`. | Confirm: row inserted `pending` → payment → row flips to `paid` → "You're in." screen. |
| 5 | **Roll the Stripe secret key and the webhook signing secret.** | Both were pasted into a chat transcript and must be treated as public. See `STRIPE-SETUP.md`. |
| 6 | **Point DNS** for `cohorts.aimakersgeneration.com` at Vercel and add it as a domain on this project. | The host-based rewrite in `vercel.json` only fires on a real request to that host — it cannot be tested locally. |
| 7 | **Write the two founder bios.** They currently say *"Bio to come."* | `index.html`, search `TODO(AIMG)`. |

---

## Environment variables

Set in Vercel → Settings → Environment Variables.

| Var | Used by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/chat.js` | Already set. |
| `SUPABASE_SERVICE_ROLE_KEY` | all `api/*` | **Bypasses RLS. Server only. Never expose to the browser.** |
| `SUPABASE_ANON_KEY` | `api/chat.js` | **New, required.** Used to *verify* member access tokens. Without it, nobody can use the bot's tools. |
| `SUPABASE_URL` | all `api/*` | Optional; falls back to the hardcoded project URL. |
| `STRIPE_SECRET_KEY` | `api/create-checkout-session.js`, `api/confirm-payment.js`, `api/webhooks/stripe.js` | **New, required.** Use the test key first. |
| `STRIPE_WEBHOOK_SECRET` | `api/webhooks/stripe.js` | **New, required.** The `whsec_…` signing secret for the `cohorts-aimakersgeneration` destination. See `STRIPE-SETUP.md`. |
| `ADMIN_USER_IDS` | `api/chat.js` | Optional, comma-separated profile UUIDs. Restricts calendar edits to admins. **If unset, any signed-in member can create/delete events** — the old behavior. |

---

## Security: what changed and why

`api/chat.js` used to take the caller's identity **from the request body**:

```js
const { messages, user_id } = req.body;    // attacker-controlled
const toolsForRequest = user_id ? TOOLS : [];
```

It then executed those tools with the **service-role key**, which bypasses Row-Level Security. Anyone
who POSTed `user_id: "<any-uuid>"` got `delete_event`, `delete_post`, `delete_resource`, and
`update_profile` — and since `profiles` is publicly readable, real member UUIDs were easy to find.
`vercel.json` also sent `Access-Control-Allow-Origin: *`, so it worked from any website.

Now:

- Identity comes **only** from a verified Supabase JWT (`Authorization: Bearer <access_token>` →
  `supabase.auth.getUser(token)`). The body is never trusted.
- Write tools re-check that a user is signed in, even though anonymous callers get no tools.
- Calendar writes are admin-only, matching `migration.sql`'s `"Only admins can manage events."`
- Post edits and deletes are scoped to `author_id` unless you're an admin.
- The CORS wildcard is gone. The frontend calls `/api/*` same-origin; it never needed CORS.

**If you deployed the old `api/chat.js`, assume the database was writable by anyone** for as long as it
was live. Audit `events`, `posts`, `resources`, and `profiles` for unexpected changes.

---

## The payment flow

Payment **is** enrollment — there's no acceptance step (`BRAND-CORE.md`, updated 2026-07-09).

```
apply.html  ──POST──▶  /api/create-checkout-session
                         ├─ validates every field + all 7 acknowledgements
                         ├─ checks the 20-seat cap BEFORE charging  ← returns 409 if full
                         ├─ inserts cohort_applications row (status: pending)
                         └─ returns a Stripe Checkout URL
                              │
                        Stripe Checkout ($800, server-set price)
                              │
        success ──▶ /?session_id=…  ──POST──▶ /api/confirm-payment
                                                 ├─ re-fetches the session FROM STRIPE
                                                 ├─ trusts only Stripe's payment_status
                                                 └─ flips the row to paid
        cancel  ──▶ /?canceled=1   (nothing charged, nothing held)
```

**The browser never sends a price.** `TUITION_CENTS` lives in `api/create-checkout-session.js`.

**Seat cap.** `seatsTaken()` counts `paid` rows plus `pending` rows started in the last 30 minutes, so
two people can't both take seat 20 while Stripe is processing. Tune `PENDING_HOLD_MINUTES` there.

### The webhook

`api/webhooks/stripe.js` is the safety net. `confirm-payment` only runs when the buyer lands back on
the site; if they close the tab, Stripe still took the money. The webhook listens for
`checkout.session.completed` (signature-verified) and flips the row regardless. It also handles
`charge.refunded`. Both paths only ever move `pending → paid`, so replays are no-ops.

It reads the **raw** request body (`export const config = { api: { bodyParser: false } }`) because
Stripe signature verification requires the exact bytes. If you ever see "signature verification
failed" on a legitimate event, that's the first thing to check.

Endpoint: `https://cohorts.aimakersgeneration.com/api/webhooks/stripe`. Full details in `STRIPE-SETUP.md`.

### Reading enrollments

`cohort_applications` has RLS on with **no policies** — deliberately. Only the service role can read it.
Use the Supabase dashboard, or:

```sql
select count(*) from cohort_applications where cohort='summer-2026' and status='paid';
```

That number is the only honest thing to put in `{{SEATS_LEFT}}`.

---

## Local development

⚠️ **This repo sits in a folder whose path contains colons** (`Film bar:aimg:cohorts`). `:` is the PATH
separator, so `npm run dev` fails with `vite: command not found`. Either move the repo somewhere sane,
or call the binary directly:

```sh
./node_modules/.bin/vite          # dev server
./node_modules/.bin/vite build    # production build
```

`vercel dev` is the only way to exercise `/api/*` and the host-based rewrites locally.

Note that in plain `vite dev` the public pages are at `/index.html` and `/apply.html`; the `cleanUrls`
and subdomain routing only exist on Vercel.

---

## Where the content comes from

Everything factual — dates, times, prices, compliance rules, voice — is governed by
`../SOCIAL-CAMPAIGN-2026/00-FOUNDATION/BRAND-CORE.md`. **If a fact here and a fact there disagree,
BRAND-CORE wins**, and you should fix this repo. Two rules that carry real risk:

- **Workshops:** never write *"$15 minimum," "entry," "admission," "cover,"* or *"ticket."* ATDC is a
  nonprofit venue. Always *"Free to attend. Donations welcome, never required."*
- **Cohorts:** never publish a phone number or a payment handle, and never promise a job, a placement,
  an interview, or a salary. The cohort *prepares* people.

The AI Maker Bot's system prompt in `api/chat.js` encodes both. It also tells the bot to be
opinionated and "not politically correct" — that is a deliberate choice, but it sits oddly beside
`BRAND-CORE.md`'s stated voice (*"professional, inspiring, welcoming… confident, never arrogant"*).
Worth a look before the bot talks to prospective students.
