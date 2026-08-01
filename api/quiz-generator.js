import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// Quiz engine for /students/quiz-builder. Three actions:
//   generate   — Claude writes N multiple-choice questions on the selected
//                topics; saved as a draft quiz row.
//   regenerate — takes the draft plus per-question review tags (keep / update
//                with comment / replace) and produces the revised quiz.
//   publish    — assigns the next QUIZ # and flips status to published.
// All quizzes table writes go through here with the service role — the table
// is read-only to the browser.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question text" },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Exactly 4 answer choices, no letter prefixes",
          },
          correct: { type: "integer", description: "Index (0-3) of the correct option" },
          topic: { type: "string", description: "Which selected topic this question covers" },
          explanation: { type: "string", description: "1-2 sentence explanation of the correct answer, shown after the quiz" },
          option_notes: {
            type: "array",
            items: { type: "string" },
            description: "Exactly 4 short notes, one per option in order: for the correct option why it's right; for each wrong option why it's wrong (and what it actually refers to, when interesting). Max ~25 words each.",
          },
        },
        required: ["question", "options", "correct", "topic", "explanation", "option_notes"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

const SYSTEM = `You write multiple-choice quiz questions for AI MAKERS GENERATION, an Atlanta cohort of AI creatives and career-changers (beginner-to-intermediate; smart adults, not engineers).

Rules:
- Every question must be answerable from the topic descriptions provided (current AI industry news) plus common knowledge. Never invent facts beyond them.
- Exactly 4 options per question: one clearly correct, three plausible but wrong. No "all of the above" / "none of the above".
- Vary which position holds the correct answer roughly evenly across the quiz.
- Mix difficulty: ~1/3 easy recall, ~1/3 applied understanding, ~1/3 tricky distinctions.
- Keep questions punchy (under 40 words) and conversational, matching a live cohort vibe.
- Spread questions across the selected topics as evenly as the count allows; it's fine for a question to connect two topics.
- For every option write a short option_note: the correct one gets why it's right; each wrong one gets why it's wrong — ideally teaching what that distractor actually refers to. These appear as tooltips during post-quiz review, so make them genuinely informative.`;

function validateQuestions(qs, count) {
  if (!Array.isArray(qs)) throw new Error("Model returned no questions array");
  const cleaned = qs
    .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length === 4
      && Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3)
    .map((q) => ({
      question: String(q.question),
      options: q.options.map(String),
      correct: q.correct,
      topic: String(q.topic || ""),
      explanation: String(q.explanation || ""),
      option_notes: Array.isArray(q.option_notes) && q.option_notes.length === 4
        ? q.option_notes.map(String)
        : ["", "", "", ""],
    }));
  if (cleaned.length < count) throw new Error(`Model returned ${cleaned.length} valid questions, needed ${count}`);
  return cleaned.slice(0, count);
}

async function callClaude(client, userPrompt) {
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: QUIZ_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("Model declined the request");
  const textBlock = [...response.content].reverse().find((b) => b.type === "text");
  return JSON.parse(textBlock?.text || "{}").questions || [];
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { action } = req.body || {};

  try {
    // ── generate ─────────────────────────────────────────────────────────
    if (action === "generate") {
      const { topics, params } = req.body;
      if (!Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({ error: "Select at least one topic" });
      }
      const count = Math.min(50, Math.max(3, parseInt(params?.question_count, 10) || 20));

      const topicList = topics
        .map((t) => `- ${t.term}: ${t.description}`)
        .join("\n");
      const questions = validateQuestions(
        await callClaude(client, `Write exactly ${count} multiple-choice questions covering these topics:\n\n${topicList}`),
        count,
      );

      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({
          status: "draft",
          topics: topics.map((t) => t.term),
          params: {
            question_count: count,
            timed: !!params?.timed,
            time_per_question: Math.min(120, Math.max(15, parseInt(params?.time_per_question, 10) || 60)),
            allow_back: !!params?.allow_back,
            // With free navigation the only sane countdown is the whole quiz;
            // sequential quizzes count down per question.
            timer_mode: params?.allow_back ? "total" : "per_question",
          },
          questions,
        })
        .select("id, params, questions")
        .single();
      if (error) throw new Error(error.message);
      return res.json({ quiz_id: quiz.id, params: quiz.params, questions: quiz.questions });
    }

    // ── regenerate ───────────────────────────────────────────────────────
    if (action === "regenerate") {
      const { quiz_id, directives } = req.body;
      const { data: quiz, error: qErr } = await supabase
        .from("quizzes").select("*").eq("id", quiz_id).maybeSingle();
      if (qErr || !quiz) return res.status(404).json({ error: "Quiz not found" });
      if (quiz.status === "published") return res.status(400).json({ error: "Quiz is already published" });

      const dirs = Array.isArray(directives) ? directives : [];
      const tagFor = (i) => dirs.find((d) => d.index === i) || { tag: "keep" };
      const count = quiz.questions.length;

      const manifest = quiz.questions.map((q, i) => {
        const d = tagFor(i);
        const body = JSON.stringify(q);
        if (d.tag === "replace") return `Q${i + 1} [REPLACE with a completely new question — different angle or topic from the selected set]: ${body}`;
        if (d.tag === "update") return `Q${i + 1} [UPDATE — revise this question${d.comment ? ` per this instruction: "${d.comment}"` : " (improve clarity, difficulty, or distractors)"}]: ${body}`;
        return `Q${i + 1} [KEEP — return this question EXACTLY as-is, byte for byte]: ${body}`;
      }).join("\n");

      const topicList = (quiz.topics || []).join(", ");
      const questions = validateQuestions(
        await callClaude(client,
          `Revise this ${count}-question quiz. The selected topic set is: ${topicList}.\n\nFor each question follow its bracketed instruction — KEEP questions must be returned unchanged, UPDATE questions revised as instructed, REPLACE questions swapped for brand-new ones. Return exactly ${count} questions in the same order.\n\n${manifest}`),
        count,
      );

      const { error: upErr } = await supabase
        .from("quizzes").update({ questions }).eq("id", quiz_id);
      if (upErr) throw new Error(upErr.message);
      return res.json({ quiz_id, params: quiz.params, questions });
    }

    // ── publish ──────────────────────────────────────────────────────────
    if (action === "publish") {
      const { quiz_id, title } = req.body;
      const { data: quiz, error: qErr } = await supabase
        .from("quizzes").select("id, status, cohort").eq("id", quiz_id).maybeSingle();
      if (qErr || !quiz) return res.status(404).json({ error: "Quiz not found" });
      if (quiz.status === "published") return res.status(400).json({ error: "Already published" });

      const { data: maxRow } = await supabase
        .from("quizzes").select("quiz_number").eq("cohort", quiz.cohort)
        .not("quiz_number", "is", null)
        .order("quiz_number", { ascending: false }).limit(1).maybeSingle();
      const nextNumber = (maxRow?.quiz_number || 0) + 1;

      const { error: upErr } = await supabase
        .from("quizzes")
        .update({
          status: "published",
          quiz_number: nextNumber,
          title: title || `Quiz #${nextNumber}`,
          published_at: new Date().toISOString(),
        })
        .eq("id", quiz_id);
      if (upErr) throw new Error(upErr.message);
      return res.json({ quiz_id, quiz_number: nextNumber });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("quiz-generator error:", err);
    return res.status(500).json({ error: err.message || "Quiz generation failed" });
  }
}
