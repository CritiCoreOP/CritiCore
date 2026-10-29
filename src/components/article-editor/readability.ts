import type { Node as PMNode } from "@tiptap/pm/model";
import { charRange, textblockChars, type TextRange } from "./textRange";

export type HintKind = "long" | "filler" | "cliche";

export interface ReadabilityHint extends TextRange {
  id: string;
  kind: HintKind;
  /** The flagged word, or the start of the long sentence */
  text: string;
  /** Words in the sentence (long sentences only) */
  words?: number;
}

export interface ReadabilityReport {
  words: number;
  sentences: number;
  /** Average words per sentence, one decimal */
  average: number;
  hints: ReadabilityHint[];
  /** Sentence checks need spaces between words; Thai has none */
  sentenceCheck: boolean;
}

/** Above this many words a sentence is hard to follow in a news text (dpa recommends about 20) */
export const LONG_SENTENCE = 25;

// Words that rarely add anything; a hint, not an error
const FILLERS: Record<string, string[]> = {
  de: ["eigentlich", "irgendwie", "sozusagen", "quasi", "gewissermaßen", "durchaus", "ziemlich", "sicherlich", "im Grunde", "an und für sich", "letztendlich"],
  en: ["basically", "actually", "literally", "really", "very", "quite", "somewhat", "kind of", "sort of"],
  fr: ["vraiment", "en fait", "littéralement", "assez", "plutôt", "en quelque sorte"],
  es: ["realmente", "básicamente", "literalmente", "bastante", "en cierto modo", "simplemente"],
};

// Empty praise and stock phrases of games and film writing
const CLICHES: Record<string, string[]> = {
  de: ["bahnbrechend", "atemberaubend", "Meilenstein", "Must-have", "ultimativ", "lässt keine Wünsche offen", "Fans dürfen sich freuen", "Hingucker", "Augenschmaus", "in jeder Hinsicht", "Spaß für die ganze Familie"],
  en: ["groundbreaking", "breathtaking", "must-have", "game-changer", "next-level", "jaw-dropping", "fans will love", "a feast for the eyes", "second to none"],
  fr: ["à couper le souffle", "incontournable", "révolutionnaire", "un must", "les fans vont adorer"],
  es: ["impresionante", "imprescindible", "revolucionario", "los fans están de enhorabuena", "un antes y un después"],
};

// A period after these is no sentence end: abbreviations, single letters ("z. B.", initials) and day numbers ("7. Oktober")
const ABBREVIATION = /(?:(?<![\p{L}\p{N}])(?:bzw|ca|Dr|Nr|vgl|usw|etc|inkl|evtl|ggf|Mr|Mrs|Ms|vs|St|Jh)|(?<![\p{L}\p{N}])\p{L}|(?<!\p{N})\d{1,2})\.$/u;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrases = (list: string[]) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${list.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "giu");
const countWords = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

/** Sentences of one block as [start, end) character offsets */
export function splitSentences(text: string): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  const end = /[.!?…]+["“”»«')]*(?=\s|$)/g;
  for (let m = end.exec(text); m; m = end.exec(text)) {
    const stop = m.index + m[0].length;
    if (ABBREVIATION.test(text.slice(start, m.index + 1))) continue;
    out.push([start, stop]);
    start = stop;
    while (start < text.length && /\s/.test(text[start])) start++;
  }
  if (text.slice(start).trim()) out.push([start, text.length]);
  return out;
}

/**
 * Instant, local check of the article: long sentences, filler words and stock phrases, plus the
 * numbers behind it. No AI and no request; it runs on the document as it is in the editor.
 */
export function analyzeReadability(doc: PMNode, language: string): ReadabilityReport {
  const lang = language.slice(0, 2);
  const sentenceCheck = lang !== "th";
  const fillers = FILLERS[lang] ? phrases(FILLERS[lang]) : null;
  const cliches = CLICHES[lang] ? phrases(CLICHES[lang]) : null;
  const hints: ReadabilityHint[] = [];
  let words = 0;
  let sentences = 0;

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.type.name === "codeBlock") return false;
    const { chars, positions } = textblockChars(node, pos);
    if (!chars.trim()) return false;
    words += countWords(chars);

    if (sentenceCheck) {
      for (const [start, end] of splitSentences(chars)) {
        const sentence = chars.slice(start, end);
        const count = countWords(sentence);
        if (!count) continue;
        sentences++;
        // Headings and list items are no running text
        if (count > LONG_SENTENCE && node.type.name === "paragraph") {
          const preview = sentence.trim().split(/\s+/).slice(0, 7).join(" ");
          hints.push({ id: `l${positions[start]}`, kind: "long", ...charRange(positions, start, end), text: preview, words: count });
        }
      }
    }

    for (const [kind, re] of [["filler", fillers], ["cliche", cliches]] as const) {
      if (!re) continue;
      re.lastIndex = 0;
      for (let m = re.exec(chars); m; m = re.exec(chars)) {
        hints.push({ id: `${kind[0]}${positions[m.index]}`, kind, ...charRange(positions, m.index, m.index + m[0].length), text: m[0] });
      }
    }
    return false;
  });

  return {
    words,
    sentences,
    average: sentences ? Math.round((words / sentences) * 10) / 10 : 0,
    hints: hints.sort((a, b) => a.from - b.from).slice(0, 150),
    sentenceCheck,
  };
}
