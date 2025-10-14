import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/agents/Agent";
import { useNodesStore } from "../../../useNodesStore";
import { uniq } from "lodash";
import { ExamineNodeAgent } from "./ExamineNodeAgent";

const StateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),

  // Internal states
  queue: Annotation<string[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),

  // Output
  hunks: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),
});

export class LeafScanAgent extends Agent<(typeof StateAnnotation)["spec"]> {
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
      .addNode("init", () => {
        // TODO: rerank
        const leaves = uniq(
          nodesStore
            .getNodes()
            .filter(({ node }) => node.nodeType === "BASE")
            .map(({ node }) => node.aggregatorIds)
            .flat(),
        );

        return {
          queue: leaves,
        };
      })
      .addEdge(START, "init")
      .addNode("examineNode", async (state) => {
        const [currentNodeId, ...nextQueue] = state.queue;

        const exammineNodeAgent = new ExamineNodeAgent();
        await exammineNodeAgent.init();
        const response = await exammineNodeAgent.invoke({
          nodeId: currentNodeId!,
          query: state.query,
        });
        if (!response.isRelated) {
          return { queue: nextQueue };
        }

        const nextHunks = new Set(state.hunks);
        const hunks = nodesStore
          .getNodes()
          .filter(
            ({ node }) =>
              node.aggregatorIds.includes(currentNodeId!) &&
              node.nodeType === "BASE",
          );
        for (const hunk of hunks) {
          nextHunks.add(hunk.node.id);
        }

        return { queue: nextQueue, hunks: nextHunks };
      })
      .addEdge("init", "examineNode")
      .addConditionalEdges("examineNode", (state) => {
        if (state.queue.length === 0) {
          return END;
        }
        return "examineNode";
      })
      .compile();
  };
}
