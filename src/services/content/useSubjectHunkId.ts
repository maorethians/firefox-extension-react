import { create } from "zustand";

type SubjectHunkIdState = {
  hunkId: string | null;
  setHunkId: (hunkId: string | null) => void;
};

export const useSubjectHunkId = create<SubjectHunkIdState>((set) => ({
  hunkId: null,
  setHunkId: (hunkId: string | null) => {
    set(() => ({
      hunkId,
    }));
  },
}));
