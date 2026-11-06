import { parseInline } from "../../domain/richText";

export function RichText({ source }: { source: string }) {
  return parseInline(source).map((part, index) => {
    if (part.style === "strong")
      return <strong key={index}>{part.text}</strong>;
    if (part.style === "em") return <em key={index}>{part.text}</em>;
    return part.text;
  });
}
