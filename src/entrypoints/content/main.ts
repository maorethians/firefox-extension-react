import { UrlHelper } from "@/services/UrlHelper.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";
import { addSubjectVisualization } from "@/services/content/addSubjectVisualization.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";
import { useNodesStores } from "@/services/content/useNodesStores.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useHunkLinesHandler } from "@/services/content/useHunkLinesHandler.ts";

export const contentMain = () => {
  const url = UrlHelper.purify(window.location.href);

  addControlPanel(url);

  prepareStorage(url, async (hierarchy, _clusters) => {
    const nodesStore = new NodesStore(url, hierarchy);
    useNodesStores.getState().setNodesStore(url, nodesStore);

    addSubjectVisualization(url, nodesStore);

    const hunkLinesHandler = new HunkLinesHandler(url, nodesStore);
    await hunkLinesHandler.init();
    useHunkLinesHandler.getState().setHunkLinesHandler(hunkLinesHandler);
  });
};
