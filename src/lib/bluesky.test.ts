import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFacets, createBlueskyPost, graphemes, postWebUrl } from "../../supabase/functions/_shared/bluesky";

const slice = (text: string, f: { index: { byteStart: number; byteEnd: number } }) =>
  new TextDecoder().decode(new TextEncoder().encode(text).slice(f.index.byteStart, f.index.byteEnd));

afterEach(() => vi.unstubAllGlobals());

describe("Bluesky posts", () => {
  it("makes links and hashtags clickable by UTF-8 byte range", () => {
    const text = "Größer, härter, schöner: Silksong im Test 🎮 https://criticore.cc/de-DE/news/silksong. #Silksong #TeamCherry #2026";
    const facets = buildFacets(text);
    expect(facets.map((f) => slice(text, f))).toEqual(["https://criticore.cc/de-DE/news/silksong", "#Silksong", "#TeamCherry"]);
    expect(facets[0].features[0]).toEqual({ $type: "app.bsky.richtext.facet#link", uri: "https://criticore.cc/de-DE/news/silksong" });
    expect(facets[2].features[0]).toEqual({ $type: "app.bsky.richtext.facet#tag", tag: "TeamCherry" });
  });

  it("counts graphemes like Bluesky does", () => {
    expect(graphemes("🎮👨‍👩‍👧")).toBe(2);
    expect(graphemes("ที่")).toBe(1);
  });

  it("turns the record address into the web address", () => {
    expect(postWebUrl("at://did:plc:abc/app.bsky.feed.post/3kxyz", "criticore.cc")).toBe("https://bsky.app/profile/criticore.cc/post/3kxyz");
  });

  it("logs in, uploads the cover and posts with a link card", async () => {
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body });
        if (url.endsWith("createSession")) return Response.json({ accessJwt: "jwt", did: "did:plc:abc", handle: "criticore.cc" });
        if (url === "https://img/cover.jpg") return new Response(new Uint8Array(10), { headers: { "content-type": "image/jpeg" } });
        if (url.endsWith("uploadBlob")) return Response.json({ blob: { ref: "blob1" } });
        if (url.endsWith("createRecord")) return Response.json({ uri: "at://did:plc:abc/app.bsky.feed.post/3k1" });
        return new Response("nope", { status: 404 });
      }),
    );
    const res = await createBlueskyPost({
      identifier: "criticore.cc",
      appPassword: "app-pass",
      text: "Neu: https://criticore.cc/x",
      lang: "de",
      card: { uri: "https://criticore.cc/x", title: "Titel", description: "Teaser", imageUrl: "https://img/cover.jpg" },
    });
    expect(res.url).toBe("https://bsky.app/profile/criticore.cc/post/3k1");
    const record = (calls.at(-1)!.body as { record: Record<string, unknown> }).record;
    expect(record.langs).toEqual(["de"]);
    expect(record.embed).toEqual({ $type: "app.bsky.embed.external", external: { uri: "https://criticore.cc/x", title: "Titel", description: "Teaser", thumb: { ref: "blob1" } } });
  });
});
