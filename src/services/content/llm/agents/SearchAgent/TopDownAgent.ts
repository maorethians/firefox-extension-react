import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/agents/Agent";
import { useNodesStore } from "../../../useNodesStore";
import { partition } from "lodash";
import { isHunk } from "@/types";
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
  visited: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (prev, next) => new Set([...prev, ...next]),
  }),

  // Output
  hunks: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),
});

export class TopDownAgent extends Agent<(typeof StateAnnotation)["spec"]> {
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
        return {
          queue: ["root"],
        };
      })
      .addEdge(START, "init")
      .addNode("examineNode", async (state) => {
        const [currentNodeId, ...nextQueue] = state.queue;
        const nextVisited = new Set([...state.visited, currentNodeId]);

        const exammineNodeAgent = new ExamineNodeAgent();
        await exammineNodeAgent.init();
        const response = await exammineNodeAgent.invoke({
          nodeId: currentNodeId!,
          query: state.query,
        });
        if (!response.isRelated) {
          return { queue: nextQueue, visited: nextVisited };
        }

        const children = nodesStore
          .getNodes()
          .filter(({ node }) => node.aggregatorIds.includes(currentNodeId!));
        const [hunkChildren, aggregatorChildren] = partition(
          children,
          ({ node }) => isHunk(node),
        );

        const nextHunks = new Set(state.hunks);
        const validHunks = hunkChildren.filter(
          (hunkId) =>
            nodesStore.getNodeById(hunkId.node.id).node.nodeType === "BASE",
        );
        for (const hunk of validHunks) {
          nextHunks.add(hunk.node.id);
        }

        for (const aggregatorChild of aggregatorChildren) {
          const aggregatorId = aggregatorChild.node.id;

          if (
            state.visited.has(aggregatorId) ||
            nextQueue.includes(aggregatorId)
          ) {
            continue;
          }

          nextQueue.push(aggregatorId);
        }

        return { queue: nextQueue, visited: nextVisited, hunks: nextHunks };
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
