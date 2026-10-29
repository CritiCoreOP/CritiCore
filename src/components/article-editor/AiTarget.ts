import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { TextRange } from "./textRange";

export const aiTargetKey = new PluginKey<TextRange | null>("aiTarget");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiTarget: {
      /** Highlights the passage an open AI suggestion will replace; null removes the highlight */
      setAiTarget: (range: TextRange | null) => ReturnType;
    };
  }
}

export const getAiTarget = (state: EditorState) => aiTargetKey.getState(state) ?? null;

/**
 * Keeps the passage the AI assistant works on visible while the focus is in the assistant panel,
 * where the browser no longer shows the editor's selection. The range follows edits.
 */
export const AiTarget = Extension.create({
  name: "aiTarget",

  addCommands() {
    return {
      setAiTarget:
        (range) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(aiTargetKey, { range }).setMeta("addToHistory", false);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<TextRange | null>({
        key: aiTargetKey,
        state: {
          init: () => null,
          apply(tr, range) {
            const meta = tr.getMeta(aiTargetKey) as { range: TextRange | null } | undefined;
            if (meta) return meta.range;
            if (!range || !tr.docChanged) return range;
            const next = { from: tr.mapping.map(range.from, 1), to: tr.mapping.map(range.to, -1) };
            return next.to > next.from ? next : null;
          },
        },
        props: {
          decorations(state) {
            const range = aiTargetKey.getState(state);
            return range ? DecorationSet.create(state.doc, [Decoration.inline(range.from, range.to, { class: "ai-target" })]) : null;
          },
        },
      }),
    ];
  },
});
