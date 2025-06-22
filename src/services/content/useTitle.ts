import { create } from "zustand";

type TitleState = {
  title: Record<string, string>;
  setTitle: (subjectId: string, title: string) => void;
};

export const useTitle = create<TitleState>((set) => ({
  title: {},
  setTitle: (subjectId, title) =>
    set((state) => ({
      title: { ...state.title, [subjectId]: title },
    })),
}));
