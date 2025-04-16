import { storage } from "wxt/storage";
import { Commit } from "@/types";
import { addSubjectVisualization } from "@/services/content/addSubjectVisualization.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";
import { getStorageKey } from "@/services/getStorageKey.ts";
import { addControlPanel } from "@/services/content/addControlPanel.ts";

export default defineContentScript({
  matches: [
    "*://github.com/*/commit/*",
    "*://github.com/*/pull/*/commits/*",
    "*://*.github.com/*/commit/*",
    "*://*.github.com/*/pull/*/commits/*",
  ],
  main: async () => {
    const url = window.location.href;
    const commit: Commit | null = await storage.getItem(getStorageKey(url));
    // storage.watch<FileWithContent[]>(COMMIT_STORAGE_KEY, handleFiles);
    if (!commit) {
      return;
    }

    addControlPanel(commit);
    addSubjectVisualization(commit);

    const hunkLinesHandler = new HunkLinesHandler(commit);
    await hunkLinesHandler.init();
  },
});
