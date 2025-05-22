import { ChatGroq } from "@langchain/groq";
import { getGroqClient } from "@/services/content/llm/getGroqClient.ts";

export class GroqClient {
  model: ChatGroq;

  constructor(key: string) {
    this.model = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: key,
    });
  }

  static verifyKey = async (key: string): Promise<boolean> => {
    try {
      await new ChatGroq({
        model: "llama3-8b-8192",
        apiKey: key,
      }).invoke("Hi!");
      return true;
    } catch (e) {
      return false;
    }
  };

  async generate(prompt: string): Promise<string | undefined> {
    const result = await this.model.invoke(prompt);

    try {
      if (typeof result.content === "string") {
        return result.content;
      }
    } catch (e) {}
  }

  static async generate(prompt: string): Promise<string | undefined> {
    const groqClient = await getGroqClient();
    if (!groqClient) {
      return;
    }

    return groqClient.generate(prompt);
  }

  async stream(prompt: string) {
    return this.model.stream(prompt);
  }

  static async stream(prompt: string) {
    console.log(prompt);
    const groqClient = await getGroqClient();
    if (!groqClient) {
      return;
    }

    return groqClient.stream(prompt);
  }
}
