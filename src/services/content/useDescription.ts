import { create } from "zustand";

type DescriptionState = {
  description: Record<string, string>;
  setDescription: (subjectId: string, description: string) => void;
};

export const useDescription = create<DescriptionState>((set) => ({
  description: {},
  setDescription: (subjectId, description) =>
    set((state) => ({
      description: { ...state.description, [subjectId]: description },
    })),
}));
