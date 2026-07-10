# Stripe — connection info

> ## 🔴 The secret key you pasted into chat is burned. Roll it.
>
> A `sk_live_…` key can charge cards and move money out of your account. Yours has now been
> pasted into a chat transcript, so it must be treated as public.
>
> **Do this first, before anything else:**
> 1. Stripe Dashboard → **Developers → API keys → Secret key → Roll key**.
> 2. Same for the webhook **signing secret**: Dashboard → **Webhooks → your endpoint → Roll secret**.
> 3. Put the new values **only** in Vercel env vars and a local `.env.local`. Never in a file that git tracks.
>
> **No secret is written in this document, on purpose.** If you find yourself pasting one in here,
> stop — it will end up on GitHub. This repo has a public remote.

---

## Non-secret values (safe to keep here)

| Field | Value |
|---|---|
| **Publishable key** | `pk_live_51T8T54E4inkXKp5V3FVUfvo4XHLdK09l12KGZJxSMt0DziIIuaWgoSnYtxD9nwU0NLguPJQHdBgEF9p6alVb2xKi00LWv7QQeb` |
| **Webhook endpoint** | `https://cohorts.aimakersgeneration.com/api/webhooks/stripe` |
| **Destination name** | `cohorts-aimakersgeneration` |
| **Destination ID** | `we_1TrQWeE4inkXKp5V8C24TiJL` |
| **API version** | `2026-02-25.clover` |
| **Status** | Active |

The publishable key is designed to be public — it's safe in this file and in client-side code.
We don't currently use it: checkout is created server-side and the buyer is redirected to Stripe's
hosted page, so no Stripe.js runs in the browser.

### Events this endpoint listens to

| Event | Handled? | Notes |
|---|---|---|
| `checkout.session.completed` | ✅ | The one that matters. Flips the enrollment to `paid`. |
| `invoice.paid` | — | Acknowledged, ignored. Applies to subscriptions, not a one-time cohort payment. |
| `invoice.payment_failed` | — | Acknowledged, ignored. Same reason. |
| `customer.subscription.updated` | — | Acknowledged, ignored. Same reason. |
| `customer.subscription.deleted` | — | Acknowledged, ignored. Same reason. |

You can safely remove the four subscription/invoice events from the destination — the cohort is a
single $800 payment, not a subscription. **Consider adding `charge.refunded`**: the handler already
supports it and will mark an enrollment `refunded`, which keeps the seat count honest.

---

## Where the secrets actually go

Three secrets, never in git:

| Env var | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys → Secret key (**roll it first**) |
| `STRIPE_WEBHOOK_SECRET` | Dashboard → Webhooks → `cohorts-aimakersgeneration` → Signing secret (**roll it first**) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |

### In production

```sh
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

Paste the value when prompted — it never touches a file. Then redeploy.

### Locally

Put them in `.env.local`, which `.gitignore` already excludes via `.env*.local`:

```
STRIPE_SECRET_KEY=sk_test_…      ← use a TEST key locally, never the live one
STRIPE_WEBHOOK_SECRET=whsec_…
SUPABASE_SERVICE_ROLE_KEY=…
SUPABASE_ANON_KEY=…
```

Run `vercel dev` — plain `vite` does not serve `/api/*`.

---

## Testing the webhook before you trust it

Use test-mode keys for all of this.

```sh
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the whsec_… it prints into .env.local, then in another terminal:
stripe trigger checkout.session.completed
```

Then run a real test checkout with card `4242 4242 4242 4242`, any future expiry, any CVC, and confirm:

1. A `cohort_applications` row appears with `status = 'pending'`.
2. After payment it flips to `status = 'paid'` with `paid_at` and `stripe_payment_intent_id` set.
3. The page shows **"You're in, <name>."**
4. Close the tab *before* the redirect completes and confirm the webhook still flips the row. That's
   the whole reason the webhook exists.

---

## How money actually moves

The price is **not** sent by the browser. It lives in `api/create-checkout-session.js`:

```js
const TUITION_CENTS = 80000;  // $800.00
const TOTAL_SEATS = 20;
```

Server-side, in order: validate every field → check the 20-seat cap → insert a `pending` row →
create the Checkout Session. A full cohort returns HTTP 409 and **nothing is charged**.

Two independent paths mark an enrollment paid, and both re-check with Stripe rather than trusting
the browser:

- `api/confirm-payment.js` — when the buyer returns to the site, it re-fetches the session from
  Stripe and reads `payment_status` from there. A forged `?session_id=` in the URL cannot fake it.
- `api/webhooks/stripe.js` — signature-verified, fires regardless of whether the buyer's browser
  came back.

Both only ever move `pending → paid`, so a replayed event is a no-op.
