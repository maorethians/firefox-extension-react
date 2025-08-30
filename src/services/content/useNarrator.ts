import { create } from "zustand";
import { Narrator } from "@/services/content/Narrator.ts";

type NarratorState = {
  narrator: Narrator | null;
  setNarrator: (narrator: Narrator) => void;
};

export const useNarrator = create<NarratorState>((set) => ({
  narrator: null,
  setNarrator: (narrator: Narrator) =>
    set(() => ({
      narrator,
    })),
}));
