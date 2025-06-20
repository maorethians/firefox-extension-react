import { create } from "zustand";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";

type HunkLinesHandlerState = {
  hunkLinesHandler: HunkLinesHandler | null;
  setHunkLinesHandler: (hunkLinesHandler: HunkLinesHandler) => void;
};

export const useHunkLinesHandler = create<HunkLinesHandlerState>((set) => ({
  hunkLinesHandler: null,
  setHunkLinesHandler: (hunkLinesHandler: HunkLinesHandler) =>
    set(() => ({
      hunkLinesHandler,
    })),
}));
