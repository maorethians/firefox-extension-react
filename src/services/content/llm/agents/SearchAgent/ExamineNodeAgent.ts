import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/agents/Agent";
import { useNodesStore } from "../../../useNodesStore";
import { ToolName, tools } from "../../tools";

const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),
  nodeId: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),

  // Internal states
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: (_, next) => [...next],
  }),

  // Output
  isRelated: Annotation<boolean>({
    default: () => false,
    reducer: (_, next) => next,
  }),
});

export class ExamineNodeAgent extends Agent<(typeof StateAnnotation)["spec"]> {
  constructor() {
    super();
  }

  protected getApp = (
    model: Awaited<ReturnType<(typeof LLMConfig)[ModelProvider]["client"]>>,
  ) => {
    const nodesStore = useNodesStore.getState().nodesStore!;

    if (!model) {
      return null;
    }

    return new StateGraph(StateAnnotation)
      .addNode("examineNode", async (state) => {
        const { nodeId, query } = state;

        const { node } = nodesStore.getNodeById(nodeId!);
        const response = await model
          .bindTools([tools.submitBooleanResult])
          .invoke(
            "# Query:\n\`\`\`\n" +
              query +
              "\n\`\`\`\n\n# Description:\n\`\`\`\n" +
              node.description +
              "\n\`\`\`\n\n# Task:\n\`\`\`\nThe description details a specific group of changes within a commit. Determine" +
              " whether the described changes are relevant to the query. Submit true only if you conclude that the changes" +
              " are relevant to the query.\n\`\`\`",
          );

        return {
          messages: [...state.messages, response],
        };
      })
      .addEdge(START, "examineNode")
      .addNode("tools", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;
        const toolCall = lastMessage.tool_calls![0];
        return { isRelated: toolCall.args.result };
      })
      .addNode("contentAnalyzer", (state) =>
        this.extractContentToolCalls(state, [ToolName.SubmitBooleanResult]),
      )
      .addConditionalEdges("examineNode", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "tools";
        }

        return "contentAnalyzer";
      })
      .addNode("restart", (state) => {
        return { messages: state.messages.slice(0, -1) };
      })
      .addConditionalEdges("contentAnalyzer", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "tools";
        }

        return "restart";
      })
      .addEdge("restart", "examineNode")
      .addEdge("tools", END)
      .compile();
  };
}
