import { nl, type MessageKey } from "./nl";

type Params = Record<string, string | number>;

/** Een nieuwe taal is een extra woordenboek met dezelfde sleutels. */
const dictionary: Record<MessageKey, string> = nl;

export function t(key: MessageKey, params: Params = {}): string {
  return dictionary[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
