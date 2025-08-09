import { create } from "zustand";

export const rangeTimeouts: Record<string, NodeJS.Timeout> = {};

export type InnerTextState =
  | "highlight"
  | "strongAddition"
  | "weakAddition"
  | "strongMove"
  | "weakMove"
  | "base";

type InnerTextStateState = {
  innerTextStates: Record<string, Set<InnerTextState> | null>;
  addInnerTextState: (innerTextId: string, state: InnerTextState) => void;
  removeInnerTextState: (innerTextId: string, state: InnerTextState) => void;
  flushInnerTextState: (innerTextId: string) => void;
};

export const useInnerTextState = create<InnerTextStateState>((set) => ({
  innerTextStates: {},
  addInnerTextState: (innerTextId, state) => {
    set((s) => {
      const currentInnerTextState = new Set<InnerTextState>(
        s.innerTextStates[innerTextId] ?? [],
      );
      currentInnerTextState.add(state);

      return {
        innerTextStates: {
          ...s.innerTextStates,
          [innerTextId]: currentInnerTextState,
        },
      };
    });
  },
  removeInnerTextState: (innerTextId, state) => {
    set((s) => {
      const currentInnerTextState = new Set<InnerTextState>(
        s.innerTextStates[innerTextId] ?? [],
      );
      currentInnerTextState.delete(state);

      return {
        innerTextStates: {
          ...s.innerTextStates,
          [innerTextId]: currentInnerTextState,
        },
      };
    });
  },
  flushInnerTextState: (innerTextId: string) => {
    set((s) => ({
      innerTextStates: {
        ...s.innerTextStates,
        [innerTextId]: null,
      },
    }));
  },
}));
