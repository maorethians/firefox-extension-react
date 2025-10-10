import { create } from "zustand";

type SearchQueryState = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export const useSearchQuery = create<SearchQueryState>((set) => ({
  searchQuery: "",
  setSearchQuery: (query: string) =>
    set(() => ({
      searchQuery: query,
    })),
}));
