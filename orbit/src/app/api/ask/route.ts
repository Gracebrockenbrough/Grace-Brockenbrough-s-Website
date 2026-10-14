import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

/**
 * Orbit's AI on the website. Runs only when the server has ANTHROPIC_API_KEY;
 * otherwise GET reports { enabled: false } and the app uses its built-in answers.
 * The key never reaches the browser.
 */

export const runtime = "nodejs";

const MODEL = "claude-opus-5-5";
const MAX_PROMPT_CHARS = 60_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

export async function GET() {
  return Response.json({ enabled: !!process.env.ANTHROPIC_API_KEY });
}

/** With accounts turned on, only signed-in people can use the AI (it spends the site owner's key). */
async function signedIn(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return true;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await createClient(url, key).auth.getUser(token);
  return !error && !!data.user;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "AI is not set up on this server." }, { status: 501 });
  if (!(await signedIn(req))) return Response.json({ error: "Sign in to use Orbit's AI." }, { status: 401 });

  let body: { prompt?: unknown; image?: { data?: unknown; mediaType?: unknown } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, MAX_PROMPT_CHARS) : "";
  if (!prompt.trim()) return Response.json({ error: "Nothing to answer." }, { status: 400 });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (body.image && typeof body.image.data === "string") {
    const mediaType = IMAGE_TYPES.includes(body.image.mediaType as ImageType) ? (body.image.mediaType as ImageType) : "image/jpeg";
    if (body.image.data.length > 7_000_000) return Response.json({ error: "That image is too large. Try a smaller one." }, { status: 413 });
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: body.image.data } });
  }
  content.push({ type: "text", text: prompt });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Short, everyday answers: low effort keeps them quick.
      output_config: { effort: "low" },
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);

    if (response.stop_reason === "refusal") return Response.json({ error: "Orbit can't help with that one." }, { status: 422 });
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return Response.json({ error: "Orbit didn't have an answer." }, { status: 502 });
    return Response.json({ text });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return Response.json({ error: "Orbit is busy. Try again in a minute." }, { status: 429 });
    if (error instanceof Anthropic.AuthenticationError) return Response.json({ error: "The server's API key isn't valid." }, { status: 500 });
    if (error instanceof Anthropic.APIError) return Response.json({ error: "Orbit couldn't answer right now." }, { status: 502 });
    return Response.json({ error: "Orbit couldn't answer right now." }, { status: 500 });
  }
}
