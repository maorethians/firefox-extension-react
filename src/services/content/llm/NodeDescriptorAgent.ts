import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { StructuredToolInterface } from "@langchain/core/tools";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { ToolName } from "@/services/content/llm/tools.ts";
import { Agent } from "@/services/content/llm/Agent.ts";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: (_, next) => [...next],
  }),
  response: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),
});

export class NodeDescriptorAgent extends Agent<
  (typeof StateAnnotation)["spec"]
> {
  constructor(tools?: StructuredToolInterface[]) {
    super();
    this.tools = tools ?? [];
  }

  protected getApp = (
    model: Awaited<ReturnType<(typeof LLMConfig)[ModelProvider]["client"]>>,
  ) => {
    if (!model) {
      return null;
    }

    return new StateGraph(StateAnnotation)
      .addNode("descriptor", async (state) => {
        const modelWithTools =
          this.tools.length > 0 ? model.bindTools(this.tools) : model;
        const responseMessage = await modelWithTools.invoke(state.messages);
        return { messages: [...state.messages, responseMessage] };
      })
      .addEdge(START, "descriptor")
      .addNode("tools", this.ToolNode)
      .addEdge("tools", "descriptor")
      .addNode("contentAnalyzer", (state) =>
        this.extractContentToolCalls(state, [ToolName.FetchCodeSurroundings]),
      )
      .addConditionalEdges("descriptor", async (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "tools";
        }

        return "contentAnalyzer";
      })
      .addNode("respond", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;
        return { response: lastMessage.content as string };
      })
      .addEdge("respond", END)
      .addConditionalEdges("contentAnalyzer", (state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if ((lastMessage as ToolMessage).tool_call_id) {
          return "descriptor";
        }

        return "respond";
      })
      .compile();
  };
}
