import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { ReadabilityHint } from "./readability";

export const readabilityKey = new PluginKey<ReadabilityHint[]>("readabilityMarks");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    readabilityMarks: {
      /** Marks the hints of a readability check in the text; an empty list removes the marks */
      setReadabilityHints: (hints: ReadabilityHint[]) => ReturnType;
    };
  }
}

export const getReadabilityHints = (state: EditorState) => readabilityKey.getState(state) ?? [];

/**
 * Marks long sentences, filler words and stock phrases after a readability check. The marks follow
 * edits; a hint whose text was edited away disappears.
 */
export const ReadabilityMarks = Extension.create({
  name: "readabilityMarks",

  addCommands() {
    return {
      setReadabilityHints:
        (hints) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(readabilityKey, hints).setMeta("addToHistory", false);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<ReadabilityHint[]>({
        key: readabilityKey,
        state: {
          init: () => [],
          apply(tr, hints) {
            const set = tr.getMeta(readabilityKey) as ReadabilityHint[] | undefined;
            if (set) return set;
            if (!tr.docChanged || !hints.length) return hints;
            return hints
              .map((h) => ({ ...h, from: tr.mapping.map(h.from, 1), to: tr.mapping.map(h.to, -1) }))
              .filter((h) => h.to > h.from && (h.kind === "long" || tr.doc.textBetween(h.from, h.to).toLowerCase() === h.text.toLowerCase()));
          },
        },
        props: {
          decorations(state) {
            const hints = readabilityKey.getState(state);
            if (!hints?.length) return null;
            return DecorationSet.create(
              state.doc,
              hints.map((h) => Decoration.inline(h.from, h.to, { class: `readability-${h.kind}`, "data-hint-id": h.id })),
            );
          },
        },
      }),
    ];
  },
});
