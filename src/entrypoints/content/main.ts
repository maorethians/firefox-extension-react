import { UrlHelper } from "@/services/UrlHelper.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";
import { RangeHandler } from "@/services/content/RangeHandler.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useRangeHandler } from "@/services/content/useRangeHandler.ts";
import { Evaluation } from "@/services/content/Evaluation.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { useNarrator } from "@/services/content/useNarrator.ts";

export const contentMain = () => {
  const url = UrlHelper.purify(window.location.href);

  addControlPanel(url);

  prepareStorage(url, async (hierarchy, _clusters) => {
    const evaluation = new Evaluation(url);
    await evaluation.populateFromStorage();

    const nodesStore = new NodesStore(url, hierarchy);
    useNodesStore.getState().setNodesStore(nodesStore);

    const narrator = new Narrator(nodesStore);
    useNarrator.getState().setNarrator(narrator);

    const hunkLinesHandler = new RangeHandler(url, nodesStore);
    await hunkLinesHandler.init();
    useRangeHandler.getState().setHunkLinesHandler(hunkLinesHandler);
  });
};
