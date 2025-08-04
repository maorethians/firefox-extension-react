import { HunkJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { compact, partition } from "lodash";
import { nanoid } from "nanoid";

type AIDetail = {
  id: string;
  surroundings: string[];
  content: string;
  contextString: string;
};

export class Hunk extends BaseNode {
  declare node: HunkJson;
  contexts: Hunk[] | undefined;
  private detailCache: AIDetail | undefined;
  private srcsDetailCache: AIDetail[] | null | undefined;
  private surroundingsCache:
    | { id: string; surroundings: string[] }[]
    | undefined;

  constructor(node: HunkJson) {
    super(node);
  }

  async getDetail(nodesStore: NodesStore) {
    if (this.detailCache) {
      return this.detailCache;
    }

    if (!this.node.promptId) {
      this.node.promptId = "code_" + nanoid(4);
      await nodesStore.updateStorage();
    }

    this.detailCache = {
      id: this.node.promptId,
      content: this.node.content,
      contextString: this.getContextString(nodesStore),
      surroundings: this.getContexts(nodesStore)
        .filter((context) => context.nodeType === "SEMANTIC_CONTEXT")
        .map((context) => context.node.content),
    };

    return this.detailCache;
  }

  async getSrcsDetail(nodesStore: NodesStore) {
    if (!this.node.srcs) {
      this.srcsDetailCache = null;
      return null;
    }

    if (this.srcsDetailCache) {
      return this.srcsDetailCache;
    }

    let shouldUpdateStorage = false;
    const srcsDetail: AIDetail[] = [];
    for (const src of this.node.srcs) {
      if (!src.promptId) {
        src.promptId = "code_" + nanoid(4);
        shouldUpdateStorage = true;
      }

      const [locationContexts, semanticContext] = partition(
        src.contexts,
        (context) => context.nodeType === "LOCATION_CONTEXT",
      );

      srcsDetail.push({
        id: src.promptId,
        content: src.content,
        contextString: this.representContextString(
          locationContexts.map((context) => context.content),
        ),
        surroundings: semanticContext.map((context) => context.content),
      });
    }

    if (shouldUpdateStorage) {
      await nodesStore.updateStorage();
    }

    this.srcsDetailCache = srcsDetail;
    return this.srcsDetailCache;
  }

  async getSurroundings(nodesStore: NodesStore) {
    if (this.surroundingsCache) {
      return this.surroundingsCache;
    }

    const surroundings: {
      id: string;
      surroundings: string[];
    }[] = [];

    const detail = await this.getDetail(nodesStore);
    surroundings.push({ id: detail.id, surroundings: detail.surroundings });

    const srcsDetail = await this.getSrcsDetail(nodesStore);
    if (srcsDetail) {
      for (const srcDetail of srcsDetail) {
        surroundings.push({
          id: srcDetail.id,
          surroundings: srcDetail.surroundings,
        });
      }
    }

    this.surroundingsCache = surroundings;
    return this.surroundingsCache;
  }

  promptTemplates = {
    base: async (nodesStore: NodesStore) => {
      let prompt = "";

      const srcsDetail = await this.getSrcsDetail(nodesStore);
      if (srcsDetail) {
        prompt += srcsDetail
          .map(({ id, contextString, content }) => {
            let subPrompt = "{ id: " + id;
            if (contextString) {
              subPrompt += ", location: " + contextString;
            }
            subPrompt += " }\n";
            subPrompt += content;

            return subPrompt;
          })
          .join("\n---\n");
        prompt += "\n\nMoved and Augmented to:\n\n";
      }

      const { id, contextString, content } = await this.getDetail(nodesStore);
      prompt += "{ id: " + id;
      if (contextString) {
        prompt += ", location: " + contextString;
      }
      prompt += " }\n";
      prompt += content;

      return prompt;
    },
    description: async (
      aggregatorsDescription: string[],
      nodesStore: NodesStore,
    ) => {
      const basePrompt = await this.promptTemplates.base(nodesStore);

      let prompt = `# Change:\n\`\`\`\n` + basePrompt + "\n\`\`\`\n";
      if (aggregatorsDescription.length !== 0) {
        prompt +=
          "\n# Context:\n\`\`\`\n" +
          aggregatorsDescription
            .map((description, index) => index + 1 + "-" + description)
            .join("\n---\n") +
          "\n\`\`\`\n";
      }

      prompt +=
        `\n# Task:\n\`\`\`\nIdentify and explain the specific role or function of the given change ${aggregatorsDescription.length !== 0 ? "within the provided context" : ""}.\n\`\`\`\n\n# Guidelines:\n\`\`\`\n- Make explicit references to code elements, identifiers, and code ids in your explanation to ensure clarity and help connect the explanation to the code.\n` +
        (aggregatorsDescription.length !== 0
          ? `- Focus on how the code contributes to the surrounding logic, structure, or behavior described in the context.\n- Avoid rephrasing or summarizing the full context.\n`
          : "") +
        "\`\`\`";

      return prompt;
    },
  };

  private getContexts = (nodesStore: NodesStore) => {
    if (this.contexts) {
      return this.contexts;
    }

    const contexts: Hunk[] = [];

    let current = nodesStore.getNodeById(this.node.id);
    while (true) {
      const edgeToNext = nodesStore.edges.find(
        (edge) => edge.type === "CONTEXT" && edge.sourceId === current.node.id,
      );
      if (!edgeToNext) {
        break;
      }

      const next = nodesStore.getNodeById(edgeToNext.targetId) as Hunk;
      contexts.push(next);

      current = next;
    }

    this.contexts = contexts;
    return this.contexts;
  };

  private getContextString = (nodesStore: NodesStore) => {
    const contexts = this.getContexts(nodesStore).filter(
      (context) => context.nodeType === "LOCATION_CONTEXT",
    );
    if (contexts.length === 0) {
      return "";
    }

    return this.representContextString(
      contexts.map((context) => (context as Hunk).node.content),
    );
  };

  private representContextString = (contexts: string[]) =>
    contexts.reverse().join("-->");

  describeNode = async (
    nodesStore: NodesStore,
    options?: {
      invalidateCache?: boolean;
      parentsToSet?: string[];
    },
  ): Promise<void> => {
    const descriptionCache = this.node.description;
    if (descriptionCache && !options?.invalidateCache) {
      return;
    }

    const aggregators = this.getDependencies(nodesStore);
    // TODO: make it batch
    for (const aggregator of aggregators) {
      await aggregator.wrappedDescribeNode(nodesStore);
    }
    const aggregatorsDescription = compact(
      aggregators.map((aggregator) => aggregator.node.description),
    );

    const prompt = await this.promptTemplates.description(
      aggregatorsDescription,
      nodesStore,
    );
    const surroundings = await this.getSurroundings(nodesStore);
    const tool = this.tools.description(surroundings);
    const generator = await LLMClient.stream(prompt, tool);
    await this.streamField("description", generator, options?.parentsToSet);

    await this.entitle();
  };

  getDependencies(nodesStore: NodesStore): BaseNode[] {
    const aggregatorIds = this.node.aggregatorIds;
    return aggregatorIds
      .map((id) => nodesStore.getNodeById(id))
      .filter((aggregator) => aggregator.nodeType !== "SINGULAR");
  }

  shouldGenerate(_nodesStore: NodesStore): boolean {
    return true;
  }
}
