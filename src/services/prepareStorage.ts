import { Cluster, StorageData } from "@/types";
import { PREPARE_MESSAGE } from "@/entrypoints/background.ts";
import { StorageKey } from "@/services/StorageKey.ts";

export const prepareStorage = async (
  url: string,
  onPrepare: (storageData: StorageData, clusters: Cluster[]) => Promise<void>,
) => {
  const [storageHierarchy, storageClusters] = await Promise.all([
    storage.getItem(StorageKey.hierarchy(url)),
    storage.getItem(StorageKey.clusters(url)),
  ]);
  if (storageHierarchy && storageClusters) {
    return onPrepare(
      storageHierarchy as StorageData,
      storageClusters as Cluster[],
    );
  }

  const response = await browser.runtime.sendMessage({
    action: PREPARE_MESSAGE,
    url,
  });
  if (response && response.hierarchy && response.clusters) {
    const { hierarchy, clusters } = response;

    await storage.setItem(StorageKey.hierarchy(url), hierarchy);
    await storage.setItem(StorageKey.clusters(url), clusters);

    await onPrepare(hierarchy, clusters);
  }
};
