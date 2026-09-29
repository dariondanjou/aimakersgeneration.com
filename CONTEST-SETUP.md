# 30-second ad contest (/contest) — setup

Films go straight from the entrant's browser into **Vercel Blob**, under
`contest/oct-2026-film-ad/`. Each file is named
`YYYY-MM-DD-HHMMSS_FirstNameLastName_<their file name>` (Eastern time), plus a random
suffix that Blob adds so film links can't be guessed.

Every film is recorded in Supabase (`contest_submissions`, with its Blob URL). The
`contest_entries` view joins each film to the entrant's name, email, WhatsApp number and
LinkedIn. Admins signed in on `/contest` get a **Submissions** tab
(`/contest#submissions`) listing every film with a player, those details, the time it
arrived and a download button. Nobody else sees the tab or the film links.

## 1. Apply the migrations

```sh
npx supabase db push --linked
```

This applies `20260929140000_film_contest.sql` and then `20260929170000_contest_blob.sql`,
which swaps the old Drive columns for `file_url` / `file_pathname`.

## 2. Create the Blob store (one time)

1. **Vercel** → the aimakersgeneration.com project → **Storage** → **Create Database** →
   **Blob**.
2. Choose **Public** access. The upload code uses public blobs; film URLs are unguessable
   and only shown to admins and the person who uploaded them.
3. **Connect** it to the project for **Production** (and Preview if you want to test there).
   Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
4. **Redeploy** (Deployments → ⋯ → Redeploy) so the functions pick up the token.

Until the token exists, uploads fail with "Submissions aren't open yet". Nothing else breaks.

Optional: `CONTEST_DEADLINE` (an ISO time) overrides the default deadline,
`2026-10-02T02:00:00Z` = Thu Oct 1, 10:00 PM ET.

## 3. Test it

Sign in on `/contest`, save your details, and upload a short clip. It should show
"✓ Submitted". Then open the **Submissions** tab and check that the clip plays and
downloads. Delete test films in Vercel → Storage → your Blob store, and their rows in
Supabase (`contest_submissions`).

## How it works

- `POST /api/contest-upload {action:"start"}` checks four things: you're signed in,
  registered, the deadline hasn't passed, and the file is a video under 5 GB (max 20 films
  per person). It then reserves the Blob pathname, records an `uploading` row, and returns
  `{submissionId, pathname}`.
- The browser calls `upload()` from `@vercel/blob/client`, which uses multipart for files
  over 50 MB. Its token request comes back to the same endpoint with the entrant's Bearer
  token. The server only signs a token for that entrant's own pending row and the exact
  pathname it reserved: `video/*` only, 5 GB max, valid for up to 6 hours. The file goes
  straight to Blob, so there's no Vercel body-size limit.
- `POST /api/contest-upload {action:"finish"}` asks Blob (`head`) to confirm the file exists
  under the reserved pathname, then marks the row `received` with its URL and size.
  Uploads that started before the deadline may finish up to 2 hours after it.

## Notes

- **Cost.** Blob bills for storage and data transfer. A few dozen 30-second films is small,
  but admins streaming them repeatedly counts as transfer.
- **The brand kit is only gated in the UI.** The download links only appear once signed in,
  but the files (`public/contest/…`) are ordinary public URLs. That's fine for a logo pack.
- **Entry is free.** No payment is involved anywhere in the contest.
- **The homepage banner** (`#contest-cta` in `index.html`) removes itself after
  Friday, Oct 2 (midnight ET). The `/contest` page stays up and shows "Submissions are closed"
  after the deadline.
