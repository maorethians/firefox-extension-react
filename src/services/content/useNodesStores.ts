import { NodesStore } from "@/services/content/NodesStore.ts";
import { create } from "zustand";

type NodesStoresState = {
  nodesStores: Record<string, NodesStore>;
  setNodesStore: (url: string, nodesStore: NodesStore) => void;
};

export const useNodesStores = create<NodesStoresState>((set) => ({
  nodesStores: {},
  setNodesStore: (url: string, nodesStore: NodesStore) =>
    set((state) => ({
      nodesStores: { ...state.nodesStores, [url]: nodesStore },
    })),
}));
