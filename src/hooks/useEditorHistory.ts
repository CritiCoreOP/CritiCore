import { useCallback, useRef, useState } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

const LIMIT = 60;

/**
 * Undo/redo state container. `set` commits a new history entry, while
 * `setTransient` mutates the present without polluting the stack (used while
 * dragging); call `commit()` once the interaction settles.
 */
export function useEditorHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });
  const pendingBase = useRef<T | null>(null);

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    setState((h) => {
      const next = typeof updater === "function" ? (updater as (p: T) => T)(h.present) : updater;
      if (next === h.present) return h;
      return {
        past: [...h.past, h.present].slice(-LIMIT),
        present: next,
        future: [],
      };
    });
  }, []);

  const setTransient = useCallback((updater: T | ((prev: T) => T)) => {
    setState((h) => {
      if (pendingBase.current === null) pendingBase.current = h.present;
      const next = typeof updater === "function" ? (updater as (p: T) => T)(h.present) : updater;
      return { ...h, present: next, future: [] };
    });
  }, []);

  const commit = useCallback(() => {
    const base = pendingBase.current;
    pendingBase.current = null;
    if (base === null) return;
    setState((h) => (base === h.present ? h : { past: [...h.past, base].slice(-LIMIT), present: h.present, future: [] }));
  }, []);

  const undo = useCallback(() => {
    setState((h) => {
      if (!h.past.length) return h;
      const previous = h.past[h.past.length - 1];
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future].slice(0, LIMIT) };
    });
  }, []);

  const redo = useCallback(() => {
    setState((h) => {
      if (!h.future.length) return h;
      const [next, ...rest] = h.future;
      return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: rest };
    });
  }, []);

  const reset = useCallback((value: T) => {
    pendingBase.current = null;
    setState({ past: [], present: value, future: [] });
  }, []);

  return {
    state: state.present,
    set,
    setTransient,
    commit,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
