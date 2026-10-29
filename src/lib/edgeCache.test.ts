import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheKeyUrl, canonicalJson, isCachedFunction, ttlFor } from "./edgeCache";
import { isBot } from "./bot";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));

describe("edge cache rules", () => {
  it("only fronts the read-only functions", () => {
    expect(isCachedFunction("tmdb")).toBe(true);
    expect(isCachedFunction("api-status")).toBe(true);
    expect(isCachedFunction("delete-account")).toBe(false);
    expect(isCachedFunction("send-newsletter")).toBe(false);
  });

  it("keeps lists shorter than details", () => {
    expect(ttlFor("tmdb", { endpoint: "/trending/movie/week" })).toBe(3600);
    expect(ttlFor("tmdb", { endpoint: "/movie/popular" })).toBe(3600);
    expect(ttlFor("tmdb", { endpoint: "/search/movie" })).toBe(1800);
    expect(ttlFor("tmdb", { endpoint: "/movie/603" })).toBe(12 * 3600);
    expect(ttlFor("anilist", { op: "trending" })).toBe(3600);
    expect(ttlFor("anilist", { op: "detail" })).toBe(12 * 3600);
    expect(ttlFor("api-status", {})).toBe(120);
  });

  it("gives the same request the same key, whatever the key order", async () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } })).toBe('{"a":{"d":[1,{"x":1,"y":2}]},"b":1}');
    const one = await cacheKeyUrl("https://criticore.cc", "tmdb", { endpoint: "/movie/603", language: "de-DE" });
    const two = await cacheKeyUrl("https://criticore.cc", "tmdb", { language: "de-DE", endpoint: "/movie/603" });
    const other = await cacheKeyUrl("https://criticore.cc", "tmdb", { endpoint: "/movie/603", language: "en-US" });
    expect(one).toBe(two);
    expect(one).not.toBe(other);
    expect(one).toMatch(/^https:\/\/criticore\.cc\/__fn-cache\/tmdb\/[0-9a-f]{64}$/);
  });
});

describe("callEdge", () => {
  beforeEach(async () => {
    invoke.mockReset();
    (await import("./edgeCall")).clearEdgeMemory();
  });

  it("asks once for the same question and remembers the answer", async () => {
    const { callEdge } = await import("./edgeCall");
    invoke.mockResolvedValue({ data: { results: [1] }, error: null });
    const [a, b] = await Promise.all([callEdge("tmdb", { endpoint: "/movie/1" }), callEdge("tmdb", { endpoint: "/movie/1" })]);
    const c = await callEdge("tmdb", { endpoint: "/movie/1" });
    expect(a).toEqual({ results: [1] });
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("forgets failures, so the next try asks again", async () => {
    const { callEdge } = await import("./edgeCall");
    invoke.mockResolvedValueOnce({ data: null, error: { message: "boom", context: { status: 503 } } });
    await expect(callEdge("igdb", { endpoint: "/games" })).rejects.toMatchObject({ status: 503 });
    invoke.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });
    await expect(callEdge("igdb", { endpoint: "/games" })).resolves.toEqual([{ id: 1 }]);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

describe("isBot", () => {
  it("knows the crawlers that render pages", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0)")).toBe(true);
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe(false);
  });
});

describe("/api/fn for crawlers", () => {
  const call = async (userAgent: string) => {
    const seen: Record<string, string>[] = [];
    const fetchStub = vi.fn(async (_url: string, init: RequestInit) => {
      seen.push(init.headers as Record<string, string>);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchStub);
    const { onRequestPost } = await import("../../functions/api/fn/[name]");
    const request = new Request("https://criticore.cc/api/fn/tmdb", { method: "POST", headers: { "User-Agent": userAgent }, body: JSON.stringify({ endpoint: "/movie/1" }) });
    const res = await onRequestPost({ request, env: { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" }, params: { name: "tmdb" }, waitUntil: () => undefined });
    vi.unstubAllGlobals();
    return { res, headers: seen[0] };
  };

  it("marks crawler requests so the function does not fill api_cache", async () => {
    const bot = await call("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
    expect(bot.res.status).toBe(200);
    expect(bot.headers["x-cc-crawler"]).toBe("1");
    const person = await call("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36");
    expect(person.headers["x-cc-crawler"]).toBeUndefined();
  });
});
