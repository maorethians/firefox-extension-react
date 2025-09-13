import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { StructuredToolInterface } from "@langchain/core/tools";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import {
  defaultModelProvider,
  getStoredModelProvider,
} from "@/services/content/llm/getStoredModelProvider.ts";
import {
  isToolName,
  toolsArgumentsVerifier,
  toolsContentJSONRegex,
} from "@/services/content/llm/tools.ts";
import { v4 as uuidV4 } from "uuid";

export class NodeDescriptorAgent {
  private app: ReturnType<typeof this.getApp> | null = null;
  private tools: StructuredToolInterface[];

  constructor(tools?: StructuredToolInterface[]) {
    this.tools = tools ?? [];
  }

  // TODO: by implementing a caching functionality, you can make this synchronized, and bring it back to constructor
  init = async () => {
    const storedModelProvider = await getStoredModelProvider();
    const modelProvider = storedModelProvider ?? defaultModelProvider;
    const client = await LLMConfig[modelProvider].client();
    this.app = this.getApp(client);
  };

  private getApp = (
    model: Awaited<ReturnType<(typeof LLMConfig)[ModelProvider]["client"]>>,
  ) => {
    if (!model) {
      return null;
    }

    const StateAnnotation = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        default: () => [],
        reducer: (_, next) => [...next],
      }),
    });
    return (
      new StateGraph(StateAnnotation)
        .addNode("descriptor", async (state) => {
          const modelWithTools =
            this.tools.length > 0 ? model.bindTools(this.tools) : model;
          const responseMessage = await modelWithTools?.invoke(state.messages);

          console.log(state.messages, responseMessage);
          const nextMessages = [...state.messages, responseMessage];
          return { messages: nextMessages };
        })
        .addEdge(START, "descriptor")
        .addConditionalEdges("descriptor", async (state) => {
          const lastMessage = state.messages[
            state.messages.length - 1
          ] as AIMessage;

          if (lastMessage.tool_calls?.length) {
            return "tools";
          }

          return "contentAnalyzer";
        })
        // ToolNode is default to override instead of append
        .addNode("tools", async (state) => {
          const lastMessage = state.messages[
            state.messages.length - 1
          ] as AIMessage;

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
          console.log(nextMessages);
          return { messages: nextMessages };
        })
        .addEdge("tools", "descriptor")
        .addNode("contentAnalyzer", async (state) => {
          const lastMessage = state.messages[
            state.messages.length - 1
          ] as AIMessage;
          const { content } = lastMessage;
          if (typeof content !== "string") {
            return state;
          }

          const toolJSONs = Object.values(toolsContentJSONRegex)
            .map((regex) => content.match(regex))
            .filter((matches) => matches !== null)
            .map((matches) => matches.map((match) => JSON.parse(match)))
            .flat();
          if (toolJSONs.length === 0) {
            return state;
          }

          const toolResults: {
            id: string;
            name: string;
            args: any;
            result: any;
          }[] = [];
          for (const { name: toolName, arguments: args } of toolJSONs) {
            if (!isToolName(toolName)) {
              continue;
            }

            const tool = this.tools.find((tool) => tool.name === toolName);
            if (!tool) {
              continue;
            }

            if (!toolsArgumentsVerifier[toolName](args)) {
              continue;
            }

            const toolResult = await tool.invoke(args);
            toolResults.push({
              id: uuidV4(),
              name: toolName,
              args,
              result: toolResult,
            });
          }
          if (toolResults.length === 0) {
            return state;
          }

          const nextMessages = [
            ...state.messages.slice(0, -1),
            new AIMessage({
              content: "",
              tool_calls: toolResults,
            }),
          ];
          for (const { id, name, result } of toolResults) {
            nextMessages.push(
              new ToolMessage({ tool_call_id: id, name, content: result }),
            );
          }
          console.log(nextMessages);
          return { messages: nextMessages };
        })
        .addConditionalEdges("contentAnalyzer", (state) => {
          const lastMessage = state.messages[state.messages.length - 1];
          if ((lastMessage as ToolMessage).tool_call_id) {
            return "descriptor";
          }

          return END;
        })
        .compile()
    );
  };

  invoke = async (prompt: string) => {
    console.log(prompt);
    const response = await this.app?.invoke({
      messages: [new HumanMessage(prompt)],
    });
    console.log(response);
    if (!response) {
      return "";
    }

    const lastMessage = response.messages[
      response.messages.length - 1
    ] as AIMessage;
    return lastMessage.content as string;
  };
}
