import { create } from "zustand";

export const hunkHighlightTimeoutIds: Record<string, NodeJS.Timeout> = {};

type HunkHighlightState = {
  hunkHighlight: Record<string, boolean>;
  setHunkHighlight: (hunkId: string, state: boolean) => void;
};

export const useHunkHighlight = create<HunkHighlightState>((set) => ({
  hunkHighlight: {},
  setHunkHighlight: (hunkId, highlightState) => {
    const timeoutId = hunkHighlightTimeoutIds[hunkId];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete hunkHighlightTimeoutIds[hunkId];
    }

    set((state) => ({
      hunkHighlight: {
        ...state.hunkHighlight,
        [hunkId]: highlightState,
      },
    }));
  },
}));
