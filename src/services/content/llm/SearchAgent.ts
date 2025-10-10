import { Annotation, END, START, StateGraph } from "@langchain/langgraph/web";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import { Agent } from "@/services/content/llm/Agent.ts";
import { useNodesStore } from "../useNodesStore";
import { partition } from "lodash";
import { isHunk } from "@/types";
import { ToolName, tools } from "./tools";
import { Hunk } from "../graph/Hunk";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: (_, next) => [...next],
  }),
  query: Annotation<string>({
    default: () => "",
    reducer: (_, next) => next,
  }),
  queue: Annotation<string[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),
  currentNodeId: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  visited: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (prev, next) => new Set([...prev, ...next]),
  }),
  hunks: Annotation<Set<string>>({
    default: () => new Set(),
    reducer: (_, next) => next,
  }),
  response: Annotation<string[]>({
    default: () => [],
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
    const nodesStore = useNodesStore.getState().nodesStore!;

    if (!model) {
      return null;
    }

    return new StateGraph(StateAnnotation)
      .addNode("init", (state) => {
        const query = (state.messages[0] as HumanMessage).text;
        return {
          query,
          queue: ["root"],
        };
      })
      .addEdge(START, "init")
      .addNode("refineQuery", async (state) => {
        // TODO: give some change-related information
        const refinedQuery = await model.invoke(
          "# Query:\n\`\`\`\n" +
            state.query +
            "\n\`\`\`\n\n# Task:\n\`\`\`\nThe query is requested by user to find its related changes within a commit." +
            "Your task is to refine the query to make it ready for an effective search among changes.",
        );
        console.log(refinedQuery);
        return { query: refinedQuery };
      })
      .addEdge("init", "refineQuery")
      .addNode("pickNode", (state) => {
        const [currentNodeId, ...nextQueue] = state.queue;
        const nextVisited = new Set([...state.visited, currentNodeId]);
        return { currentNodeId, queue: nextQueue, visited: nextVisited };
      })
      .addEdge("refineQuery", "pickNode")
      .addNode("navigate", async (state) => {
        const { currentNodeId, query } = state;

        const currentNode = nodesStore.getNodeById(currentNodeId!);
        const response = await model
          .bindTools([tools.submitBooleanResult])
          .invoke(
            "# Query:\n\`\`\`\n" +
              query +
              "\n\`\`\`\n\n# Description:\n\`\`\`\n" +
              currentNode.node.description +
              "\n\`\`\`\n\n# Task:\n\`\`\`\nDescription is the explanation of a part of a commit. Your task is to determine" +
              " whether the changes described by this description are related to the query. If you are certain that the changes" +
              " are not related to the query, submit false. If you are certain that the changes are related to the query, or if" +
              " you are uncertain about the relationship between the changes and the query, submit true.\n\`\`\`",
          );

        return {
          messages: [...state.messages, response],
        };
      })
      .addEdge("pickNode", "navigate")
      .addNode("navigateTools", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;
        const toolCall = lastMessage.tool_calls![0];
        const isRelated = toolCall.args.result;
        if (isRelated) {
          return { currentNodeId: null };
        }

        const { currentNodeId } = state;
        const children = nodesStore
          .getNodes()
          .filter(({ node }) => node.aggregatorIds.includes(currentNodeId!));
        const [hunkChildren, aggregatorChildren] = partition(
          children,
          ({ node }) => isHunk(node),
        );

        const nextHunks = new Set(state.hunks);
        for (const hunk of hunkChildren) {
          nextHunks.add(hunk.node.id);
        }

        const nextQueue = [...state.queue];
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

        return {
          hunks: nextHunks,
          queue: nextQueue,
          currentNodeId: null,
        };
      })
      .addConditionalEdges("navigateTools", (state) => {
        if (state.queue.length === 0) {
          return state.hunks.size === 0 ? END : "verify";
        }
        return "pickNode";
      })
      .addNode("navigateContentAnalyzer", (state) =>
        this.extractContentToolCalls(state, [ToolName.SubmitBooleanResult]),
      )
      .addConditionalEdges("navigate", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "navigateTools";
        }

        return "navigateContentAnalyzer";
      })
      .addNode("navigateRestart", (state) => {
        return { messages: state.messages.slice(0, -1) };
      })
      .addEdge("navigateRestart", "navigate")
      .addConditionalEdges("navigateContentAnalyzer", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "navigateTools";
        }

        return "navigateRestart";
      })
      .addNode("verify", async (state) => {
        const hunks = Array.from(state.hunks).map((hunkId) =>
          (nodesStore.getNodeById(hunkId) as Hunk).getDetail(nodesStore),
        );
        const response = await model
          // TODO: maybe letting to fetch surroundings?
          .bindTools([tools.submitSelectionResult])
          .invoke(
            "# Change Hunks:\n\`\`\`\n" +
              hunks
                .map((hunk) => "{ id: " + hunk.promptId + " }\n" + hunk.content)
                .join("\n---\n") +
              "\n\`\`\`\n\n# Query:\n\`\`\`\n" +
              state.query +
              "\n\`\`\`\n\n# Task:\n\`\`\`\nThe query is requested by user to find its related changes within a commit. Change" +
              " hunks are the changes within the commit that are found to be potentially related to the query. Your task is to" +
              " analyze the change hunks and select all the hunks that are truly related to the query and submit their ids.",
          );

        return {
          messages: [...state.messages, response],
        };
      })
      .addNode("verifyContentAnalyzer", (state) =>
        this.extractContentToolCalls(state, [ToolName.SubmitSelectionResult]),
      )
      .addNode("verifyTools", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;
        const toolCall = lastMessage.tool_calls![0];
        const selection = toolCall.args.selection as string[];

        const selectedHunks = Array.from(state.hunks)
          .map((hunkId) =>
            (nodesStore.getNodeById(hunkId) as Hunk).getDetail(nodesStore),
          )
          .filter((hunk) => selection.includes(hunk.promptId))
          .map((hunk) => hunk.content);
        return {
          response: selectedHunks,
        };
      })
      .addEdge("verifyTools", END)
      .addConditionalEdges("verify", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "verifyTools";
        }

        return "verifyContentAnalyzer";
      })
      .addNode("verifyRestart", (state) => {
        return { messages: state.messages.slice(0, -1) };
      })
      .addEdge("verifyRestart", "verify")
      .addConditionalEdges("verifyContentAnalyzer", (state) => {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;

        if (lastMessage.tool_calls?.length) {
          return "verifyTools";
        }

        return "verifyRestart";
      })
      .compile();
  };
}
