import { getVerifiedUser, serviceClient } from "./_lib/admin-auth.js";

/**
 * Film submissions for the AIMG 30-second ad contest (/contest).
 *
 * Films are far bigger than a serverless request body (~4.5MB on Vercel), so
 * the browser uploads straight to Google Drive:
 *
 *   1. POST { action: "start", filename, size, mimeType }
 *      We check the caller is signed in, registered, and before the deadline,
 *      open a Drive *resumable upload session* in the submissions folder with
 *      the file already named, record a pending row, and return the session URL.
 *   2. The browser PUTs the file to that URL (Drive allows CORS for the origin
 *      we opened the session with) and gets the new Drive file id back.
 *   3. POST { action: "finish", submissionId, fileId }
 *      We confirm with Drive that the file landed in the folder under the name
 *      we chose, then store its id and link on the row.
 *
 * Drive file names: YYYY-MM-DD-HHMMSS_FirstNameLastName_<their file name>
 * (Eastern time, the contest's clock).
 *
 * Google access is a Drive OAuth refresh token for an account that can add
 * files to the folder (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
 * GOOGLE_REFRESH_TOKEN) — see CONTEST-SETUP.md.
 */

const CONTEST = "oct-2026-film-ad";
const FOLDER_ID = process.env.CONTEST_DRIVE_FOLDER_ID || "1zxLcx9nKoVt_0fQs23uZ5tp07wE4K2uN";
// Thursday, October 1, 2026, 10:00 PM EDT.
const DEADLINE = new Date(process.env.CONTEST_DEADLINE || "2026-10-02T02:00:00Z");
// An upload that STARTED before the deadline may finish a little after it.
const FINISH_GRACE_MS = 2 * 60 * 60 * 1000;
const MAX_BYTES = 5 * 1024 ** 3;          // 5 GB
const MAX_FILMS_PER_PERSON = 20;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|mpe?g|wmv|mts|m2ts|3gp)$/i;

// Drive only answers the browser's upload PUT (CORS) for the origin the
// session was opened with, so that origin must be one of ours.
const ALLOWED_ORIGIN = /^(https:\/\/((www|cohorts)\.)?aimakersgeneration\.com|https:\/\/[a-z0-9-]+\.vercel\.app|http:\/\/localhost(:\d+)?)$/;

async function driveAccessToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error("contest-upload: Google token refresh failed:", res.status, data.error);
    return null;
  }
  return data.access_token;
}

// 2026-10-01-214530 in Eastern time.
function stamp(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

const namePart = (s) => (s || "").normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "");

