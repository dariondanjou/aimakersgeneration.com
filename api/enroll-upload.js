import { handleUpload } from "@vercel/blob/client";

/**
 * Previous-work uploads on the cohort enrollment page (apply.html).
 *
 * Enrollees don't have an account yet, so this only signs Vercel Blob client
 * upload tokens — nothing is written to the database here. The browser uploads
 * straight to Blob under enroll/<cohort>/, and the resulting URLs are sent with
 * the enrollment form; api/create-checkout-session.js re-checks each one with
 * Blob before saving it. Blob adds a random suffix, so URLs can't be guessed.
 *
 * Needs BLOB_READ_WRITE_TOKEN (see CONTEST-SETUP.md).
 */

export const COHORT = "winter-2027-jobs";
export const PREFIX = `enroll/${COHORT}/`;
// Same instant enrollment closes: Saturday, January 2, 2027, 1:00 PM EST (UTC-5).
export const DEADLINE_MS = Date.UTC(2027, 0, 2, 18, 0, 0);
export const MAX_BYTES = 500 * 1024 ** 2; // 500 MB per file
export const MAX_FILES = 10;
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/*",
  "video/*",
  "audio/*",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.apple.keynote",
  "application/vnd.apple.pages",
  "text/plain",
];

// enroll/winter-2027-jobs/<cleaned file name> — the browser cleans the name the same way.
const PATH_RE = new RegExp(`^${PREFIX.replace(/[/-]/g, "\\$&")}[A-Za-z0-9._-]{1,140}$`);

class UserError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  if (body.type !== "blob.generate-client-token") return res.status(400).json({ error: "Unsupported." });

  try {
    if (Date.now() >= DEADLINE_MS) throw new UserError(403, "Enrollment is closed.");
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new UserError(503, "Uploads aren't available right now — please share a link to your work instead.");
    }
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATH_RE.test(pathname)) throw new UserError(400, "That file name isn't allowed.");
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          validUntil: Math.min(Date.now() + TOKEN_TTL_MS, DEADLINE_MS),
        };
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof UserError) return res.status(err.status).json({ error: err.message });
    console.error("enroll-upload:", err);
    return res.status(500).json({ error: "The upload couldn't start. Please try again." });
  }
}
