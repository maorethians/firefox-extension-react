import { StorageItemKey } from "@wxt-dev/storage";

export const getStorageKey = (url: string): StorageItemKey => {
  const match = url.match(/\/(?:commit|commits)\/([a-f0-9]{7,40})/);
  const sha = match ? match[1] : null;
  if (!sha) {
    throw new Error("Invalid url");
  }

  return `local:changeNarrator:commit:${sha}`;
};
