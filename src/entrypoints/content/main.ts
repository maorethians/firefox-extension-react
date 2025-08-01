import { UrlHelper } from "@/services/UrlHelper.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useHunkLinesHandler } from "@/services/content/useHunkLinesHandler.ts";
import { Evaluation } from "@/services/content/Evaluation.ts";

export const contentMain = () => {
  const url = UrlHelper.purify(window.location.href);

  addControlPanel(url);

  prepareStorage(url, async (hierarchy, _clusters) => {
    const evaluation = new Evaluation(url);
    await evaluation.populateFromStorage();

    const nodesStore = new NodesStore(url, hierarchy);
    useNodesStore.getState().setNodesStore(nodesStore);

    const hunkLinesHandler = new HunkLinesHandler(url, nodesStore);
    await hunkLinesHandler.init();
    useHunkLinesHandler.getState().setHunkLinesHandler(hunkLinesHandler);
  });
};
