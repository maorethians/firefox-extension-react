import { create } from "zustand";

type StoryGranularityState = {
  storyGranularity: number;
  setGranularity: (index: number) => void;
};

export const useStoryGranularity = create<StoryGranularityState>((set) => ({
  storyGranularity: 5,
  setGranularity: (granularity: number) => {
    set(() => {
      return {
        storyGranularity: granularity,
      };
    });
  },
}));
