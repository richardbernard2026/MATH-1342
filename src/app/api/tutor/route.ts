import Groq from "groq-sdk";
import { getLesson } from "@/lib/data/lessons";
import { chapterRangeLabel, chapters } from "@/lib/data/chapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The AI tutor.
 *
 * Two design decisions worth knowing about:
 *
 * 1. SCOPED CONTEXT, NOT RETRIEVAL. When the student opens the tutor from
 *    inside a section, that section's actual lesson text is injected into the
 *    system prompt. One semester of one course is small enough to fit in
 *    context, so there is no embedding store and no chunk retrieval, and the
 *    tutor answers from the real course material rather than from memory.
 *
 * 2. SOCRATIC BY DEFAULT. The tutor asks a guiding question before handing over
 *    an answer. It only gives the full solution when the student is stuck or
 *    asks outright.
 *
 * The Groq key is read from the server environment and is never exposed to the
 * browser. Without it the route still returns 200 with a readable explanation
 * rather than an error, so the rest of the site keeps working.
 */

/**
 * What the course covers, built from the course data itself.
 *
 * Spelling the syllabus out by hand here meant the tutor was still told the
 * course stopped at Chapter 6 long after Chapters 7, 8 and 10 were added, so it
 * treated confidence intervals and hypothesis testing as out of scope.
 */
const COURSE_SCOPE = chapters.map((c) => `Chapter ${c.num}, ${c.title}: ${c.blurb}`).join("\n");

const BASE = `You are a patient, expert statistics tutor for a college student in MATH 1342 Elementary Statistical Methods. The course covers Chapters ${chapterRangeLabel()} (there is no Chapter 9):

${COURSE_SCOPE}

The student has said they get lost in how their professor presents this material, so:
- Explain in plain, everyday language with a concrete analogy BEFORE any formula.
- Walk through WHY a rule works, never just how to plug numbers in.
- Keep replies short: a few sentences or a tight worked example. Never a wall of text.
- Write math in LaTeX between single dollar signs, for example $z = \\frac{X - \\mu}{\\sigma}$. It renders properly on this site.
- This course uses the median-of-halves method for quartiles: $Q_1$ is the median of the lower half, $Q_3$ the median of the upper half.
- If a question falls outside the chapters listed above, help anyway but note it is beyond the current scope.`;

const SOCRATIC = `TEACHING STYLE: Socratic. Do not hand over the answer first. Respond to a question with one short guiding question that moves the student one step forward, plus at most a sentence of orientation. Wait for their reply before continuing.

Give the full worked answer only when: they explicitly ask for it, they say they are stuck or confused, or they have already attempted it twice. When you do give it, keep it brief and end by asking them to try the next similar case themselves.`;

const DIRECT = `TEACHING STYLE: Direct. Give a clear plain-English explanation followed by a short worked example with real numbers. Still lead with the intuition before the formula.`;

/** Grading mode for the "explain it back" feature. */
const EXPLAIN_BACK = `The student is explaining a concept back to you in their own words. This is a self-explanation exercise, so your job is assessment, not lecturing.

Reply in exactly this shape, and keep the whole thing under 150 words:
1. "What you got right:" then the specific correct ideas they expressed. Be genuinely specific, quoting their phrasing where you can. If very little is correct, say so kindly rather than inventing praise.
2. "What's missing or off:" then the gaps or errors, most important first. If something is simply wrong, say it is wrong and give the correction in one line.
3. "One thing to sharpen:" a single concrete suggestion.

Do not restate the whole concept back at them. Do not be effusive. Accuracy is kinder than encouragement here.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const sectionId: string | undefined = body?.sectionId;
    const mode: string = body?.mode === "direct" ? "direct" : body?.mode === "explain" ? "explain" : "socratic";

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        "The AI Tutor is not connected yet.\n\nAdd a GROQ_API_KEY environment variable in the Vercel project settings (Settings, then Environment Variables), then redeploy. You can get a free key at console.groq.com/keys.\n\nEverything else on this site works without it.",
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    // Build the system prompt: base rules, teaching style, then the scoped
    // course material for whichever section the student came from.
    let system = BASE + "\n\n" + (mode === "explain" ? EXPLAIN_BACK : mode === "direct" ? DIRECT : SOCRATIC);

    const lesson = sectionId ? getLesson(sectionId) : undefined;
    if (lesson) {
      system +=
        `\n\nThe student is currently studying section ${lesson.id}, "${lesson.title}". This is the exact course material for that section. Ground your answers in it, refer to it directly, and stay on this topic unless the student changes the subject:\n\n` +
        `CORE IDEA: ${lesson.idea}\n\n` +
        `FORMULAS:\n${lesson.formula}\n\n` +
        `BUILDS ON: ${lesson.buildsOn}\n` +
        `BUILDS TOWARD: ${lesson.buildsToward}`;
    }

    const groq = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        ...messages
          .filter((m: any) => m && typeof m.content === "string" && m.content.trim())
          .map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content).slice(0, 4000),
          })),
      ],
      stream: true,
      temperature: mode === "explain" ? 0.2 : 0.4,
      max_tokens: 900,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream as any) {
            const text = chunk?.choices?.[0]?.delta?.content || "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n[The connection dropped. Please try again.]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(
      "Something went wrong reaching the AI Tutor. Check that GROQ_API_KEY is set correctly in Vercel, then try again.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
