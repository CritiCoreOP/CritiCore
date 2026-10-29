import type { Node as PMNode } from "@tiptap/pm/model";

export interface TextRange {
  from: number;
  to: number;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * The text of one paragraph, heading or list item with the document position of every character.
 * Anything that is not text (an image, a line break) becomes "￼", so a match can never span it.
 */
export function textblockChars(node: PMNode, pos: number): { chars: string; positions: number[] } {
  let chars = "";
  const positions: number[] = [];
  node.forEach((child, offset) => {
    if (child.isText && child.text) {
      for (let i = 0; i < child.text.length; i++) {
        chars += child.text[i];
        positions.push(pos + 1 + offset + i);
      }
    } else {
      chars += "￼";
      positions.push(pos + 1 + offset);
    }
  });
  return { chars, positions };
}

/** Document range of the characters `start` up to `end` (exclusive) of a textblock */
export const charRange = (positions: number[], start: number, end: number): TextRange => ({ from: positions[start], to: positions[end - 1] + 1 });

/**
 * Document positions of every exact occurrence of `text` inside a single paragraph, heading or list
 * item. Marks inside the passage (bold, links) do not matter; an image or line break in between ends
 * the match. `wholeWord` skips hits that are part of a longer word ("das" inside "dass").
 */
export function findAllTextRanges(doc: PMNode, text: string, { wholeWord = false, limit = Infinity } = {}): TextRange[] {
  const found: TextRange[] = [];
  if (!text) return found;

  doc.descendants((node, pos) => {
    if (found.length >= limit) return false;
    if (!node.isTextblock) return true;
    const { chars, positions } = textblockChars(node, pos);
    for (let index = chars.indexOf(text); index >= 0 && found.length < limit; index = chars.indexOf(text, index + 1)) {
      const end = index + text.length;
      if (wholeWord && (WORD_CHAR.test(chars[index - 1] ?? "") || WORD_CHAR.test(chars[end] ?? ""))) continue;
      found.push({ from: positions[index], to: positions[end - 1] + 1 });
    }
    return false;
  });

  return found;
}

/**
 * Document positions of the first exact occurrence of `text`, or null. Used to jump to and fix
 * passages the quality analysis quotes.
 */
export function findTextRange(doc: PMNode, text: string): TextRange | null {
  return findAllTextRanges(doc, text, { limit: 1 })[0] ?? null;
}
