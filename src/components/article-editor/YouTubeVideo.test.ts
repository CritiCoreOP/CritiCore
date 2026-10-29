import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { sanitizeHtml } from "@/lib/sanitize";
import { YouTubeVideo } from "./YouTubeVideo";

let editor: Editor | null = null;
const make = (content: string) => (editor = new Editor({ extensions: [StarterKit, YouTubeVideo], content }));

const STORED =
  '<div class="video-embed" data-youtube-id="dQw4w9WgXcQ" data-start="90"><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&amp;t=90s" target="_blank" rel="noopener noreferrer nofollow">https://www.youtube.com/watch?v=dQw4w9WgXcQ&amp;t=90s</a></div>';

describe("YouTubeVideo node", () => {
  afterEach(() => editor?.destroy());

  it("stores id and start as a placeholder with a plain link, no iframe", () => {
    const e = make("<p>Davor</p>");
    e.commands.setTextSelection(e.state.doc.content.size);
    e.commands.setYouTubeVideo({ id: "dQw4w9WgXcQ", start: 90 });
    expect(e.getHTML()).toContain(STORED);
    expect(e.getHTML()).not.toContain("iframe");
  });

  it("leaves the cursor on a line below the video", () => {
    const e = make("<p>Davor</p>");
    e.commands.setTextSelection(e.state.doc.content.size);
    e.commands.setYouTubeVideo({ id: "dQw4w9WgXcQ", start: 0 });
    expect(e.state.doc.childCount).toBe(3);
    expect(e.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(e.state.selection.from).toBeGreaterThan(e.state.doc.child(0).nodeSize + e.state.doc.child(1).nodeSize);

    // In the middle of the article the next paragraph is used, no empty one is added
    e.commands.setContent("<p>Eins</p><p></p><p>Drei</p>");
    e.commands.setTextSelection(e.state.doc.child(0).nodeSize + 1);
    e.commands.setYouTubeVideo({ id: "dQw4w9WgXcQ", start: 0 });
    expect(e.getText()).toBe("Eins\n\n\n\nDrei");
    expect(e.state.selection.$from.parent.textContent).toBe("Drei");
  });

  it("reads the stored placeholder back unchanged", () => {
    const e = make(`<p>Text</p>${STORED}`);
    const node = e.state.doc.child(1);
    expect(node.type.name).toBe("youtubeVideo");
    expect(node.attrs).toEqual({ id: "dQw4w9WgXcQ", start: 90, title: null, author: null });
    expect(e.getHTML()).toBe(`<p>Text</p>${STORED}`);
  });

  it("keeps the title and channel fetched from YouTube", () => {
    const withMeta = STORED.replace('data-start="90"', 'data-start="90" data-title="Ein &quot;Trailer&quot;" data-author="Nintendo"');
    const e = make(withMeta);
    expect(e.state.doc.child(0).attrs).toMatchObject({ title: 'Ein "Trailer"', author: "Nintendo" });
    expect(e.getHTML()).toBe(withMeta);
    expect(sanitizeHtml(withMeta)).toContain('data-author="Nintendo"');
  });

  it("drops placeholders with an invalid id", () => {
    const e = make('<div class="video-embed" data-youtube-id="x&quot;onerror"><a href="https://example.com">x</a></div>');
    expect(e.getHTML()).not.toContain("video-embed");
  });

  it("survives the article sanitizer, iframes do not", () => {
    const clean = sanitizeHtml(`${STORED}<iframe src="https://evil.example"></iframe>`);
    expect(clean).toContain('data-youtube-id="dQw4w9WgXcQ"');
    expect(clean).toContain('data-start="90"');
    expect(clean).not.toContain("iframe");
  });
});
