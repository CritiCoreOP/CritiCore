import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * supabase-js meldet bei jedem 4xx/5xx nur "Edge Function returned a non-2xx status code".
 * Die eigentliche Ursache steht im JSON-Body der Function ({ error: "…" }).
 */
export async function edgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      const message = body?.error ?? body?.message;
      if (typeof message === "string" && message.trim()) return message;
    } catch {
      // Keine JSON-Antwort, z. B. vom Gateway
    }
    return fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
