import { describe, expect, it } from "vitest";
import { activeItem, visibleGroups, visibleItems } from "./nav";
import { buildInbox, queueCounts, type QueueResult } from "./inbox";
import { dailyBuckets, weekTrend } from "./kpis";
import { buildPost, hashtags, PLATFORM_SPECS, PLATFORMS, postLength, type PostArticle } from "./social/postTemplates";

describe("navigation", () => {
  it("shows the admin groups to admins only", () => {
    const team = visibleItems(false).map((i) => i.id);
    expect(team).toContain("posts");
    expect(team).toContain("top10");
    expect(team).not.toContain("users");
    expect(visibleGroups(false).some((g) => g.adminOnly)).toBe(false);
    expect(visibleItems(true).map((i) => i.id)).toEqual(expect.arrayContaining(["users", "reports", "settings", "posts"]));
  });

  it("finds the entry of a nested page, not the overview", () => {
    const items = visibleItems(true);
    expect(activeItem(items, "/dashboard")?.id).toBe("overview");
    expect(activeItem(items, "/dashboard/admin")?.id).toBe("adminHome");
    expect(activeItem(items, "/dashboard/admin/users")?.id).toBe("users");
    expect(activeItem(items, "/dashboard/social/top10")?.id).toBe("top10");
    expect(activeItem(items, "/elsewhere")).toBeUndefined();
  });
});

describe("inbox", () => {
  const now = new Date("2026-10-11T12:00:00Z").getTime();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const results: QueueResult[] = [
    { kind: "reports", count: 7, rows: [{ id: "r1", title: "Spam", at: hoursAgo(50) }, { id: "r2", title: "Beleidigung", at: hoursAgo(2) }] },
    { kind: "support", count: 1, rows: [{ id: "s1", title: "Login geht nicht", at: hoursAgo(5) }] },
    { kind: "images", count: 0, rows: [] },
  ];

  it("lists the longest waiting first and flags what waits two days", () => {
    const inbox = buildInbox(results, now);
    expect(inbox.map((e) => e.id)).toEqual(["r1", "s1", "r2"]);
    expect(inbox[0]).toMatchObject({ kind: "reports", overdue: true, href: "/dashboard/admin/reports" });
    expect(inbox[1].overdue).toBe(false);
    expect(buildInbox(results, now, 1)).toHaveLength(1);
  });

  it("adds up the open items of every queue", () => {
    expect(queueCounts(results)).toMatchObject({ reports: 7, support: 1, images: 0, dmca: 0, all: 8 });
  });
});

describe("kpis", () => {
  const now = new Date(2026, 9, 11, 15, 0);
  it("counts per day, today last", () => {
    const buckets = dailyBuckets([new Date(2026, 9, 11, 9).toISOString(), new Date(2026, 9, 10, 23).toISOString(), new Date(2026, 9, 10, 1).toISOString(), new Date(2026, 8, 1).toISOString(), null], 7, now);
    expect(buckets).toEqual([0, 0, 0, 0, 0, 2, 1]);
  });

  it("compares the last week with the week before", () => {
    const flat = [...new Array(7).fill(2), ...new Array(7).fill(3)];
    expect(weekTrend(flat)).toBe(50);
    expect(weekTrend(new Array(14).fill(0))).toBeNull();
  });
});

describe("post templates", () => {
  const article: PostArticle = {
    title: "Frieren Staffel 2 bekommt einen Starttermin",
    excerpt: "Madhouse zeigt den ersten Trailer und verrät, wann die zweite Staffel startet. Wir haben alle Details zu Episoden, Streaming und Synchronisation zusammengefasst, damit du nichts verpasst.",
    url: "https://criticore.cc/de-DE/news/frieren-staffel-2-starttermin-und-trailer-zur-zweiten-staffel",
    category: "series",
    articleType: "news",
    language: "de",
  };

  it("stays within every platform's limit", () => {
    for (const p of PLATFORMS) {
      const text = buildPost(p, article);
      const limit = PLATFORM_SPECS[p].limit;
      if (limit) expect(postLength(p, text)).toBeLessThanOrEqual(limit);
      expect(text.startsWith(article.title)).toBe(true);
      expect(text).toContain("#CritiCore");
    }
  });

  it("opens opinion pieces with the label in capitals, in the article's language", () => {
    const opinion = { ...article, articleType: "opinion", title: "Warum Staffel 2 alles richtig macht" };
    for (const p of PLATFORMS) expect(buildPost(p, opinion).startsWith("MEINUNG: Warum Staffel 2")).toBe(true);
    expect(buildPost("x", { ...opinion, language: "en" }).startsWith("OPINION: ")).toBe(true);
    // A review is an opinion piece as well, and says what kind
    expect(buildPost("bluesky", { ...article, articleType: "review", title: "Silksong im Test" }).startsWith("REVIEW · MEINUNG: Silksong im Test")).toBe(true);
    expect(buildPost("bluesky", article).startsWith(article.title)).toBe(true);
    // A title too long for X is cut at the end, the label stays
    const long = buildPost("x", { ...opinion, title: "Warum ".repeat(80) });
    expect(long.startsWith("MEINUNG: ")).toBe(true);
    expect(postLength("x", long)).toBeLessThanOrEqual(280);
  });

  it("links in the text, except on Instagram", () => {
    expect(buildPost("x", article)).toContain(article.url);
    expect(buildPost("instagram", article)).not.toContain(article.url);
    expect(buildPost("instagram", article)).toContain("Link in der Bio");
  });

  it("counts a link on X as 23 characters", () => {
    expect(postLength("x", `Hallo ${article.url}`)).toBe(6 + 23);
    expect(postLength("bluesky", "ok")).toBe(2);
  });

  it("tags in the article's language", () => {
    expect(hashtags({ ...article, category: "games", articleType: "review", language: "fr" }, 3)).toEqual(["#CritiCore", "#JeuxVideo", "#Critique"]);
    expect(hashtags({ ...article, category: "general", articleType: null, language: "xx" }, 2)).toEqual(["#CritiCore", "#News"]);
  });

  it("shortens a title that does not fit at all", () => {
    const long = { ...article, title: "Sehr ".repeat(80).trim() };
    const text = buildPost("x", long);
    expect(postLength("x", text)).toBeLessThanOrEqual(280);
    expect(text).toContain("…");
  });
});
