import type * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'

// renderAsync (0.0.22) dekodiert den Stream chunkweise und zerlegt dabei Umlaute
// und Thai-Zeichen an Chunk-Grenzen in "��" (etwa jede zehnte Mail).
// render arbeitet ohne Stream und liefert sauberes UTF-8.
export function renderEmail(element: React.ReactElement): { html: string; text: string } {
  return {
    html: render(element),
    text: render(element, { plainText: true }),
  }
}
