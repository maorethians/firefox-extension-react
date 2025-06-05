import { UrlHelper } from "@/services/UrlHelper.ts";

export const PREPARE_COMMIT_HIERARCHY_MESSAGE = "PrepareCommitHierarchy";

export default defineContentScript({
  // login is split and logout is merged
  matches: [
    "*://github.com/*/commit/*", // commit
    "*://github.com/*/pull/*/commits/*", // pull request commit
  ],
  main: async () => {
    const url = UrlHelper.purify(window.location.href);

    browser.runtime.sendMessage({
      action: PREPARE_COMMIT_HIERARCHY_MESSAGE,
      url,
    });
  },
});
