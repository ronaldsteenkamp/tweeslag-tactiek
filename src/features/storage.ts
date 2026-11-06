export type SafeStorage = Pick<Storage, "getItem" | "setItem">;

/** Sommige browsers geven al een fout bij het opvragen van localStorage. */
export function browserStorage(): SafeStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readJson(
  storage: SafeStorage | undefined,
  key: string,
): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJson(
  storage: SafeStorage | undefined,
  key: string,
  value: unknown,
): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Opslag vol of geweigerd: de app werkt door, alleen zonder bewaren.
  }
}
