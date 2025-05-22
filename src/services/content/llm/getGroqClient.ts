import { GroqClient } from "@/services/content/llm/GroqClient.ts";

let groqClientCache: GroqClient | undefined;

export const getGroqClient = async () => {
  if (groqClientCache) {
    return groqClientCache;
  }

  // const key = await storage.getItem(API_KEY_STORAGE_KEY);
  // if (typeof key !== "string") {
  //   return;
  // }
  const key = "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";

  // const isKeyValid = await GroqClient.verifyKey(key);
  // if (!isKeyValid) {
  //   return;
  // }

  groqClientCache = new GroqClient(key);

  return groqClientCache;
};
