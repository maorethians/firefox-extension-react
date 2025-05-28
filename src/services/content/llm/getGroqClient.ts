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
