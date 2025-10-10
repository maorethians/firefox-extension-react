import { UrlHelper } from "@/services/UrlHelper.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";
import { Evaluation } from "@/services/content/Evaluation.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { useNarrator } from "@/services/content/useNarrator.ts";
import { RangeHandler } from "@/services/content/RangeHandler.ts";
import { useRangeHandler } from "@/services/content/useRangeHandler.ts";

const commitPatternStr = "*://github.com/*/commit/*";
const commitPattern = new MatchPattern(commitPatternStr);
const prCommitPatternStr = "*://github.com/*/pull/*/commits/*";
const prCommitPattern = new MatchPattern(prCommitPatternStr);
const pullRequestPatternStr = "*://github.com/*/pull/*/files*";
const pullRequestPattern = new MatchPattern(pullRequestPatternStr);

export default defineContentScript({
  matches: [commitPatternStr, prCommitPatternStr, pullRequestPatternStr],
  main: (ctx) => {
    main();

    // ctx.addEventListener(window, "wxt:locationchange", ({ newUrl }) => {
    //   if (
    //     commitPattern.includes(newUrl) ||
    //     prCommitPattern.includes(newUrl) ||
    //     pullRequestPattern.includes(newUrl)
    //   ) {
    //     main();
    //   }
    // });
  },
});

const main = () => {
  const url = UrlHelper.purify(window.location.href);

  addControlPanel(url);

  prepareStorage(url, async (storageData, _clusters) => {
    const evaluation = new Evaluation(url);
    await evaluation.populateFromStorage();

    const nodesStore = new NodesStore(url, storageData);
    useNodesStore.getState().setNodesStore(nodesStore);

    const narrator = new Narrator(nodesStore);
    useNarrator.getState().setNarrator(narrator);

    const hunkLinesHandler = new RangeHandler(url, nodesStore);
    await hunkLinesHandler.init();
    useRangeHandler.getState().setHunkLinesHandler(hunkLinesHandler);
  });
};
