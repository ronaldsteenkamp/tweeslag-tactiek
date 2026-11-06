export interface TextPart {
  text: string;
  style: "plain" | "strong" | "em";
}

const INLINE = /\*\*(.+?)\*\*|\*(\S(?:.*?\S)?)\*/g;

/**
 * "Markdown light": alleen **vet** en *cursief*. De uitkomst is platte data en nooit HTML,
 * zodat tekst uit een gedeelde link geen opmaak of scripts kan injecteren.
 */
export function parseInline(source: string): TextPart[] {
  const parts: TextPart[] = [];
  let position = 0;
  for (const match of source.matchAll(INLINE)) {
    if (match.index > position) {
      parts.push({ text: source.slice(position, match.index), style: "plain" });
    }
    if (match[1] !== undefined) {
      parts.push({ text: match[1], style: "strong" });
    } else if (match[2] !== undefined) {
      parts.push({ text: match[2], style: "em" });
    }
    position = match.index + match[0].length;
  }
  if (position < source.length) {
    parts.push({ text: source.slice(position), style: "plain" });
  }
  return parts;
}
