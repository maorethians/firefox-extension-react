import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/agents/Agent";
import { VerifyHunkAgent } from "./VerifyHunksAgent/VerifyHunkAgent";

const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),
  hunksIn: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),

  // Internal states
  queue: Annotation<string[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),

  // Output
  hunksOut: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),
});

export class VerifyHunksAgent extends Agent<(typeof StateAnnotation)["spec"]> {
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
      .addNode("init", (state) => {
        return { queue: Array.from(state.hunksIn) };
      })
      .addConditionalEdges(START, (state) => {
        return state.hunksIn.size === 0 ? END : "init";
      })
      .addNode("verify", async (state) => {
        const [currentHunk, ...nextQueue] = state.queue;

        const verifyHunkAgent = new VerifyHunkAgent();
        await verifyHunkAgent.init();
        const response = await verifyHunkAgent.invoke({
          query: state.query,
          hunk: currentHunk,
        });
        const nextHunksOut = new Set(state.hunksOut);
        if (response.isRelated) {
          nextHunksOut.add(currentHunk);
        }

        return {
          queue: nextQueue,
          hunksOut: nextHunksOut,
        };
      })
      .addEdge("init", "verify")
      .addConditionalEdges("verify", (state) => {
        return state.queue.length === 0 ? END : "verify";
      })
      .compile();
  };
}
