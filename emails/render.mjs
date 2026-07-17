// Render the welcome email for testing (and, later, for sending).
//
// Usage:
//   node emails/render.mjs                      → writes emails/preview.html with sample data
//   node emails/render.mjs "Liana" liana        → render for one student (name, slug)
//
// Placeholders in welcome-email.html:
//   {{FIRST_NAME}}   the student's first name
//   {{PROFILE_URL}}  absolute URL to /students/<slug>
//
// The base URL defaults to production; override with PROFILE_BASE_URL.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PROFILE_BASE_URL || "https://aimakersgeneration.com";

export function renderWelcomeEmail({ firstName, slug }) {
  const template = readFileSync(join(__dirname, "welcome-email.html"), "utf8");
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
  const firstName = process.argv[2] || "Liana";
  const slug = process.argv[3] || "liana";
  const html = renderWelcomeEmail({ firstName, slug });
  const out = join(__dirname, "preview.html");
  writeFileSync(out, html, "utf8");
  console.log(`Rendered preview for "${firstName}" (/students/${slug}) → ${out}`);
  console.log(`Open it in a browser to test:  file://${out.replaceAll("\\", "/")}`);
}
