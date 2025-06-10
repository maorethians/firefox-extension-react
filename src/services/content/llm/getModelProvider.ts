import { StorageItemKey } from "@wxt-dev/storage";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";

export const MODEL_PROVIDER_STORAGE_KEY: StorageItemKey =
  "local:changeNarrator:modelProvider";

export const defaultModelProvider = Object.keys(LLMConfig)[0] as ModelProvider;

export const getModelProvider = async () => {
  const storageModelProvider = await storage.getItem(
    MODEL_PROVIDER_STORAGE_KEY,
  );
  if (typeof storageModelProvider !== "string") {
    return defaultModelProvider;
  }

  return storageModelProvider as ModelProvider;
};
