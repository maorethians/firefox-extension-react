import { storage } from "wxt/storage";
import { Commit } from "@/types";
import { addSubjectVisualization } from "@/services/content/addSubjectVisualization.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { StorageKey } from "@/services/StorageKey.ts";

export default defineContentScript({
  matches: [
    "*://github.com/*/commit/*",
    "*://github.com/*/pull/*/commits/*",
    "*://*.github.com/*/commit/*",
    "*://*.github.com/*/pull/*/commits/*",
  ],
  main: async () => {
    const url = window.location.href;
    const commit: Commit | null = await storage.getItem(
      StorageKey.getWithUrl(url),
    );
    // storage.watch<FileWithContent[]>(COMMIT_STORAGE_KEY, handleFiles);
    if (!commit) {
      return;
    }

    const nodesStore = new NodesStore(commit);

    addControlPanel(commit.url, nodesStore);
    addSubjectVisualization(nodesStore);

    const hunkLinesHandler = new HunkLinesHandler(nodesStore);
    await hunkLinesHandler.init();
  },
});
