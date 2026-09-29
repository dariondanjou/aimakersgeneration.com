import { handleUpload } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import { getVerifiedUser, serviceClient } from "./_lib/admin-auth.js";

/**
 * Film submissions for the AIMG 30-second ad contest (/contest).
 *
 * Films are far bigger than a serverless request body (~4.5MB on Vercel), so
 * the browser uploads straight to Vercel Blob:
 *
 *   1. POST { action: "start", filename, size, mimeType }
 *      We check the caller is signed in, registered, and before the deadline,
 *      reserve the file's Blob pathname, record an `uploading` row, and return
 *      { submissionId, pathname }.
 *   2. The browser calls upload() from @vercel/blob/client with that pathname
 *      and clientPayload = submissionId. Its token request comes back here
 *      (body type "blob.generate-client-token", with the caller's Bearer
 *      token); we only sign it for the caller's own pending row and the exact
 *      pathname we reserved. Blob adds a random suffix, so film URLs can't be
 *      guessed.
 *   3. POST { action: "finish", submissionId, url }
 *      We confirm with Blob that the file exists under the reserved pathname,
 *      then mark the row `received` with its URL.
 *
 * File names: YYYY-MM-DD-HHMMSS_FirstNameLastName_<their file name>
 * (Eastern time, the contest's clock).
 *
 * Needs BLOB_READ_WRITE_TOKEN, which Vercel adds when a Blob store is
 * connected to the project — see CONTEST-SETUP.md.
 */

const CONTEST = "oct-2026-film-ad";
const PREFIX = `contest/${CONTEST}/`;
// Thursday, October 1, 2026, 10:00 PM EDT.
const DEADLINE = new Date(process.env.CONTEST_DEADLINE || "2026-10-02T02:00:00Z");
// An upload that STARTED before the deadline may finish a little after it.
const FINISH_GRACE_MS = 2 * 60 * 60 * 1000;
// How long the browser's upload token stays valid (big files, slow Wi-Fi).
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_BYTES = 5 * 1024 ** 3;          // 5 GB
const MAX_FILMS_PER_PERSON = 20;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|mpe?g|wmv|mts|m2ts|3gp)$/i;

// Errors whose message is safe to show the entrant.
class UserError extends Error {
  constructor(status, message) { super(message); this.status = status; }
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

// Blob pathnames stay plain ASCII: "José García" → "JoseGarcia".
const ascii = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const namePart = (s) => ascii(s).replace(/[^A-Za-z0-9]/g, "");

function cleanFilename(name) {
  let n = ascii(name).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-{2,}/g, "-").replace(/^[-.]+|-+$/g, "");
  if (n.length > 120) {
    const ext = (n.match(/\.[A-Za-z0-9]{1,5}$/) || [""])[0];
    n = n.slice(0, 120 - ext.length) + ext;
  }
  return n || "film.mp4";
}

const extOf = (p) => (p.match(/\.[A-Za-z0-9]{1,5}$/) || [""])[0];

// Blob inserts "-<random>" before the extension: reserved "a/b.mp4" → "a/b-Xy12.mp4".
function matchesReserved(actual, reserved) {
  const ext = extOf(reserved);
  const base = reserved.slice(0, reserved.length - ext.length);
  return actual === reserved || (actual.startsWith(base + "-") && actual.endsWith(ext));
}

