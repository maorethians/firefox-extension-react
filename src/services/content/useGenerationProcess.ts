import { create } from "zustand";

type GenerationProcessState = {
  generationProcess: Record<string, boolean>;
  setGenerationProcess: (subjectId: string, state: boolean) => void;
};

export const useGenerationProcess = create<GenerationProcessState>((set) => ({
  generationProcess: {},
  setGenerationProcess: (subjectId, processState) =>
    set((state) => ({
      generationProcess: {
        ...state.generationProcess,
        [subjectId]: processState,
      },
    })),
}));
