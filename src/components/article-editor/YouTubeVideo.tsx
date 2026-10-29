import { useEffect } from "react";
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { NodeSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import TrailerEmbed from "@/components/TrailerEmbed";
import { cn } from "@/lib/utils";
import { fetchYouTubeMeta, parseYouTubeUrl, YOUTUBE_ID, youtubeThumbnailUrl, youtubeWatchUrl, type YouTubeVideo as Video } from "@/lib/youtube";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    youtubeVideo: {
      /** Inserts a YouTube video as its own block at the cursor */
      setYouTubeVideo: (video: Video) => ReturnType;
    };
  }
}

/**
 * Fills in title and channel of every video with this id that has none yet. Not an undo step: it is
 * information about the video, not an edit of the author.
 */
async function loadMeta(editor: Editor, id: string) {
  const meta = await fetchYouTubeMeta(id);
  if (!meta || editor.isDestroyed) return;
  const { tr } = editor.state;
  editor.state.doc.descendants((n, pos) => {
    if (n.type.name === "youtubeVideo" && n.attrs.id === id && !n.attrs.title) {
      tr.setNodeMarkup(pos, undefined, { ...n.attrs, title: meta.title, author: meta.author });
    }
  });
  if (tr.docChanged) editor.view.dispatch(tr.setMeta("addToHistory", false));
}

function VideoView({ node, selected, editor }: ReactNodeViewProps) {
  const { t } = useTranslation();
  const { id, start, title, author } = node.attrs as Video & { title: string | null; author: string | null };

  // Videos from before titles were stored get theirs when the article is opened
  useEffect(() => {
    if (!title && editor.isEditable) void loadMeta(editor, id);
  }, [editor, id, title]);

  return (
    // The player is not editable text; the outline shows the block is selected (Delete removes it)
    <NodeViewWrapper className="video-embed not-prose" data-drag-handle="">
      <div contentEditable={false} className={cn("rounded-2xl transition-shadow", selected && "ring-2 ring-ring ring-offset-2 ring-offset-background")}>
        <TrailerEmbed
          videoKey={id}
          start={start}
          title={t("article.video.title")}
          caption={t("article.video.caption")}
          thumbnail={youtubeThumbnailUrl(id)}
          videoTitle={title}
          channel={author}
        />
      </div>
    </NodeViewWrapper>
  );
}

/**
 * YouTube video inside an article. Stored as a placeholder with the video id and a plain link,
 * never as an iframe: the article page turns it into the click-to-play player (nothing is loaded
 * from YouTube before the reader clicks), and everywhere else (feeds, API, translation) the link
 * still works.
 */
export const YouTubeVideo = Node.create({
  name: "youtubeVideo",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    // Read from the data attributes; written by renderHTML below, not as plain id/start attributes
    return {
      id: { default: null, parseHTML: (el) => el.getAttribute("data-youtube-id"), rendered: false },
      start: { default: 0, parseHTML: (el) => Number(el.getAttribute("data-start")) || 0, rendered: false },
      // From YouTube when the video is added; stored, so the article page needs no extra request
      title: { default: null, parseHTML: (el) => el.getAttribute("data-title") || null, rendered: false },
      author: { default: null, parseHTML: (el) => el.getAttribute("data-author") || null, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.video-embed[data-youtube-id]",
        // Only real video ids; anything else stays out of the document
        getAttrs: (el) => (YOUTUBE_ID.test((el as HTMLElement).getAttribute("data-youtube-id") ?? "") ? null : false),
      },
    ];
  },

  renderHTML({ node }) {
    const video = node.attrs as Video;
    const href = youtubeWatchUrl(video);
    return [
      "div",
      mergeAttributes({
        class: "video-embed",
        "data-youtube-id": video.id,
        "data-start": video.start ? String(video.start) : null,
        "data-title": node.attrs.title || null,
        "data-author": node.attrs.author || null,
      }),
      ["a", { href, target: "_blank", rel: "noopener noreferrer nofollow" }, href],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },

  addCommands() {
    return {
      setYouTubeVideo:
        (video) =>
        ({ chain }) => {
          const done = chain()
            .insertContent({ type: this.name, attrs: video })
            // Writing goes on below the video: in the next paragraph, or a new one at the end of the article
            .command(({ tr }) => {
              const { selection } = tr;
              if (!(selection instanceof NodeSelection) || selection.node.type !== this.type) return true;
              const after = selection.to;
              const next = tr.doc.resolve(after).nodeAfter;
              if (!next) tr.insert(after, this.type.schema.nodes.paragraph.create());
              if (!next || next.isTextblock) tr.setSelection(TextSelection.create(tr.doc, after + 1));
              return true;
            })
            .run();
          if (done) void loadMeta(this.editor, video.id);
          return done;
        },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          // A YouTube link pasted on an empty line becomes the video; inside text it stays a link
          handlePaste: (view, event) => {
            const video = parseYouTubeUrl(event.clipboardData?.getData("text/plain") ?? "");
            const { $from, empty } = view.state.selection;
            if (!video || !empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size > 0) return false;
            // Inserting at an empty line replaces it
            return editor.chain().setYouTubeVideo(video).scrollIntoView().run();
          },
        },
      }),
    ];
  },
});
