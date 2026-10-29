import { describe, expect, it, vi } from "vitest";
import { fetchYouTubeMeta, formatStart, parseYouTubeUrl, youtubeWatchUrl } from "./youtube";

describe("parseYouTubeUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", 0],
    ["youtube.com/watch?v=dQw4w9WgXcQ&list=PL123", 0],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=90", 90],
    ["https://youtu.be/dQw4w9WgXcQ?t=1m30s", 90],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", 0],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?feature=share", 0],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=3725", 3725],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m5s", 3725],
  ])("reads %s", (url, start) => {
    expect(parseYouTubeUrl(url)).toEqual({ id: "dQw4w9WgXcQ", start });
  });

  it.each([
    "",
    "https://vimeo.com/123456",
    "https://www.youtube.com/watch?v=short",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://www.youtube.com/@channel",
    "Schau mal https://youtu.be/dQw4w9WgXcQ",
  ])("rejects %s", (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });
});

describe("youtube helpers", () => {
  it("builds the watch link with the start time", () => {
    expect(youtubeWatchUrl({ id: "dQw4w9WgXcQ", start: 0 })).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(youtubeWatchUrl({ id: "dQw4w9WgXcQ", start: 90 })).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s");
  });

  it("formats start times", () => {
    expect(formatStart(5)).toBe("0:05");
    expect(formatStart(90)).toBe("1:30");
    expect(formatStart(3725)).toBe("1:02:05");
  });
});

describe("fetchYouTubeMeta", () => {
  const respond = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

  it("reads title and channel from the site's own endpoint", async () => {
    const fetchFn = respond({ title: "Trailer", author: "Nintendo" });
    expect(await fetchYouTubeMeta("dQw4w9WgXcQ", fetchFn as unknown as typeof fetch)).toEqual({ title: "Trailer", author: "Nintendo" });
    expect(fetchFn).toHaveBeenCalledWith("/media/yt/dQw4w9WgXcQ.json");
  });

  it("accepts oEmbed's author_name (dev server) and gives up quietly", async () => {
    expect(await fetchYouTubeMeta("dQw4w9WgXcQ", respond({ title: "T", author_name: "Kanal" }) as unknown as typeof fetch)).toEqual({ title: "T", author: "Kanal" });
    expect(await fetchYouTubeMeta("dQw4w9WgXcQ", respond({}, 404) as unknown as typeof fetch)).toBeNull();
    expect(await fetchYouTubeMeta("not-an-id")).toBeNull();
  });
});
