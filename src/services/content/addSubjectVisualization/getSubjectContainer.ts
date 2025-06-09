// TODO: support
import { UrlHelper } from "@/services/UrlHelper.ts";

export const getSubjectContainer = (url: string) => {
  if (UrlHelper.isCommit(url)) {
    return document.querySelector("[class*='commit-message-container']");
  }

  if (UrlHelper.isPRCommit(url) || UrlHelper.isPullRequest(url)) {
    return document.getElementById("partial-discussion-header");
  }
};
