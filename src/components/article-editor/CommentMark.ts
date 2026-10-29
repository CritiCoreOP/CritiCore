import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      /** Wrap the current selection in an editorial comment mark. */
      setCommentMark: (anchorId: string) => ReturnType;
      /** Remove the comment mark with the given anchor id from the document. */
      unsetCommentMark: (anchorId: string) => ReturnType;
    };
  }
}

/**
 * A TipTap mark that flags a passage as having an inline editorial comment.
 * The `data-comment-id` attribute links the highlighted text to a row in
 * `article_comments` (via its `anchor_id`).
 */
export const CommentMark = Mark.create<CommentMarkOptions>({
  name: "commentMark",

  inclusive() {
    return false;
  },

  addOptions() {
    return {
      HTMLAttributes: {
        class:
          "bg-primary/25 rounded-sm px-0.5 cursor-pointer transition-colors hover:bg-primary/40",
      },
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCommentMark:
        (anchorId: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { commentId: anchorId }),
      unsetCommentMark:
        (anchorId: string) =>
        ({ tr, state, dispatch }) => {
          const markType = state.schema.marks[this.name];
          if (!markType) return false;
          let changed = false;
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find(
              (m) => m.type === markType && m.attrs.commentId === anchorId,
            );
            if (mark) {
              tr.removeMark(pos, pos + node.nodeSize, markType);
              changed = true;
            }
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
    };
  },
});

export default CommentMark;
