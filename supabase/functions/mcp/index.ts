// supabase function: mcp
// MCP-Server für CritiCore (Streamable HTTP, zustandslos) mit dem offiziellen MCP-SDK.
// Auth: Bearer-Token vom Supabase-OAuth-Server, der Consent-Screen liegt unter /oauth/consent.
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.30.1/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.30.1/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "npm:@modelcontextprotocol/sdk@1.30.1/server/auth/types.js";
import { createClient } from "npm:@supabase/supabase-js@^2.95.3";
import { z } from "npm:zod@^3.25.76";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const RESOURCE = `${SUPABASE_URL}/functions/v1/mcp`;
const RESOURCE_METADATA_URL = `${RESOURCE}/.well-known/oauth-protected-resource`;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id, x-client-info, apikey",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version, www-authenticate",
};

// Die Tools lesen nur öffentliche Daten, deshalb reicht der anon-Client (RLS greift wie im Frontend).
const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function result(key: string, data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: { [key]: data },
  };
}

function toolError(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function buildServer() {
  const server = new McpServer(
    { name: "criticore-mcp", title: "CritiCore MCP", version: "0.1.0" },
    {
      instructions:
        "Tools for CritiCore, a media (games, movies, series) review and news platform. Use `search_articles` to find published articles and news, `get_article` to read the full content of one article by slug, `list_categories` to browse content categories, and `list_latest_articles` to get the most recent articles filtered by language and/or category.",
    },
  );

  const readOnly = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

  server.registerTool(
    "search_articles",
    {
      title: "Search articles",
      description:
        "Search published CritiCore articles and news by keyword. Returns matching titles, excerpts, category, and slugs.",
      inputSchema: {
        query: z.string().trim().min(1).describe("Keyword(s) to search in article titles and excerpts."),
        limit: z.number().int().min(1).max(25).optional().describe("Max results to return (default 10)."),
      },
      annotations: readOnly,
    },
    async ({ query, limit }) => {
      // Zeichen entfernen, die die PostgREST-Filtersyntax von .or() aufbrechen würden
      const safe = query.replace(/[,()\\]/g, " ");
      const { data, error } = await supabase
        .from("articles")
        .select("title, slug, excerpt, category, article_type, language, created_at")
        .eq("published", true)
        .or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`)
        .order("created_at", { ascending: false })
        .limit(limit ?? 10);
      if (error) return toolError(`Error: ${error.message}`);
      return result("articles", data ?? []);
    },
  );

  server.registerTool(
    "get_article",
    {
      title: "Get article",
      description: "Fetch the full content of a single published CritiCore article by its slug.",
      inputSchema: {
        slug: z.string().trim().min(1).describe("The article slug, e.g. from a search result."),
      },
      annotations: readOnly,
    },
    async ({ slug }) => {
      const { data, error } = await supabase
        .from("articles")
        .select("title, slug, excerpt, content, category, article_type, language, created_at, updated_at")
        .eq("published", true)
        .eq("slug", slug)
        .maybeSingle();
      if (error) return toolError(`Error: ${error.message}`);
      if (!data) return toolError(`No published article found for slug "${slug}".`);
      return result("article", data);
    },
  );

  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description: "List the available CritiCore content categories with their slugs and descriptions.",
      inputSchema: {},
      annotations: readOnly,
    },
    async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name, slug, description, parent_id, sort_order")
        .order("sort_order", { ascending: true });
      if (error) return toolError(`Error: ${error.message}`);
      return result("categories", data ?? []);
    },
  );

  server.registerTool(
    "list_latest_articles",
    {
      title: "List latest articles",
      description:
        "List the most recently published CritiCore articles, optionally filtered by language and/or category.",
      inputSchema: {
        language: z.string().optional().describe("ISO language code to filter by, e.g. 'de', 'en'."),
        category: z.string().optional().describe("Category slug to filter by, e.g. 'news', 'reviews'."),
        limit: z.number().int().min(1).max(25).optional().describe("Max results to return (default 10)."),
      },
      annotations: readOnly,
    },
    async ({ language, category, limit }) => {
      let query = supabase
        .from("articles")
        .select("title, slug, excerpt, category, article_type, language, created_at, updated_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(limit ?? 10);
      if (language) query = query.eq("language", language);
      if (category) query = query.eq("category", category);
      const { data, error } = await query;
      if (error) return toolError(`Error: ${error.message}`);
      return result("articles", data ?? []);
    },
  );

  return server;
}

function unauthorized(error?: "invalid_token") {
  const challenge = `Bearer resource_metadata="${RESOURCE_METADATA_URL}"` + (error ? `, error="${error}"` : "");
  return Response.json(
    { error: error ?? "unauthorized" },
    { status: 401, headers: { ...corsHeaders, "WWW-Authenticate": challenge } },
  );
}

// Prüft das Access-Token vom Supabase-OAuth-Server (Signatur, Ablauf, Issuer, Audience).
async function authenticate(req: Request): Promise<AuthInfo | Response> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return unauthorized();

  // getClaims wirft bei kaputten Tokens, statt einen Fehler zurückzugeben
  const claims = await supabase.auth.getClaims(token).then(({ data }) => data?.claims, () => undefined);
  if (!claims || claims.iss !== ISSUER || ![claims.aud].flat().includes("authenticated")) {
    return unauthorized("invalid_token");
  }

  return {
    token,
    clientId: claims.client_id ?? "",
    scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
    expiresAt: claims.exp,
    extra: { userId: claims.sub },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // OAuth Protected Resource Metadata (RFC 9728): sagt dem Client, wo er sich anmelden muss
  if (new URL(req.url).pathname.endsWith("/.well-known/oauth-protected-resource")) {
    return Response.json(
      {
        resource: RESOURCE,
        authorization_servers: [ISSUER],
        bearer_methods_supported: ["header"],
        resource_name: "CritiCore MCP",
      },
      { headers: corsHeaders },
    );
  }

  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  // Zustandslos: kein GET-SSE-Stream und keine Session, die per DELETE beendet werden müsste
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { ...corsHeaders, Allow: "POST, OPTIONS" } });
  }

  // Pro Request eigener Server und Transport, damit sich parallele Requests nicht in die Quere kommen
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const res = await transport.handleRequest(req, { authInfo: auth });

  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  return new Response(res.body, { status: res.status, headers });
});
