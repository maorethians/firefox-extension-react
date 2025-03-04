import { storage } from "wxt/storage";
import { Commit } from "@/types";
import { COMMIT_STORAGE_KEY } from "@/components/UploadDirectory.tsx";
import { addSubjectVisualization } from "@/services/content/addSubjectVisualization.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";

export default defineContentScript({
  matches: [
    "*://github.com/*/commit/*",
    "*://github.com/*/pull/*/commits/*",
    "*://*.github.com/*/commit/*",
    "*://*.github.com/*/pull/*/commits/*",
  ],
  main: async () => {
    const commit: Commit | null = await storage.getItem(COMMIT_STORAGE_KEY);
    // storage.watch<FileWithContent[]>(COMMIT_STORAGE_KEY, handleFiles);
    if (!commit) {
      return;
    }

    addSubjectVisualization(commit);

    const hunkLinesHandler = new HunkLinesHandler(commit);
    await hunkLinesHandler.init();
  },
});
