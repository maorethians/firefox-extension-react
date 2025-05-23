import { StorageItemKey } from "@wxt-dev/storage";
import { getCommitSha } from "@/services/getCommitSha.ts";

export class StorageKey {
  static getWithUrl(url: string): StorageItemKey {
    const sha = getCommitSha(url);
    return this.getWithSha(sha);
  }

  static getWithSha(sha: string): StorageItemKey {
    return `local:changeNarrator:commit:${sha}`;
  }
}
