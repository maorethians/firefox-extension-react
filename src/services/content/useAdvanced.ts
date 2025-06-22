import { create } from "zustand";

type AdvancedState = {
  isAdvanced: boolean;
  setAdvanced: (isAdvanced: boolean) => void;
};

export const useAdvanced = create<AdvancedState>((set) => ({
  isAdvanced: false,
  setAdvanced: (isAdvanced: boolean) => {
    set(() => ({
      isAdvanced,
    }));
  },
}));
