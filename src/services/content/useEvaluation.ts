import { create } from "zustand";

export type Eval = "positive" | "negative";
export type StorageEvaluation = Record<string, Eval>;

type EvaluationState = {
  evaluation: StorageEvaluation;
  setEvaluation: (evaluation: StorageEvaluation) => void;
  evalNode: (id: string, value: Eval) => void;
};

export const useEvaluation = create<EvaluationState>((set) => ({
  evaluation: {},
  setEvaluation: (evaluation: StorageEvaluation) =>
    set(() => ({
      evaluation,
    })),
  evalNode: (id: string, value: Eval) =>
    set((state) => ({ evaluation: { ...state.evaluation, [id]: value } })),
}));
