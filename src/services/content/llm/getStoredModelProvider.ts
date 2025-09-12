import { StorageItemKey } from "@wxt-dev/storage";
import { ModelProvider } from "@/services/content/llm/LLMConfig.ts";

export const MODEL_PROVIDER_STORAGE_KEY: StorageItemKey =
  "local:changeNarrator:modelProvider";

export const defaultModelProvider = Object.values(ModelProvider)[0];

export const getStoredModelProvider = async () => {
  const storedModelProvider = await storage.getItem(MODEL_PROVIDER_STORAGE_KEY);
  return typeof storedModelProvider !== "string" ||
    !Object.keys(ModelProvider).includes(storedModelProvider)
    ? null
    : (storedModelProvider as ModelProvider);
};
