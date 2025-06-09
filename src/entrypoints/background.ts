import { ContainerClient } from "@/services/ContainerClient.ts";

export const OPEN_TAB_MESSAGE = "OpenTab";
export const PREPARE_MESSAGE = "PrepareCommitClusters";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === OPEN_TAB_MESSAGE) {
      browser.tabs.create({ url: message.url });
    }
  });

  browser.runtime.onMessage.addListener(
    ({ action, url }, _sender, sendResponse) => {
      if (action !== PREPARE_MESSAGE) {
        return;
      }

      (async () => {
        const clusters = await ContainerClient.getClusters(url);
        if (!clusters) {
          sendResponse();
          return;
        }

        const hierarchy = await ContainerClient.getHierarchy(url);
        if (!hierarchy) {
          sendResponse();
          return;
        }

        sendResponse({ hierarchy, clusters });
      })();

      return true;
    },
  );
});
