import { ContainerClient } from "@/services/ContainerClient.ts";
import { UrlHelper } from "@/services/UrlHelper.ts";
import { StorageKey } from "@/services/StorageKey.ts";

export const OPEN_TAB_MESSAGE = "OpenTab";
export const PREPARE_MESSAGE = "PrepareCommitClusters";
export const PREPARED_MESSAGE = "PreparedCommitClusters";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === OPEN_TAB_MESSAGE) {
      browser.tabs.create({ url: message.url });
    }
  });

  browser.runtime.onMessage.addListener(async ({ action, url }) => {
    if (action !== PREPARE_MESSAGE) {
      return;
    }

    const clusters = await ContainerClient.getClusters(url);
    if (!clusters) {
      return;
    }
    await storage.setItem(StorageKey.clusters(UrlHelper.getId(url)), clusters);

    const hierarchy = await ContainerClient.getHierarchy(url);
    if (!hierarchy) {
      return;
    }
    await storage.setItem(
      StorageKey.hierarchy(UrlHelper.getId(url)),
      hierarchy,
    );

    browser.runtime.sendMessage({
      action: PREPARED_MESSAGE,
      url,
    });
  });
});
