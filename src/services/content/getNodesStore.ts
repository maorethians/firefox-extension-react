import { Hierarchy } from "@/types";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { UrlHelper } from "@/services/UrlHelper.ts";

const cache: Record<string, NodesStore> = {};

export const getNodesStore = (url: string, hierarchy: Hierarchy) => {
  const cachedNodesStore = getCachedNodesStore(url);
  if (cachedNodesStore) {
    return cachedNodesStore;
  }

  const nodesStore = new NodesStore(url, hierarchy);
  cache[UrlHelper.getId(url)] = nodesStore;

  return nodesStore;
};

export const getCachedNodesStore = (url: string): NodesStore | undefined => {
  const id = UrlHelper.getId(url);
  return cache[id];
};
