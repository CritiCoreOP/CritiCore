import { getHTMLFromFragment, type Editor } from "@tiptap/core";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import type { TextRange } from "./textRange";

const isSpace = (s: string) => s.length === 1 && /\s/.test(s);

/**
 * The selection without spaces at its edges: the HTML round trip drops them, which would glue the
 * new text to the word before or after it.
 */
export function trimmedSelection(editor: Editor): TextRange {
  let { from, to } = editor.state.selection;
  const { doc } = editor.state;
  while (from < to && isSpace(doc.textBetween(from, from + 1))) from++;
  while (to > from && isSpace(doc.textBetween(to - 1, to))) to--;
  return { from, to };
}

/** The passage as HTML, with links and formatting, the way the assistant sends it to the AI */
export function passageHtml(editor: Editor, { from, to }: TextRange): string {
  return getHTMLFromFragment(editor.state.doc.slice(from, to).content, editor.schema);
}

/**
 * Replaces the passage with the AI's HTML like a paste does: a single paragraph merges into the
 * surrounding one, several become paragraphs. The HTML is parsed in an inert document (no scripts,
 * no image requests) and only what the editor's schema knows survives. One undo step.
 */
export function replaceWithHtml(editor: Editor, { from, to }: TextRange, html: string): boolean {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const slice = PMDOMParser.fromSchema(editor.schema).parseSlice(body);
  if (!slice.content.size) return false;
  const tr = editor.state.tr.replaceRange(from, to, slice);
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
