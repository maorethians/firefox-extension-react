import { StorageItemKey } from "@wxt-dev/storage";
import { ChatGroq } from "@langchain/groq";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type ModelProvider = "groq";

export const LLMConfig: Record<
  ModelProvider,
  {
    link: string;
    storageKey: StorageItemKey;
    verify: (key: string) => Promise<boolean>;
    client: (key: string) => BaseChatModel;
  }
> = {
  groq: {
    link: "https://console.groq.com/keys",
    storageKey: "local:changeNarrator:groq",
    verify: async (key) => {
      try {
        await new ChatGroq({
          model: "llama-3.1-8b-instant",
          apiKey: key,
        }).invoke("Hi!");
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    },
    client: (key) =>
      new ChatGroq({
        model: "llama-3.3-70b-versatile",
        apiKey: key,
      }),
  },
};
