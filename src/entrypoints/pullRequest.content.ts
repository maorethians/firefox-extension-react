import { UrlHelper } from "@/services/UrlHelper.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";
import { addSubjectVisualization } from "@/services/content/addSubjectVisualization.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";

export default defineContentScript({
  matches: [
    "*://github.com/*/pull/*/files*", // pull request
  ],
  main: async () => {
    const url = UrlHelper.purify(window.location.href);

    prepareStorage(url, async (hierarchy, _clusters) => {
      const nodesStore = new NodesStore(UrlHelper.getId(url), hierarchy);

      addControlPanel(url, nodesStore);
      addSubjectVisualization(nodesStore);

      const hunkLinesHandler = new HunkLinesHandler(url, nodesStore);
      await hunkLinesHandler.init();
    });
  },
});
