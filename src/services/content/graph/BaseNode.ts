import { NodeType, UnifiedNodeJson } from "@/types";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { AIMessageChunk } from "@langchain/core/messages";
import { IterableReadableStream } from "@@/node_modules/@langchain/core/dist/utils/stream";
import { ChainValues } from "@@/node_modules/@langchain/core/dist/utils/types";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  ProcessState,
  useGenerationProcess,
} from "@/services/content/useGenerationProcess.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import { useTitle } from "@/services/content/useTitle.ts";
import { keyBy } from "lodash";

export abstract class BaseNode {
  node: UnifiedNodeJson;
  nodeType: NodeType;
  private dependencyGraphNodesIdCache: string[] | null = null;

  protected constructor(node: UnifiedNodeJson) {
    this.node = node;
    this.nodeType = node.nodeType;
  }

  tools = {
    description: (idSurroundings: { id: string; surroundings: string[] }[]) => {
      if (idSurroundings.length === 0) {
        return;
      }

      const idSurroundingsIndex = keyBy(
        idSurroundings.map(({ id, surroundings }) => ({
          id,
          surroundings,
          index: 0,
        })),
        "id",
      );

      return tool(
        // TODO: should accept multiple ids
        ({ ids }) =>
          ids
            .map((id) => {
              const { surroundings, index } = idSurroundingsIndex[id];

              let result =
                "{ id: " +
                id +
                ", expansionSteps: " +
                (index + 1) +
                "/" +
                surroundings.length +
                " }\n";

              if (index === surroundings.length) {
                result += "Reached expansion limit for this code.";
                return result;
              }

              result += surroundings[index];

              idSurroundingsIndex[id].index = index + 1;

              console.log(result);

              return result;
            })
            .join("\n---\n"),
        {
          name: "getSurrounding",
          description:
            "Returns the code together with its surrounding to support better understanding. Each time the tool is" +
            " called, it expands the surrounding boundaries, providing progressively broader visibility into the" +
            " code location. The number of expansion steps is limited for each code and the tool is unable to expand" +
            " boundaries further when you reach that limit.",
          schema: z.object({
            ids: z.array(
              z.enum(
                idSurroundings.map(({ id }) => id) as [string, ...string[]],
              ),
            ),
          }),
        },
      );
    },
  };

  promptTemplates: Record<string, (...args: any[]) => Promise<string>> = {};

  _basePromptTemplates = {
    title: (description: string) =>
      "# Description:\n\`\`\`\n" +
      description +
      "\n\`\`\`\n\n# Task:\n\`\`\`\nGenerate a concise phrase as the title of the description.\n\`\`\`",
  };

  async describeNode(
    _nodesStore: NodesStore,
    _options?: {
      invalidateCache?: boolean;
      parentsToSet?: string[];
    },
  ): Promise<void> {}

  getDependencies(_nodesStore: NodesStore): BaseNode[] {
    return [];
  }

  getDependencyGraphNodesId(nodesStore: NodesStore): string[] {
    if (this.dependencyGraphNodesIdCache) {
      return this.dependencyGraphNodesIdCache;
    }

    const result = new Set<string>();

    const stack: string[] = [
      ...this.getDependencies(nodesStore).map(({ node }) => node.id),
    ];
    const seen: string[] = [];
    while (stack.length > 0) {
      const subjectId = stack.pop()!;
      if (seen.includes(subjectId)) {
        continue;
      }

      const subject = nodesStore.getNodeById(subjectId);

      if (subject.shouldGenerate(nodesStore)) {
        result.add(subjectId);
      }

      const dependencies = subject.getDependencies(nodesStore);
      for (const { node: dependency } of dependencies) {
        if (seen.includes(dependency.id)) {
          continue;
        }

        stack.push(dependency.id);
      }

      seen.push(subjectId);
    }

    this.dependencyGraphNodesIdCache = Array.from(result);
    return this.dependencyGraphNodesIdCache;
  }

  async wrappedDescribeNode(
    nodesStore: NodesStore,
    options?: {
      invalidateCache?: boolean;
      parentsToSet?: string[];
    },
  ) {
    this.setGenerationProcess("waiting", nodesStore);

    try {
      await this.describeNode(nodesStore, options);
    } catch (e) {}

    this.setGenerationProcess("result", nodesStore);
  }

  async entitle(): Promise<void> {
    const titleCache = this.node.title;
    if (titleCache) {
      return;
    }

    const description = this.node.description;
    if (!description) {
      return;
    }

    const generator = await LLMClient.stream(
      this._basePromptTemplates.title(description),
    );

    await this.streamField("title", generator);
  }

  stringify() {
    return this.node;
  }

  setGenerationProcess = (state: ProcessState, nodesStore: NodesStore) =>
    useGenerationProcess
      .getState()
      .setGenerationProcess(this.node.id, state, nodesStore);

  async streamField(
    fieldKey: "description" | "title",
    generator?:
      | ReadableStream<AIMessageChunk>
      | IterableReadableStream<ChainValues>,
    parentsToSet?: string[],
  ) {
    if (!generator) {
      return;
    }

    this.node[fieldKey] = "";
    let setter;
    if (fieldKey === "description") {
      setter = (description: string) => {
        useDescription.getState().setDescription(this.node.id, description);
        parentsToSet?.forEach((nodeId) =>
          useDescription.getState().setDescription(nodeId, description),
        );
      };
    }
    if (fieldKey === "title") {
      setter = (title: string) => {
        useTitle.getState().setTitle(this.node.id, title);
        parentsToSet?.forEach((nodeId) =>
          useTitle.getState().setTitle(nodeId, title),
        );
      };
    }
    setter?.(this.node[fieldKey]);

    for await (const chunk of generator) {
      if (chunk.content || (chunk as ChainValues).output) {
        let content = "";
        if (chunk.content) {
          content = chunk.content;
        } else if ((chunk as ChainValues).output) {
          content = (chunk as ChainValues).output;
        }

        this.node[fieldKey] += content;
        setter?.(this.node[fieldKey]);
      }
    }
  }

  shouldGenerate(_nodesStore: NodesStore): boolean {
    return false;
  }
}
