# 30-second ad contest (/contest) — setup

Films go straight from the entrant's browser into the Google Drive submissions folder:
https://drive.google.com/drive/folders/1zxLcx9nKoVt_0fQs23uZ5tp07wE4K2uN

Each file is named `YYYY-MM-DD-HHMMSS_FirstNameLastName_<their file name>` (Eastern time).
Every film is also recorded in Supabase (`contest_submissions`, with its Drive link), and
the `contest_entries` view lists every film with the entrant's name, email, WhatsApp number,
LinkedIn and Drive link. Admins see the same table at the bottom of `/contest` when signed in.

## 1. Apply the migration

Run `supabase/migrations/20260929140000_film_contest.sql` in the Supabase SQL editor
(after `20260929130000_named_admins.sql`, which defines `public.is_admin()`).

Until it's applied, the page loads but tells signed-in visitors "registration opens shortly".

## 2. Give the server access to the Drive folder

The server uploads as a real Google account, using an OAuth refresh token. (A service
account won't work: it has no storage quota of its own, so it can't own files in a
My Drive folder.) Use an account that owns the folder or has **Editor** access to it,
for example the AIMG Google account.

1. **Google Cloud Console** → pick or create a project → *APIs & Services*:
   - *Library* → enable **Google Drive API**.
   - *OAuth consent screen* → External, app name "AIMG Contest", add your email.
     **Publish the app ("In production").** While it's in "Testing", refresh tokens
     expire after 7 days. No verification is needed for your own account; you'll just
     click through an "unverified app" warning once.
   - *Credentials* → *Create credentials* → *OAuth client ID* → **Web application**.
     Add the authorized redirect URI `https://developers.google.com/oauthplayground`.
     Copy the **Client ID** and **Client secret**.
2. **Get a refresh token.** Go to https://developers.google.com/oauthplayground:
   - Click ⚙️ (top right), tick **Use your own OAuth credentials**, and paste the client ID and secret.
   - In *Step 1*, enter the scope `https://www.googleapis.com/auth/drive` and click
     **Authorize APIs**. Sign in as the account with access to the folder.
   - In *Step 2*, click **Exchange authorization code for tokens** and copy the **Refresh token**.
3. **Vercel** → Project → Settings → Environment Variables (Production, plus Preview if you
   want to test there):

   | Name | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | from step 1 |
   | `GOOGLE_CLIENT_SECRET` | from step 1 |
   | `GOOGLE_REFRESH_TOKEN` | from step 2 |
   | `CONTEST_DRIVE_FOLDER_ID` | *(optional)* defaults to `1zxLcx9nKoVt_0fQs23uZ5tp07wE4K2uN` |
   | `CONTEST_DEADLINE` | *(optional)* ISO time; defaults to `2026-10-02T02:00:00Z` = Thu Oct 1, 10:00 PM ET |

   Redeploy so the functions pick them up.

Without these variables, uploads fail with "Submissions aren't open yet". Nothing breaks.

## 3. Test it

Sign in on `/contest`, save your details, and upload a short clip. It should show
"✓ Submitted", appear in the Drive folder under the dated name, and show up in the admin
table with a working Drive link.

## How it works

- `POST /api/contest-upload {action:"start"}` checks four things: you're signed in,
  registered, the deadline hasn't passed, and the file is a video under 5 GB (max 20 films
  per person). It then opens a Drive **resumable upload session** in the folder with the
  final file name, records an `uploading` row, and returns the session URL.
- The browser PUTs the file to that URL. This goes straight to Google, so there's no
  Vercel body-size limit.
- `POST /api/contest-upload {action:"finish"}` asks Drive to confirm the file is in the
  folder under the expected name, then marks the row `received` with the Drive id and link.
  Uploads that started before the deadline may finish up to 2 hours after it.

## Notes

- **The brand kit is only gated in the UI.** The download links only appear once signed in,
  but the files (`public/contest/…`) are ordinary public URLs. That's fine for a logo pack.
- **Entry is free.** No payment is involved anywhere in the contest.
- **The homepage banner** (`#contest-cta` in `index.html`) removes itself after
  Friday, Oct 2 (midnight ET). The `/contest` page stays up and shows "Submissions are closed"
  after the deadline.
