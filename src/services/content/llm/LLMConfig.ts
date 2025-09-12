import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";

export enum ModelProvider {
  ollama = "ollama",
  groq = "groq",
}

export const LLMConfig = {
  [ModelProvider.ollama]: {
    link: "https://www.reddit.com/r/LocalLLaMA/comments/1iloip9/how_to_allow_all_origins_on_reverseproxied_ollama/",
    verify: async () => {
      try {
        await new ChatOllama({
          model: "qwen2.5-coder:7b",
        }).invoke("Hi!");
        return true;
      } catch (e) {
        return false;
      }
    },
    client: async () =>
      new ChatOllama({
        model: "qwen2.5-coder:7b",
      }),
    storageKey: null,
  },
  [ModelProvider.groq]: {
    link: "https://console.groq.com/keys",
    verify: async (key: string) => {
      try {
        await new ChatGroq({
          model: "llama-3.1-8b-instant",
          apiKey: key,
        }).invoke("Hi!");
        return true;
      } catch (e) {
        return false;
      }
    },
    client: async () => {
      const key = await storage.getItem("local:changeNarrator:groq");
      if (typeof key !== "string") {
        return null;
      }

      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        apiKey: key,
      });
    },
    storageKey: "local:changeNarrator:groq" as StorageItemKey,
  },
};
