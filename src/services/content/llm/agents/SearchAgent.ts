import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/agents/Agent";
import { TopDownAgent } from "./SearchAgent/TopDownAgent";
import { VerifyHunksAgent } from "./SearchAgent/VerifyHunksAgent";
import { RefineQuery } from "./SearchAgent/RefineQuery";
import { LeafScanAgent } from "./SearchAgent/LeafScanAgent";

const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),

  // internal state
  topDownHunks: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),
  leafScanHunks: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),

  // Output
  hunks: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),
});

export class SearchAgent extends Agent<(typeof StateAnnotation)["spec"]> {
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
        const refineQueryAgent = new RefineQuery();
        await refineQueryAgent.init();
        const response = await refineQueryAgent.invoke({ query: state.query });

        return { query: response.refinedQuery };
      })
      .addEdge(START, "refineQuery")
      .addNode("topDown", async (state) => {
        const topDownAgent = new TopDownAgent();
        await topDownAgent.init();
        const response = await topDownAgent.invoke({ query: state.query });

        return { topDownHunks: response.hunks };
      })
      .addEdge("refineQuery", "topDown")
      .addNode("leafScan", async (state) => {
        const leafScanAgent = new LeafScanAgent();
        await leafScanAgent.init();
        const response = await leafScanAgent.invoke({ query: state.query });

        return { leafScanHunks: response.hunks };
      })
      .addEdge("refineQuery", "leafScan")
      .addNode("verify", async (state) => {
        const verifyAgent = new VerifyHunksAgent();
        await verifyAgent.init();
        const response = await verifyAgent.invoke({
          query: state.query,
          hunksIn: new Set([...state.topDownHunks, ...state.leafScanHunks]),
        });

        return { hunks: response.hunksOut };
      })
      .addEdge("topDown", "verify")
      .addEdge("leafScan", "verify")
      .addEdge("verify", END)
      .compile();
  };
}
