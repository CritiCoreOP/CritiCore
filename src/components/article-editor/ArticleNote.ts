import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleNote: {
      /** Wraps the current paragraphs in a note box, or unwraps them */
      toggleArticleNote: () => ReturnType;
    };
  }
}

/**
 * Note box ("Hinweis") for disclosures, sources or corrections, usually at the end of an article.
 * Stored as <aside class="article-note">; the label above it comes from CSS (--article-note-label),
 * so every language version shows its own word and the translation only touches the text.
 */
export const ArticleNote = Node.create({
  name: "articleNote",
  group: "block",
  content: "paragraph+",
  defining: true,

  parseHTML() {
    return [{ tag: "aside.article-note" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { class: "article-note" }), 0];
  },

  addCommands() {
    return {
      toggleArticleNote:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});
