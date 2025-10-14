import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/agents/Agent";
import { useNodesStore } from "../../../../useNodesStore";
import { ToolName, tools } from "../../../tools";
import { Hunk } from "../../../../graph/Hunk";

const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),
  hunk: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),

  // Internal states
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),

  // Output
  isRelated: Annotation<boolean>({
    default: () => false,
    reducer: (_, next) => next,
  }),
});

export class VerifyHunkAgent extends Agent<(typeof StateAnnotation)["spec"]> {
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
      .addNode("verify", async (state) => {
        const hunkPrompt = (
          nodesStore.getNodeById(state.hunk) as Hunk
        ).promptTemplates.base(nodesStore);
        const response = await model
          // TODO: maybe letting to fetch surroundings?
          .bindTools([tools.submitBooleanResult])
          .invoke(
            "# Change:\n\`\`\`\n" +
              hunkPrompt +
              "\n\`\`\`\n\n# Query:\n\`\`\`\n" +
              state.query +
              "\n\`\`\`\n\n# Task:\n\`\`\`\nQuery is requested by user to find its related changes within a commit. Change" +
              " is one of the changes within the commit that is found to be potentially related to the query. Your task is to" +
              " analyze the change and submit true only if you verify that it is truly related to the query.",
          );

        return {
          messages: [...state.messages, response],
        };
      })
      .addEdge(START, "verify")
      .addNode("contentAnalyzer", (state) =>
        this.extractContentToolCalls(state, [ToolName.SubmitBooleanResult]),
      )
      .addNode("tools", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;
        const toolCall = lastMessage.tool_calls![0];
        const isRelated = toolCall.args.result;
        return { isRelated };
      })
      .addConditionalEdges("verify", (state) => {
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
      .addEdge("restart", "verify")
      .addEdge("tools", END)
      .compile();
  };
}
