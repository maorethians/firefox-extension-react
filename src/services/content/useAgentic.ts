import { create } from "zustand";

type AgenticState = {
  isAgentic: boolean;
  setAgentic: (isAgentic: boolean) => void;
};

export const useAgentic = create<AgenticState>((set) => ({
  isAgentic: true,
  setAgentic: (isAgentic: boolean) => {
    set(() => ({
      isAgentic,
    }));
  },
}));
