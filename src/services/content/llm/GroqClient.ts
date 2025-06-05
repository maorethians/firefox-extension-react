import { ChatGroq } from "@langchain/groq";
import { getGroqClient } from "@/services/content/llm/getGroqClient.ts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredToolInterface } from "@langchain/core/tools";

export class GroqClient {
  model: ChatGroq;

  constructor(key: string) {
    this.model = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: key,
    });
  }

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

  async stream(prompt: string, tools?: StructuredToolInterface[]) {
    try {
      if (tools) {
        const agent = createToolCallingAgent({
          llm: this.model,
          prompt: ChatPromptTemplate.fromMessages([
            // prompt contains code which may collide with LangChain prompt template engine
            ["system", "{prompt}"],
            ["placeholder", "{agent_scratchpad}"],
          ]),
          tools,
        });
        const executor = new AgentExecutor({ agent, tools });
        return executor.stream({ prompt });
      }

      return this.model.stream(prompt);
    } catch (e) {
      return;
    }
  }

  static async stream(prompt: string, tools?: StructuredToolInterface[]) {
    const groqClient = await getGroqClient();
    if (!groqClient) {
      return;
    }

    return groqClient.stream(prompt, tools);
  }
}
