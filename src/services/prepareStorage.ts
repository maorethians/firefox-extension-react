import { Cluster, Hierarchy } from "@/types";
import { UrlHelper } from "@/services/UrlHelper.ts";
import { StorageKey } from "@/services/StorageKey.ts";
import { PREPARE_MESSAGE, PREPARED_MESSAGE } from "@/entrypoints/background.ts";

export const prepareStorage = (
  url: string,
  onPrepare: (hierarchy: Hierarchy, clusters: Cluster[]) => void,
) => {
  browser.runtime.sendMessage({
    action: PREPARE_MESSAGE,
    url,
  });

  browser.runtime.onMessage.addListener(async (message) => {
    if (message.action !== PREPARED_MESSAGE || message.url !== url) {
      return;
    }

    const hierarchy = await storage.getItem(
      StorageKey.hierarchy(UrlHelper.getId(url)),
    );
    const clusters = await storage.getItem(
      StorageKey.clusters(UrlHelper.getId(url)),
    );
    onPrepare(hierarchy as Hierarchy, clusters as Cluster[]);
  });
};
