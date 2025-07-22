import { StorageItemKey } from "@wxt-dev/storage";
import { UrlHelper } from "@/services/UrlHelper.ts";

export class StorageKey {
  static hierarchy = (url: string): StorageItemKey => {
    const id = UrlHelper.getId(url);
    return `local:changeNarrator:hierarchy:${id}`;
  };

  static clusters = (url: string): StorageItemKey => {
    const id = UrlHelper.getId(url);
    return `local:changeNarrator:clusters:${id}`;
  };
}
