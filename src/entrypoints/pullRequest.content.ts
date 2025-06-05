import { UrlHelper } from "@/services/UrlHelper.ts";

export const PREPARE_PR_HIERARCHY_MESSAGE = "PreparePRHierarchy";

export default defineContentScript({
  // login is split and logout is merged
  matches: [
    "*://github.com/*/pull/*/files", // pull request
  ],
  main: async () => {
    const url = UrlHelper.purify(window.location.href);

    browser.runtime.sendMessage({
      action: PREPARE_PR_HIERARCHY_MESSAGE,
      url,
    });
  },
});
