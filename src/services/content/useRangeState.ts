import { create } from "zustand";

export const rangeTimeouts: Record<string, NodeJS.Timeout> = {};

export type RangeState =
  | "highlight"
  | "strongAddition"
  | "weakAddition"
  | "strongMove"
  | "weakMove"
  | "base";

const stateOverride: Record<RangeState, RangeState[]> = {
  strongAddition: ["weakAddition", "strongMove", "weakMove"],
  weakAddition: ["strongAddition", "strongMove", "weakMove"],
  strongMove: ["strongAddition", "weakAddition", "weakMove"],
  weakMove: ["strongAddition", "weakAddition", "strongMove"],
  highlight: [],
  base: [],
};

type RangeStateState = {
  rangeStates: Record<string, RangeState[]>;
  addRangeState: (rangeId: string, state: RangeState) => void;
  removeRangeState: (rangeId: string, state: RangeState) => void;
  flushRangeState: () => void;
};

export const useRangeState = create<RangeStateState>((set) => ({
  rangeStates: {},
  addRangeState: (rangeId, state) => {
    set((s) => {
      if (state === "highlight") {
        const availableTimeout = rangeTimeouts[rangeId];
        if (availableTimeout) {
          clearTimeout(availableTimeout);
          delete rangeTimeouts[rangeId];
        }
      }

      const override = stateOverride[state];
      const currentRangeState = s.rangeStates[rangeId] ?? [];
      const newRangeState = [
        ...currentRangeState.filter(
          (st) => st !== state && !override.includes(st),
        ),
        state,
      ];

      return {
        rangeStates: {
          ...s.rangeStates,
          [rangeId]: newRangeState,
        },
      };
    });
  },
  removeRangeState: (rangeId, state) => {
    set((s) => {
      const currentRangeState = s.rangeStates[rangeId] ?? [];
      const newRangeState = currentRangeState.filter((st) => st !== state);

      return {
        rangeStates: {
          ...s.rangeStates,
          [rangeId]: newRangeState,
        },
      };
    });
  },
  flushRangeState: () => {
    set(() => {
      return {
        rangeStates: {},
      };
    });
  },
}));
