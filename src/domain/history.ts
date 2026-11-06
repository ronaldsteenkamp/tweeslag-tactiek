export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

const LIMIT = 100;

export function startHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Legt `next` vast als nieuwe stand; `previous` is de stand waar undo naar teruggaat. */
export function pushHistory<T>(
  history: History<T>,
  previous: T,
  next: T,
): History<T> {
  return {
    past: [...history.past, previous].slice(-LIMIT),
    present: next,
    future: [],
  };
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...future] = history.future;
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future,
  };
}
