import { StorageItemKey } from "@wxt-dev/storage";

export class StorageKey {
  static hierarchy = (id: string): StorageItemKey =>
    `local:changeNarrator:hierarchy:${id}`;

  static clusters = (id: string): StorageItemKey =>
    `local:changeNarrator:clusters:${id}`;
}
