import { UrlHelper } from "@/services/UrlHelper.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";
import { addSubjectVisualization } from "@/services/content/addSubjectVisualization.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";
import { getNodesStore } from "@/services/content/getNodesStore.ts";
import { NODES_STORE_CACHED_MESSAGE } from "@/components/content/ControlPanel.tsx";

export const contentMain = () => {
  const url = UrlHelper.purify(window.location.href);

  addControlPanel(url);

  prepareStorage(url, async (hierarchy, _clusters) => {
    const nodesStore = getNodesStore(url, hierarchy);

    window.postMessage({
      type: NODES_STORE_CACHED_MESSAGE,
      data: { url },
    });

    addSubjectVisualization(url, nodesStore);

    const hunkLinesHandler = new HunkLinesHandler(url, nodesStore);
    await hunkLinesHandler.init();
  });
};
