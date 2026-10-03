// Render the welcome email for testing (and, later, for sending).
//
// Usage:
//   node emails/render.mjs                      → writes emails/preview.html with sample data
//   node emails/render.mjs "Liana" liana        → render for one student (name, slug)
//   node emails/render.mjs --film [name slug]   → the October film cohort welcome
//                                                 (film-welcome-email.html)
//
// Placeholders in both templates:
//   {{FIRST_NAME}}   the student's first name
//   {{PROFILE_URL}}  absolute URL to /students/<slug>
//
// The base URL defaults to production; override with PROFILE_BASE_URL.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PROFILE_BASE_URL || "https://aimakersgeneration.com";

export function renderWelcomeEmail({ firstName, slug, file = "welcome-email.html" }) {
  const template = readFileSync(join(__dirname, file), "utf8");
  const profileUrl = `${BASE_URL}/students/${encodeURIComponent(slug)}`;
  return template
    .replaceAll("{{FIRST_NAME}}", escapeHtml(firstName))
    .replaceAll("{{PROFILE_URL}}", profileUrl);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Run directly → write a preview file.
if (process.argv[1] && process.argv[1].endsWith("render.mjs")) {
  const film = process.argv.includes("--film");
  const args = process.argv.slice(2).filter((a) => a !== "--film");
  const firstName = args[0] || "Liana";
  const slug = args[1] || "liana";
  const html = renderWelcomeEmail({ firstName, slug, file: film ? "film-welcome-email.html" : "welcome-email.html" });
  const out = join(__dirname, "preview.html");
  writeFileSync(out, html, "utf8");
  console.log(`Rendered preview for "${firstName}" (/students/${slug}) → ${out}`);
  console.log(`Open it in a browser to test:  file://${out.replaceAll("\\", "/")}`);
}
