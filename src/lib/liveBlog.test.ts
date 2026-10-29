import { describe, expect, it } from "vitest";
import { applyChange, linkify, sortUpdates, updateStamp, type LiveUpdate } from "./liveBlog";

const u = (id: string, created_at: string, extra: Partial<LiveUpdate> = {}): LiveUpdate => ({
  id,
  article_id: "a",
  author_id: null,
  title: null,
  body: id,
  image_url: null,
  is_key: false,
  is_pinned: false,
  created_at,
  updated_at: created_at,
  ...extra,
});

describe("live blog", () => {
  it("shows pinned updates first, then the newest", () => {
    const list = [u("old", "2026-10-19T08:00:00Z"), u("pin", "2026-10-19T07:00:00Z", { is_pinned: true }), u("new", "2026-10-19T09:00:00Z")];
    expect(sortUpdates(list).map((x) => x.id)).toEqual(["pin", "new", "old"]);
  });

  it("applies Realtime changes by id", () => {
    const list = [u("a", "2026-10-19T08:00:00Z")];
    expect(applyChange(list, "INSERT", u("b", "2026-10-19T09:00:00Z")).map((x) => x.id)).toEqual(["b", "a"]);
    // The author's own insert comes back through Realtime: no duplicate
    expect(applyChange(applyChange(list, "INSERT", u("b", "2026-10-19T09:00:00Z")), "INSERT", u("b", "2026-10-19T09:00:00Z"))).toHaveLength(2);
    expect(applyChange(list, "UPDATE", { ...list[0], body: "neu" })[0].body).toBe("neu");
    expect(applyChange(list, "DELETE", { id: "a" })).toEqual([]);
    expect(applyChange(list, "DELETE", { id: "elsewhere" })).toHaveLength(1);
  });

  it("makes links clickable and leaves everything else as text", () => {
    expect(linkify("Trailer: https://www.youtube.com/watch?v=abc. <b>nein</b>")).toEqual([
      { type: "text", value: "Trailer: " },
      { type: "link", value: "youtube.com/watch?v=abc", href: "https://www.youtube.com/watch?v=abc" },
      { type: "text", value: ". <b>nein</b>" },
    ]);
    expect(linkify("javascript:alert(1)")).toEqual([{ type: "text", value: "javascript:alert(1)" }]);
  });

  it("writes the time in German time, with the day for older updates", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    expect(updateStamp("2026-10-19T12:32:00Z", "de-DE", now)).toEqual({ time: "14:32", day: null });
    expect(updateStamp("2026-10-17T08:05:00Z", "de-DE", now)).toEqual({ time: "10:05", day: "17. Okt." });
  });
});
