import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { ToolName, tools } from "@/services/content/llm/tools.ts";
import { Agent } from "@/services/content/llm/agents/Agent";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: (_, next) => [...next],
  }),
  statemets: Annotation<string[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),
});

export class MessageStatementsAgent extends Agent<
  (typeof StateAnnotation)["spec"]
> {
  tools = [tools.submitStatements];

  constructor() {
    super();
  }

  protected getApp = (
    model: Awaited<ReturnType<(typeof LLMConfig)[ModelProvider]["client"]>>,
  ) => {
    if (!model) {
      return null;
    }

    return new StateGraph(StateAnnotation)
      .addNode("statementExtractor", async (state) => {
        const responseMessage = await model
          .bindTools(this.tools)
          .invoke(state.messages);
        return { messages: [...state.messages, responseMessage] };
      })
      .addEdge(START, "statementExtractor")
      .addNode("tools", (state) => {
        const lastToolCall = (
          state.messages.findLast(
            (message) => (message as AIMessage).tool_calls,
          ) as AIMessage
        ).tool_calls![0];
        return {
          statemets: lastToolCall.args.statements,
        };
      })
      .addEdge("tools", END)
      .addNode("contentAnalyzer", (state) =>
        this.extractContentToolCalls(state, [ToolName.SubmitStatements]),
      )
      .addConditionalEdges("statementExtractor", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "tools";
        }

        return "contentAnalyzer";
      })
      .addNode("restart", (state) => {
        return { messages: [...state.messages.slice(0, -1)] };
      })
      .addEdge("restart", "statementExtractor")
      .addConditionalEdges("contentAnalyzer", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "tools";
        }

        return "restart";
      })
      .compile();
  };

  getPrompt = (message: string) =>
    "# Commit Message:\n\`\`\`\n" +
    message +
    "\n\`\`\`\n\n# Task\n\`\`\`\nExtract statements from the commit message and submit the extracted statements.\n\`\`\`";
}
