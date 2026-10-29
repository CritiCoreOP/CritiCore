import { Extension, type Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findAllTextRanges, type TextRange } from "./textRange";

/** One finding of the spellcheck function */
export interface SpellCorrection {
  original: string;
  correction: string;
  reason: string;
  /** A few words around the error, copied from the text; places it when `original` occurs more than once */
  context?: string;
}

export interface SpellError extends TextRange {
  id: string;
  original: string;
  correction: string;
  reason: string;
}

type Meta = { set: SpellError[] } | { remove: string[] };

export const spellErrorsKey = new PluginKey<SpellError[]>("spellErrors");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spellErrors: {
      /** Marks the given errors in the text, replacing earlier ones */
      setSpellErrors: (errors: SpellError[]) => ReturnType;
      /** Removes the marking without changing the text */
      dismissSpellErrors: (ids: string[]) => ReturnType;
      /** Replaces the errors (all when no ids are given) with their correction, as one undo step */
      applySpellErrors: (ids?: string[]) => ReturnType;
    };
  }
}

/**
 * Finds where in the document each correction belongs. With `context` the exact passage is used (every
 * occurrence of it); without, the word only counts when it appears exactly once, so a correct "das"
 * elsewhere is never turned into "dass".
 */
export function locateCorrections(doc: PMNode, corrections: SpellCorrection[]): SpellError[] {
  const errors: SpellError[] = [];
  const taken = (r: TextRange) => errors.some((e) => r.from < e.to && e.from < r.to);

  corrections.forEach((c, n) => {
    if (!c.original || c.original === c.correction) return;
    let ranges: TextRange[] = [];
    const offset = c.context ? c.context.indexOf(c.original) : -1;
    if (c.context && offset >= 0) {
      ranges = findAllTextRanges(doc, c.context).map((r) => ({ from: r.from + offset, to: r.from + offset + c.original.length }));
    }
    if (!ranges.length) {
      const hits = findAllTextRanges(doc, c.original, { wholeWord: true, limit: 2 });
      if (hits.length === 1) ranges = hits;
    }
    ranges.forEach((r, i) => {
      if (!taken(r)) errors.push({ ...r, id: `${n}-${i}`, original: c.original, correction: c.correction, reason: c.reason });
    });
  });

  return errors.sort((a, b) => a.from - b.from);
}

/**
 * Applies corrections straight to the text, as one undo step, for editors without the underline
 * extension. Returns how many were applied.
 */
export function applyCorrections(editor: Editor, corrections: SpellCorrection[]): number {
  const errors = locateCorrections(editor.state.doc, corrections);
  if (!errors.length) return 0;
  const tr = editor.state.tr;
  for (const e of [...errors].reverse()) tr.insertText(e.correction, e.from, e.to);
  editor.view.dispatch(tr);
  return errors.length;
}

export const getSpellErrors = (state: EditorState): SpellError[] => spellErrorsKey.getState(state) ?? [];

/** The error under a collapsed cursor, if any */
export function spellErrorAt(editor: Editor): SpellError | null {
  const { from, to } = editor.state.selection;
  if (from !== to) return null;
  return getSpellErrors(editor.state).find((e) => from >= e.from && from <= e.to) ?? null;
}

const setMeta = (tr: Transaction, meta: Meta) => tr.setMeta(spellErrorsKey, meta).setMeta("addToHistory", false);

/**
 * Wavy underline under the errors the spellcheck found. The marking follows edits; an error whose text
 * was changed by hand disappears.
 */
export const SpellErrors = Extension.create({
  name: "spellErrors",

  addCommands() {
    return {
      setSpellErrors:
        (errors) =>
        ({ tr, dispatch }) => {
          if (dispatch) setMeta(tr, { set: errors });
          return true;
        },
      dismissSpellErrors:
        (ids) =>
        ({ tr, dispatch }) => {
          if (dispatch) setMeta(tr, { remove: ids });
          return true;
        },
      applySpellErrors:
        (ids) =>
        ({ tr, state, dispatch }) => {
          const chosen = getSpellErrors(state).filter((e) => !ids || ids.includes(e.id));
          if (!chosen.length) return false;
          if (dispatch) {
            // Back to front, so the positions of the remaining errors stay valid
            for (const e of [...chosen].sort((a, b) => b.from - a.from)) {
              if (state.doc.textBetween(e.from, e.to) === e.original) tr.insertText(e.correction, e.from, e.to);
            }
            tr.setMeta(spellErrorsKey, { remove: chosen.map((e) => e.id) } satisfies Meta);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SpellError[]>({
        key: spellErrorsKey,
        state: {
          init: () => [],
          apply(tr, errors) {
            let next = errors;
            if (tr.docChanged && next.length) {
              next = next
                .map((e) => ({ ...e, from: tr.mapping.map(e.from, 1), to: tr.mapping.map(e.to, -1) }))
                .filter((e) => e.to > e.from && tr.doc.textBetween(e.from, e.to) === e.original);
            }
            const meta = tr.getMeta(spellErrorsKey) as Meta | undefined;
            if (meta && "set" in meta) next = meta.set;
            if (meta && "remove" in meta) next = next.filter((e) => !meta.remove.includes(e.id));
            return next;
          },
        },
        props: {
          decorations(state) {
            const errors = spellErrorsKey.getState(state);
            if (!errors?.length) return null;
            return DecorationSet.create(
              state.doc,
              errors.map((e) => Decoration.inline(e.from, e.to, { class: "spell-error", "data-spell-id": e.id })),
            );
          },
        },
      }),
    ];
  },
});
