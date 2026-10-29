import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Shared plumbing of the editor's AI functions (spellcheck, ai-editor-assist, improve-article,
 * analyze-article): CORS, sign-in check and one call to the OpenAI-compatible AI gateway.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** 401 response unless the request carries the token of a signed-in user */
export async function requireUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  const claims = data?.claims as { sub?: string; role?: string } | undefined;
  if (error || !claims?.sub || claims.role !== "authenticated") return json({ error: "Unauthorized" }, 401);
  return null;
}

export const LANG_NAMES: Record<string, string> = { de: "German", en: "English", fr: "French", es: "Spanish", th: "Thai" };
export const langName = (code: unknown, fallback = "German") => LANG_NAMES[String(code)] ?? fallback;

export const today = () => new Date().toISOString().slice(0, 10);

/**
 * Every prompt that reads or writes article text gets this. The model's knowledge is older than the
 * news it reads; on 2026-10-04 it called a current GTA report false and "corrected" it.
 */
export const FACTS_RULE =
  "FACTS: Your knowledge stops at some point in the past, and articles report on newer events (release dates, trailers, announcements, prices, casts). Never judge whether a statement is true and never change, add or \"correct\" facts, dates, names, titles or numbers from memory. Names of new games, films, series, characters and people you do not know are not mistakes.";

export class AIError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Status and message for the client; gateway problems keep their status, everything else is a 500 */
export function errorResponse(e: unknown, where: string) {
  if (e instanceof AIError) return json({ error: e.message }, e.status);
  console.error(`${where} error:`, e);
  return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
}

interface ChatOptions {
  system: string;
  user: string;
  /** Answer must be a JSON object */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/** Strips a Markdown code fence the model sometimes wraps its answer in */
export const stripFence = (s: string) => s.trim().replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?\s*```$/, "").trim();

/**
 * One chat completion. `truncated` means the answer hit the token limit: whatever came back is
 * incomplete and must not replace article text.
 */
export async function chat({ system, user, json: wantJson, temperature, maxTokens, model }: ChatOptions) {
  const key = Deno.env.get("AI_API_KEY");
  if (!key) throw new AIError("AI_API_KEY is not configured", 500);

  const res = await fetch(Deno.env.get("AI_GATEWAY_URL") ?? "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? Deno.env.get("AI_MODEL") ?? "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(wantJson ? { response_format: { type: "json_object" } } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new AIError("Rate limit erreicht. Bitte versuche es gleich noch einmal.", 429);
    if (res.status === 402) throw new AIError("KI-Guthaben aufgebraucht.", 402);
    const text = await res.text();
    console.error("AI gateway error:", res.status, text.slice(0, 500));
    let detail = "";
    try {
      detail = JSON.parse(text)?.error?.message ?? "";
    } catch {
      // not JSON
    }
    throw new AIError(`KI-Fehler (${res.status})${detail ? `: ${String(detail).slice(0, 200)}` : ""}`, 502);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: stripFence(String(choice?.message?.content ?? "")),
    truncated: choice?.finish_reason === "length",
  };
}

/** Parses a JSON object answer; tolerates text around it. Null if there is none. */
export function parseObject(content: string): Record<string, unknown> | null {
  for (const candidate of [content, content.match(/\{[\s\S]*\}/)?.[0]]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
