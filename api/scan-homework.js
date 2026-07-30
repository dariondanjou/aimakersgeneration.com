import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// Scans one homework submission for relevance to its assignment and records
// the verdict on the row. Runs with the service role because there is
// deliberately no client UPDATE policy on student_submissions — this endpoint
// is the only writer of scan_status, so students can't self-verify.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Request-size ceiling is 32MB; leave headroom for the rest of the payload.
const MAX_FETCH_BYTES = 18 * 1024 * 1024;
const MAX_TEXT_CHARS = 40000;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "csv", "json", "html", "htm", "css", "js", "jsx", "ts", "tsx",
  "py", "ipynb", "xml", "svg", "yaml", "yml", "toml",
]);

function extensionOf(nameOrUrl) {
  const clean = (nameOrUrl || "").split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1).toLowerCase();
}

// Fetch the submission and build the Claude content block that best represents
// it: image/PDF as native blocks, text-ish files (and web pages) as text, and
// anything else (video, zip, …) as metadata for the model to judge from.
async function buildSubmissionBlocks(sub) {
  const ext = extensionOf(sub.file_name || sub.url);
  let resp;
  try {
    resp = await fetch(sub.url, { redirect: "follow", signal: AbortSignal.timeout(20000) });
  } catch {
    return [{ type: "text", text: `The submission URL could not be fetched: ${sub.url}` }];
  }
  if (!resp.ok) {
    return [{ type: "text", text: `The submission URL returned HTTP ${resp.status}: ${sub.url}` }];
  }

  const contentType = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const declaredLength = parseInt(resp.headers.get("content-length") || "0", 10);
  if (declaredLength > MAX_FETCH_BYTES) {
    return [{
      type: "text",
      text: `The submission is a large file that could not be inspected. File name: "${sub.file_name || sub.url}", type: ${contentType || "unknown"}, size: ${declaredLength} bytes.`,
    }];
  }

  if (IMAGE_TYPES.has(contentType)) {
    const buf = Buffer.from(await resp.arrayBuffer());
    return [{
      type: "image",
      source: { type: "base64", media_type: contentType, data: buf.toString("base64") },
    }];
  }

  if (contentType === "application/pdf" || ext === "pdf") {
    const buf = Buffer.from(await resp.arrayBuffer());
    return [{
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") },
    }];
  }

  if (contentType.startsWith("text/") || contentType === "application/json" || TEXT_EXTENSIONS.has(ext)) {
    let text = await resp.text();
    if (contentType === "text/html" || ext === "html" || ext === "htm") {
      text = text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");
    }
    if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS) + "\n…[truncated]";
    return [{
      type: "text",
      text: `Submission content (file: "${sub.file_name || sub.url}"):\n\n${text}`,
    }];
  }

  // Video, archive, or anything else we can't put in front of the model.
  return [{
    type: "text",
    text: `The submission is a file whose content cannot be inspected here. File name: "${sub.file_name || sub.url}", content type: ${contentType || "unknown"}. Judge from the file name, type, and assignment context.`,
  }];
}

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    relevant: {
      type: "boolean",
      description: "true if this is a genuine attempt at the assignment; false if it is unrelated, empty, or a junk upload",
    },
    reason: {
      type: "string",
      description: "One short sentence a student would see explaining the verdict",
    },
  },
  required: ["relevant", "reason"],
  additionalProperties: false,
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { submission_id } = req.body || {};
  if (!submission_id) return res.status(400).json({ error: "submission_id is required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: sub, error: subErr } = await supabase
    .from("student_submissions")
    .select("id, url, file_name, assignment_id, assignments ( number, week_assigned, title, description )")
    .eq("id", submission_id)
    .maybeSingle();
  if (subErr) return res.status(500).json({ error: subErr.message });
  if (!sub) return res.status(404).json({ error: "Submission not found" });

  const assignment = sub.assignments;
  const writeResult = async (scan_status, scan_note) => {
    await supabase
      .from("student_submissions")
      .update({ scan_status, scan_note })
      .eq("id", sub.id);
    return res.json({ scan_status, scan_note });
  };

  try {
    const blocks = await buildSubmissionBlocks(sub);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: VERDICT_SCHEMA } },
      system: `You verify homework submissions for an 8-week AI makers cohort. Decide whether a student's upload is a genuine attempt at the week's assignment.

Be generous: this is an encouragement-driven cohort, not an exam. Accept anything that plausibly represents real work toward the assignment — drafts, screenshots of work, partial attempts, and creative interpretations all count. For media files whose content cannot be inspected (video, audio, archives), accept them when the file name or type plausibly fits the assignment.

If the assignment brief is still a placeholder ("Assignment brief coming soon…"), accept any genuine work-product.

Reject only clear non-attempts: empty or near-empty files, obviously unrelated content (e.g. a restaurant menu for a coding assignment), or junk/test uploads.

Write the reason as one friendly sentence addressed to the student.`,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Assignment: Homework ${assignment?.number ?? "?"} (Week ${assignment?.week_assigned ?? "?"}) — "${assignment?.title ?? "Unknown"}"\nBrief: ${assignment?.description || "(none)"}\n\nThe student's submission follows.`,
          },
          ...blocks,
        ],
      }],
    });

    if (response.stop_reason === "refusal") {
      return writeResult("error", "The automated check could not review this file. An instructor will look at it.");
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const verdict = JSON.parse(textBlock?.text || "{}");
    if (typeof verdict.relevant !== "boolean") throw new Error("Malformed verdict");

    return writeResult(verdict.relevant ? "relevant" : "off_topic", verdict.reason || null);
  } catch (err) {
    console.error("scan-homework error:", err);
    return writeResult("error", "The automated check hit an error — tap the retry icon to scan again.");
  }
}
