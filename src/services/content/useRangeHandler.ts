import { create } from "zustand";
import { RangeHandler } from "@/services/content/RangeHandler.ts";

type HunkLinesHandlerState = {
  rangeHandler: RangeHandler | null;
  setHunkLinesHandler: (hunkLinesHandler: RangeHandler) => void;
};

export const useRangeHandler = create<HunkLinesHandlerState>((set) => ({
  rangeHandler: null,
  setHunkLinesHandler: (rangeHandler: RangeHandler) =>
    set(() => ({
      rangeHandler,
    })),
}));
