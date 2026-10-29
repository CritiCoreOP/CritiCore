import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  const claims = data?.claims as { sub?: string; role?: string } | undefined;
  // Require a real signed-in user, not the anon/publishable key.
  if (error || !claims?.sub || claims.role !== "authenticated") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

const SYSTEM_PROMPT = "Du bist ein hilfreicher KI-Assistent. Antworte klar und präzise. Nutze Markdown für Formatierung.";

// Every model runs through the OpenAI-compatible gateway (OpenRouter by default).
// The client only picks one of these keys, never a model id.
const CHAT_MODELS: Record<string, string> = {
  claude: Deno.env.get("AI_CHAT_MODEL") ?? "anthropic/claude-sonnet-5",
  gemini: Deno.env.get("AI_MODEL") ?? "google/gemini-3-flash-preview",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

// Only plain user/assistant turns from the client; a "system" entry would override SYSTEM_PROMPT
function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));
}

async function tryGatewayAI(messages: ChatMessage[], system: string, apiKey: string, model: string): Promise<Response> {
  const response = await fetch((Deno.env.get("AI_GATEWAY_URL") ?? "https://openrouter.ai/api/v1/chat/completions"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: system },
        ...messages,
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es später erneut." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI-Guthaben aufgebraucht." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const t = await response.text();
    console.error("AI-Gateway error:", response.status, t);
    return new Response(
      JSON.stringify({ error: "AI-Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-AI-Provider": "gateway" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { messages, provider } = await req.json();
    // Use a fixed server-side system prompt; never trust a client-supplied prompt.
    const systemPrompt = SYSTEM_PROMPT;

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI-Gateway nicht konfiguriert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const model =
      typeof provider === "string" && Object.hasOwn(CHAT_MODELS, provider) ? CHAT_MODELS[provider] : CHAT_MODELS.claude;
    return await tryGatewayAI(sanitizeMessages(messages), systemPrompt, AI_API_KEY, model);
  } catch (e) {
    console.error("claude-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