async function ownPendingRow(supabase, userId, submissionId) {
  if (typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
    throw new UserError(400, "Missing upload details.");
  }
  const { data: row, error } = await supabase
    .from("contest_submissions").select("id, file_pathname, status, created_at")
    .eq("id", submissionId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new UserError(404, "We couldn't find that upload.");
  if (row.status !== "received"
      && (new Date(row.created_at).getTime() > DEADLINE.getTime() || Date.now() > DEADLINE.getTime() + FINISH_GRACE_MS)) {
    throw new UserError(403, "Submissions are closed.");
  }
  return row;
}

async function start(supabase, user, body) {
  if (Date.now() > DEADLINE.getTime()) {
    throw new UserError(403, "Submissions are closed — the deadline was Thursday at 10 PM ET.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new UserError(503, "Submissions aren't open yet — please try again shortly.");
  }
  const { filename, size, mimeType } = body;
  const bytes = Number(size);
  const type = typeof mimeType === "string" ? mimeType.slice(0, 100) : "";
  if (typeof filename !== "string" || !filename.trim()) throw new UserError(400, "Choose a video file.");
  if (!(type.startsWith("video/") || VIDEO_EXT.test(filename))) {
    throw new UserError(400, "That doesn't look like a video file. Upload an MP4, MOV, or similar.");
  }
  if (!Number.isFinite(bytes) || bytes <= 0) throw new UserError(400, "That file is empty.");
  if (bytes > MAX_BYTES) throw new UserError(400, "That file is over 5 GB. Export a smaller version and try again.");

  const { data: entrant, error: entrantErr } = await supabase
    .from("contest_entrants").select("first_name, last_name")
    .eq("contest", CONTEST).eq("user_id", user.id).maybeSingle();
  if (entrantErr) throw new Error(entrantErr.message);
  if (!entrant) throw new UserError(403, "Fill in your entrant details first.");

  const { count, error: countErr } = await supabase
    .from("contest_submissions").select("id", { count: "exact", head: true })
    .eq("contest", CONTEST).eq("user_id", user.id).eq("status", "received");
  if (countErr) throw new Error(countErr.message);
  if ((count || 0) >= MAX_FILMS_PER_PERSON) {
    throw new UserError(400, `You've already submitted ${MAX_FILMS_PER_PERSON} films — that's the limit.`);
  }

  const person = namePart(entrant.first_name) + namePart(entrant.last_name) || "Entrant";
  const fileName = `${stamp(new Date())}_${person}_${cleanFilename(filename)}`;
  const pathname = PREFIX + fileName;

  const { data: row, error: insErr } = await supabase
    .from("contest_submissions")
    .insert({
      contest: CONTEST, user_id: user.id, original_filename: String(filename).slice(0, 300),
      file_name: fileName, file_pathname: pathname,
      mime_type: type || null, size_bytes: bytes, status: "uploading",
    })
    .select("id").single();
  if (insErr) throw new Error(insErr.message);
  return { submissionId: row.id, pathname };
}

async function finish(supabase, user, body) {
  const row = await ownPendingRow(supabase, user.id, body.submissionId);
  if (row.status === "received") return { ok: true };
  const { url } = body;
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(url)) {
    throw new UserError(400, "Missing upload details.");
  }
  let blob;
  try {
    blob = await head(url);
  } catch (err) {
    console.error("contest-upload: head failed:", err?.message);
    throw new UserError(400, "We couldn't confirm that upload. Please try again.");
  }
  if (!matchesReserved(blob.pathname, row.file_pathname)) {
    console.error("contest-upload: finish mismatch", blob.pathname, row.file_pathname);
    throw new UserError(400, "We couldn't confirm that upload. Please try again.");
  }
  const { error } = await supabase
    .from("contest_submissions")
    .update({
      status: "received",
      file_url: blob.url,
      file_pathname: blob.pathname,
      size_bytes: blob.size,
      mime_type: blob.contentType || undefined,
      received_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getVerifiedUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to your AIMG account to submit." });

  const supabase = serviceClient();
  const body = req.body || {};

  try {
    // ── upload token for the browser (from @vercel/blob/client upload()) ──
    if (typeof body.type === "string" && body.type.startsWith("blob.")) {
      if (body.type !== "blob.generate-client-token") return res.status(400).json({ error: "Unsupported." });
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const row = await ownPendingRow(supabase, user.id, clientPayload);
          if (row.status !== "uploading" || pathname !== row.file_pathname) {
            throw new UserError(400, "That upload doesn't match. Please try again.");
          }
          return {
            allowedContentTypes: ["video/*"],
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
            validUntil: Math.min(Date.now() + TOKEN_TTL_MS, DEADLINE.getTime() + FINISH_GRACE_MS),
          };
        },
      });
      return res.status(200).json(result);
    }

    if (body.action === "start") return res.status(200).json(await start(supabase, user, body));
    if (body.action === "finish") return res.status(200).json(await finish(supabase, user, body));
    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    if (err instanceof UserError) return res.status(err.status).json({ error: err.message });
    console.error("contest-upload:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
