import { NodeType, UnifiedNodeJson } from "@/types";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { AIMessageChunk } from "@langchain/core/messages";
import { ChainValues } from "@@/node_modules/@langchain/core/dist/utils/types";
import { tool } from "@langchain/core/tools";
import {
  ProcessState,
  useGenerationProcess,
} from "@/services/content/useGenerationProcess.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import { useTitle } from "@/services/content/useTitle.ts";
import { intersection, keyBy } from "lodash";
import { z } from "zod";
import { AIDetail, Hunk } from "@/services/content/graph/Hunk.ts";

export enum GenerationType {
  Usage = 1,
  Successive = 2,
  Similarity = 3,
  Singular = 4,
  Hunk = 5,
}

export type DescendantHunks = {
  firstGeneration: Hunk[];
  firstGenerationType: GenerationType;
  extendedGenerations: Hunk[];
};

export abstract class BaseNode {
  node: UnifiedNodeJson;
  nodeType: NodeType;
  private dependencyGraphNodesIdCache: string[] | null = null;
  protected unTypedDescendantHunksCache: Omit<
    DescendantHunks,
    "firstGenerationType"
  > | null = null;

  protected constructor(node: UnifiedNodeJson) {
    this.node = node;
    this.nodeType = node.nodeType;
  }

  tools = {
    description: (
      idSurroundings: { promptId: string; surroundings: string[] }[],
    ) => {
      const validIdSurroundings = idSurroundings.filter(
        ({ surroundings }) => surroundings.length > 0,
      );
      if (validIdSurroundings.length === 0) {
        return;
      }

      const promptIdSurroundingsIndex = keyBy(
        validIdSurroundings.map(({ promptId, surroundings }) => ({
          promptId,
          surroundings,
          index: 0,
        })),
        "promptId",
      );

      return tool(
        ({ ids }) => {
          const result = ids.map((id) => {
            let prompt = "{ id: " + id + " }\n";

            if (!promptIdSurroundingsIndex[id]) {
              prompt +=
                "The surrounding of this code cannot be expanded further.";
              return prompt;
            }

            const { surroundings, index } = promptIdSurroundingsIndex[id];
            if (index === surroundings.length) {
              prompt +=
                "The surrounding of this code cannot be expanded further.";
              return prompt;
            }

            promptIdSurroundingsIndex[id].index = index + 1;

            prompt += surroundings[index];
            return prompt;
          });

          console.log(result);

          return result.join("\n---\n");
        },
        {
          name: "fetchCodeSurroundings",
          description:
            "Returns code snippets together with their surroundings. Each time this tool is called with the same code" +
            " id, the surrounding boundaries expand further.\n\n# Guidelines:\n\`\`\`\n- You MUST call this tool" +
            " whenever the provided code snippet is not self-contained, and its purpose can only be determined from" +
            " its surroundings.\n- Keep expanding the surroundings until the role of the code snippet can be clearly" +
            " explained, or until the expansion limit is reached.\n\`\`\`",
          schema: z.object({
            ids: z.array(z.string()),
          }),
        },
      );
    },
  };

  promptTemplates: Record<string, (...args: any[]) => string> = {};

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

    const response = await LLMClient.invoke(
      this._basePromptTemplates.title(description),
    );

    await this.streamField("title", response);
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
    response?: AIMessageChunk | ChainValues,
    parentsToSet?: string[],
  ) {
    if (!response) {
      return;
    }

    let setter;
    if (fieldKey === "description") {
      this.node.description = "";

      setter = (description: string) => {
        useDescription.getState().setDescription(this.node.id, description);
        parentsToSet?.forEach((nodeId) =>
          useDescription.getState().setDescription(nodeId, description),
        );
      };
    }
    if (fieldKey === "title") {
      this.node.title = "";

      setter = (title: string) => {
        useTitle.getState().setTitle(this.node.id, title);
        parentsToSet?.forEach((nodeId) =>
          useTitle.getState().setTitle(nodeId, title),
        );
      };
    }

    setter?.("");

    if (response.content || (response as ChainValues).output) {
      let content = "";
      if (response.content) {
        content = response.content;
      } else if ((response as ChainValues).output) {
        content = (response as ChainValues).output;
      }

      this.node[fieldKey] = content;
      setter?.(this.node[fieldKey]);
    }
  }

  shouldGenerate(_nodesStore: NodesStore): boolean {
    return false;
  }

  getUntypedDescendantHunks(
    nodesStore: NodesStore,
  ): Omit<DescendantHunks, "firstGenerationType"> {
    if (this.unTypedDescendantHunksCache) {
      return this.unTypedDescendantHunksCache;
    }

    const firstGeneration: Hunk[] = [];
    const extendedGenerations: Hunk[] = [];

    let hopNodeIds = [this.node.id];
    while (true) {
      const hopChildrenNodes = nodesStore
        .getNodes()
        .filter(
          ({ node }) => intersection(hopNodeIds, node.aggregatorIds).length > 0,
        );

      if (hopChildrenNodes.length == 0) {
        break;
      }

      const hopChildrenHunks = hopChildrenNodes.filter(
        ({ node }) => node.nodeType === "BASE" || node.nodeType === "EXTENSION",
      ) as Hunk[];
      if (firstGeneration.length === 0) {
        firstGeneration.push(...hopChildrenHunks);
      } else {
        extendedGenerations.push(...hopChildrenHunks);
      }

      hopNodeIds = hopChildrenNodes.map(({ node }) => node.id);
    }

    this.unTypedDescendantHunksCache = {
      firstGeneration,
      extendedGenerations,
    };
    return this.unTypedDescendantHunksCache;
  }

  abstract getDescendantHunks(nodesStore: NodesStore): DescendantHunks;

  getPromptIdsDetail(nodesStore: NodesStore) {
    const { firstGeneration, extendedGenerations } =
      this.getDescendantHunks(nodesStore);
    const descendantHunks = [...firstGeneration, ...extendedGenerations];

    const details: AIDetail[] = [];
    for (const hunk of descendantHunks) {
      const detail = hunk.getDetail(nodesStore);
      details.push(detail);

      const srcsDetail = hunk.getSrcsDetail(nodesStore);
      if (srcsDetail) {
        details.push(...srcsDetail);
      }
    }

    return keyBy(details, "promptId");
  }
}