function cleanFilename(name) {
  let n = String(name || "").normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim();
  if (n.length > 150) {
    const ext = (n.match(/\.[A-Za-z0-9]{1,5}$/) || [""])[0];
    n = n.slice(0, 150 - ext.length) + ext;
  }
  return n || "film";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getVerifiedUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to your AIMG account to submit." });

  const supabase = serviceClient();
  const { action } = req.body || {};

  try {
    // ── start ──────────────────────────────────────────────────────────────
    if (action === "start") {
      if (Date.now() > DEADLINE.getTime()) {
        return res.status(403).json({ error: "Submissions are closed — the deadline was Thursday at 10 PM ET." });
      }
      const { filename, size, mimeType } = req.body;
      const bytes = Number(size);
      const type = typeof mimeType === "string" ? mimeType.slice(0, 100) : "";
      if (typeof filename !== "string" || !filename.trim()) return res.status(400).json({ error: "Choose a video file." });
      if (!(type.startsWith("video/") || VIDEO_EXT.test(filename))) {
        return res.status(400).json({ error: "That doesn't look like a video file. Upload an MP4, MOV, or similar." });
      }
      if (!Number.isFinite(bytes) || bytes <= 0) return res.status(400).json({ error: "That file is empty." });
      if (bytes > MAX_BYTES) return res.status(400).json({ error: "That file is over 5 GB. Export a smaller version and try again." });

      const origin = req.headers.origin || "";
      if (!ALLOWED_ORIGIN.test(origin)) return res.status(400).json({ error: "Upload from aimakersgeneration.com/contest." });

      const { data: entrant, error: entrantErr } = await supabase
        .from("contest_entrants").select("first_name, last_name")
        .eq("contest", CONTEST).eq("user_id", user.id).maybeSingle();
      if (entrantErr) throw new Error(entrantErr.message);
      if (!entrant) return res.status(403).json({ error: "Fill in your entrant details first." });

      const { count, error: countErr } = await supabase
        .from("contest_submissions").select("id", { count: "exact", head: true })
        .eq("contest", CONTEST).eq("user_id", user.id).eq("status", "received");
      if (countErr) throw new Error(countErr.message);
      if ((count || 0) >= MAX_FILMS_PER_PERSON) {
        return res.status(400).json({ error: `You've already submitted ${MAX_FILMS_PER_PERSON} films — that's the limit.` });
      }

      const token = await driveAccessToken();
      if (!token) return res.status(503).json({ error: "Submissions aren't open yet — please try again shortly." });

      const original = cleanFilename(filename);
      const person = namePart(entrant.first_name) + namePart(entrant.last_name) || "Entrant";
      const driveName = `${stamp(new Date())}_${person}_${original}`;
      const uploadType = type || "application/octet-stream";

      const init = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": uploadType,
            "X-Upload-Content-Length": String(bytes),
            Origin: origin,
          },
          body: JSON.stringify({ name: driveName, parents: [FOLDER_ID], mimeType: uploadType }),
        },
      );
      const uploadUrl = init.headers.get("location");
      if (!init.ok || !uploadUrl) {
        const detail = await init.text().catch(() => "");
        console.error("contest-upload: Drive session failed:", init.status, detail.slice(0, 500));
        return res.status(502).json({ error: "Couldn't start the upload. Please try again." });
      }

      const { data: row, error: insErr } = await supabase
        .from("contest_submissions")
        .insert({
          contest: CONTEST, user_id: user.id, original_filename: original, drive_name: driveName,
          mime_type: uploadType, size_bytes: bytes, status: "uploading",
        })
        .select("id").single();
      if (insErr) throw new Error(insErr.message);

      return res.status(200).json({ submissionId: row.id, uploadUrl, driveName });
    }

    // ── finish ─────────────────────────────────────────────────────────────
    if (action === "finish") {
      const { submissionId, fileId } = req.body;
      if (typeof submissionId !== "string" || typeof fileId !== "string" || !/^[\w-]{10,200}$/.test(fileId)) {
        return res.status(400).json({ error: "Missing upload details." });
      }
      const { data: row, error: rowErr } = await supabase
        .from("contest_submissions").select("id, drive_name, status, created_at")
        .eq("id", submissionId).eq("user_id", user.id).maybeSingle();
      if (rowErr) throw new Error(rowErr.message);
      if (!row) return res.status(404).json({ error: "We couldn't find that upload." });
      if (row.status === "received") return res.status(200).json({ ok: true });
      if (new Date(row.created_at).getTime() > DEADLINE.getTime() || Date.now() > DEADLINE.getTime() + FINISH_GRACE_MS) {
        return res.status(403).json({ error: "Submissions are closed." });
      }

      const token = await driveAccessToken();
      if (!token) return res.status(503).json({ error: "Couldn't confirm the upload. Please try again." });
      const meta = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,parents,size,webViewLink`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const file = await meta.json().catch(() => ({}));
      if (!meta.ok || file.name !== row.drive_name || !(file.parents || []).includes(FOLDER_ID)) {
        console.error("contest-upload: finish mismatch", meta.status, file.name, row.drive_name);
        return res.status(400).json({ error: "We couldn't confirm that upload. Please try again." });
      }

      const { error: updErr } = await supabase
        .from("contest_submissions")
        .update({
          status: "received",
          drive_file_id: file.id,
          drive_url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
          size_bytes: file.size ? Number(file.size) : undefined,
          received_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (updErr) throw new Error(updErr.message);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("contest-upload:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
