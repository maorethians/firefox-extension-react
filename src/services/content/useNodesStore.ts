import { NodesStore } from "@/services/content/NodesStore.ts";
import { create } from "zustand";

type NodesStoreState = {
  nodesStore: NodesStore | null;
  setNodesStore: (nodesStore: NodesStore) => void;
};

export const useNodesStore = create<NodesStoreState>((set) => ({
  nodesStore: null,
  setNodesStore: (nodesStore: NodesStore) =>
    set(() => ({
      nodesStore,
    })),
}));
