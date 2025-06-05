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
  const key =
    "xai-4kSEUTlj9UXtVb8QmpGFvQVH5n6WiA8tnfH5laTfSy85eOakQzsorfT636bshgHuhjd4GvpFPZIoMitP";

  // const isKeyValid = await GroqClient.verifyKey(key);
  // if (!isKeyValid) {
  //   return;
  // }

  groqClientCache = new GroqClient(key);

  return groqClientCache;
};
