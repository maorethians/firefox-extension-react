import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { getModelProvider } from "@/services/content/llm/getModelProvider.ts";

const clientsCache: Record<ModelProvider, LLMClient | undefined> = {
  groq: undefined,
};

export const getLLMClient = async () => {
  const modelProvider = await getModelProvider();

  const cachedClient = clientsCache[modelProvider];
  if (cachedClient) {
    return cachedClient;
  }

  const key = await storage.getItem(LLMConfig[modelProvider].storageKey);
  if (typeof key !== "string") {
    return;
  }

  clientsCache[modelProvider] = new LLMClient(modelProvider, key);

  return clientsCache[modelProvider];
};
