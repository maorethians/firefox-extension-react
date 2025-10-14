import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/agents/Agent";

const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),

  // Output
  refinedQuery: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),
});

export class RefineQuery extends Agent<(typeof StateAnnotation)["spec"]> {
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
      .addNode("refineQuery", async (state) => {
        // TODO: give some change-related information
        const response = await model.invoke(
          "# Query:\n\`\`\`\n" +
            state.query +
            "\n\`\`\`\n\n# Task:\n\`\`\`\nThe query is requested by a user to find its related changes within a commit. Your" +
            " task is to produce a refined query that expresses the same intent in natural language, optimized for understanding" +
            " by an intelligent agent that semantically navigates and identifies relevant changes in the commit.\n\`\`\`\n\n" +
            "# Guidelines:\n\`\`\`\n- Only return the refined query itself.\n- Do not include any explanations, reasoning," +
            " examples, or formatting beyond the query string.\n-The refined query should be suitable for semantic reasoning" +
            " (not keyword matching).\n\`\`\`",
        );
        return { refinedQuery: response.content };
      })
      .addEdge(START, "refineQuery")
      .addEdge("refineQuery", END)
      .compile();
  };
}
