import {
  BinaryOperatorAggregate,
  CompiledStateGraph,
  StateType,
} from "@langchain/langgraph/web";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import {
  defaultModelProvider,
  getStoredModelProvider,
} from "@/services/content/llm/getStoredModelProvider.ts";
import {
  ToolName,
  toolsContentJSONRegex,
  verifyToolsArguments,
} from "@/services/content/llm/tools.ts";
import { v4 as uuidV4 } from "uuid";
import { StructuredToolInterface } from "@langchain/core/tools";

export abstract class Agent<TState extends StateType<any>> {
  private app: ReturnType<typeof this.getApp> | null = null;
  protected tools: StructuredToolInterface[] = [];

  // TODO: by implementing a caching functionality, you can make this synchronized, and bring it back to constructor
  init = async () => {
    const storedModelProvider = await getStoredModelProvider();
    const modelProvider = storedModelProvider ?? defaultModelProvider;
    const client = await LLMConfig[modelProvider].client();
    this.app = this.getApp(client);
  };

  protected abstract getApp(
    model: Awaited<ReturnType<(typeof LLMConfig)[ModelProvider]["client"]>>,
  ): CompiledStateGraph<any, any, any, any, TState> | null;

  async invoke(input: Parameters<NonNullable<typeof this.app>["invoke"]>[0]) {
    const response = await this.app?.invoke(input);
    if (!response) {
      throw new Error("Agent not initialized");
    }

    console.log(response);
    return response;
  }

  protected extractContentToolCalls = (
    state: StateType<{
      messages: BinaryOperatorAggregate<BaseMessage[], BaseMessage[]>;
    }>,
    toolNames: ToolName[],
  ) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const { content } = lastMessage;
    if (typeof content !== "string") {
      return state;
    }

    const toolCallRegexes = toolNames.map(
      (toolName) => toolsContentJSONRegex[toolName],
    );
    const toolCalls = toolCallRegexes
      .map((regex) => content.match(regex))
      .filter((matches) => matches !== null)
      .map((matches) => matches.map((match) => JSON.parse(match)))
      .flat();
    if (toolCalls.length === 0) {
      return state;
    }

    const tool_calls: {
      id: string;
      name: string;
      args: any;
    }[] = [];
    for (const { name: toolName, arguments: args } of toolCalls) {
      if (!toolNames.includes(toolName)) {
        continue;
      }

      if (!verifyToolsArguments(toolName)(args)) {
        continue;
      }

      tool_calls.push({
        id: uuidV4(),
        name: toolName,
        args,
      });
    }
    if (tool_calls.length === 0) {
      return state;
    }

    return {
      messages: [
        ...state.messages.slice(0, -1),
        new AIMessage({
          content: "",
          tool_calls,
        }),
      ],
    };
  };

  protected ToolNode = async (state: StateType<TState>) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    const toolResults: {
      id: string;
      name: string;
      args: any;
      result: any;
    }[] = [];
    for (const { id, name: toolName, args } of lastMessage.tool_calls!) {
      const tool = this.tools.find((tool) => tool.name === toolName)!;
      const toolResult = await tool.invoke(args);
      toolResults.push({
        id: id!,
        name: toolName,
        args,
        result: toolResult,
      });
    }

    const nextMessages = [...state.messages];
    for (const { id, name, result } of toolResults) {
      nextMessages.push(
        new ToolMessage({ tool_call_id: id, name, content: result }),
      );
    }
    return { messages: nextMessages };
  };
}
