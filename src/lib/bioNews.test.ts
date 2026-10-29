import { describe, expect, it } from "vitest";
import { pickLatest, publishedAt, type BioArticle } from "./bioNews";

const article = (id: string, extra: Partial<BioArticle> = {}): BioArticle => ({
  id,
  slug: id,
  title: id,
  excerpt: null,
  cover_image_url: null,
  category: "games",
  article_type: "news",
  language: "de",
  translation_group: null,
  published_at: null,
  created_at: "2026-10-01T10:00:00Z",
  ...extra,
});

describe("bio news", () => {
  it("shows each story once, in the visitor's language when there is one", () => {
    const list = [
      article("a-de", { translation_group: "a" }),
      article("b"),
      article("a-en", { translation_group: "a", language: "en" }),
      article("c-en", { translation_group: "c", language: "en" }),
      article("c-fr", { translation_group: "c", language: "fr" }),
    ];
    expect(pickLatest(list, "en", 10).map((a) => a.id)).toEqual(["a-en", "b", "c-en"]);
    // Without a version in the visitor's language the newest one stays
    expect(pickLatest(list, "th", 10).map((a) => a.id)).toEqual(["a-de", "b", "c-en"]);
    // The story keeps the place of its newest version
    expect(pickLatest(list, "fr", 2).map((a) => a.id)).toEqual(["a-de", "b"]);
  });

  it("dates older articles by when they were created", () => {
    expect(publishedAt(article("x", { published_at: "2026-10-12T08:00:00Z" }))).toBe("2026-10-12T08:00:00Z");
    expect(publishedAt(article("y"))).toBe("2026-10-01T10:00:00Z");
  });
});
