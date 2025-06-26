import { NodeType, UnifiedNodeJson } from "@/types";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { AIMessageChunk } from "@langchain/core/messages";
import { IterableReadableStream } from "@@/node_modules/@langchain/core/dist/utils/stream";
import { ChainValues } from "@@/node_modules/@langchain/core/dist/utils/types";
import { tool } from "@langchain/core/tools";
import { nanoid } from "nanoid";
import { z } from "zod";
import { useGenerationProcess } from "@/services/content/useGenerationProcess.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import { useTitle } from "@/services/content/useTitle.ts";

export const store: Record<string, number> = {};

export abstract class BaseNode {
  node: UnifiedNodeJson;
  nodeType: NodeType;

  protected constructor(node: UnifiedNodeJson) {
    this.node = node;
    this.nodeType = node.nodeType;
  }

  tools = {
    description: (surroundings: string[]) => {
      const randomString = nanoid();
      store[randomString] = surroundings.length;

      return tool(
        () => {
          const remainingIterations = store[randomString];
          if (remainingIterations === 0) {
            return "There is no more context extension.";
          }

          store[randomString] = remainingIterations - 1;

          const index = surroundings.length - remainingIterations;
          return (
            "# Surrounding:\n---\n" +
            surroundings[index] +
            "\n---\n\n# Remaining Expansions:" +
            remainingIterations
          );
        },
        {
          name: "getSurrounding",
          description:
            "Returns the code or change along with its surrounding context to support better understanding.\n Each" +
            " time the tool is called, it expands the surrounding boundaries, providing progressively broader" +
            " visibility into the code or change location.",
          schema: z.object({}),
        },
      );
    },
  };

  promptTemplates: Record<string, (...args: any[]) => string> = {};

  _basePromptTemplates: typeof this.promptTemplates = {
    title: (description: string) =>
      "# Description:\n---\n" +
      description +
      "\n---\n\n# Task:\n---\nGenerate a concise phrase as the title of the description.\n---",
  };

  async describeNode(
    _nodesStore: NodesStore,
    _options?: {
      force?: boolean;
      entitle?: boolean;
    },
  ): Promise<void> {}

  async wrappedDescribeNode(
    nodesStore: NodesStore,
    options?: {
      force?: boolean;
      entitle?: boolean;
    },
  ) {
    this.setGenerationProcess(true);

    try {
      await this.describeNode(nodesStore, options);
    } catch (e) {}

    this.setGenerationProcess(false);
  }

  async entitle(force?: boolean): Promise<void> {
    const titleCache = this.node.title;
    if (titleCache && !force) {
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

  setGenerationProcess = (processState: boolean) => {
    useGenerationProcess
      .getState()
      .setGenerationProcess(this.node.id, processState);
  };

  async streamField(
    fieldKey: "description" | "title",
    generator?:
      | ReadableStream<AIMessageChunk>
      | IterableReadableStream<ChainValues>,
  ) {
    if (!generator) {
      return;
    }

    this.node[fieldKey] = "";
    let setter;
    if (fieldKey === "description") {
      setter = (description: string) =>
        useDescription.getState().setDescription(this.node.id, description);
    }
    if (fieldKey === "title") {
      setter = (title: string) =>
        useTitle.getState().setTitle(this.node.id, title);
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
}
