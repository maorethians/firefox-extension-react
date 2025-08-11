import { getLLMClient } from "@/services/content/llm/getLLMClient.ts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredToolInterface } from "@langchain/core/tools";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";

export class LLMClient {
  model: BaseChatModel;

  constructor(modelProvider: ModelProvider, key: string) {
    this.model = LLMConfig[modelProvider].client(key);
  }

  private async stream(prompt: string, tool?: StructuredToolInterface) {
    try {
      if (!tool) {
        return this.model.stream(prompt);
      }

      const tools = [tool];
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
    } catch (e) {
      return;
    }
  }

  static async stream(prompt: string, tool?: StructuredToolInterface) {
    console.log(prompt);
    console.log(tool);
    const client = await getLLMClient();
    if (!client) {
      return;
    }

    return client.stream(prompt, tool);
  }
}
