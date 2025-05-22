import { NodeType, UnifiedNodeJson } from "@/types";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { GroqClient } from "@/services/content/llm/GroqClient.ts";
import React from "react";
import { AIMessageChunk } from "@langchain/core/messages";

export abstract class BaseNode {
  node: UnifiedNodeJson;
  nodeType: NodeType;

  protected constructor(node: UnifiedNodeJson) {
    this.node = node;
    this.nodeType = node.nodeType;
  }

  promptTemplates: Record<string, (...args: any[]) => string> = {};

  _basePromptTemplates: typeof this.promptTemplates = {
    title: (description: string) => {
      return `
Below is the description of a code change:
---
${description}
---
      
Give a very short and concise phrase as the title and heading of the change.`;
    },
  };

  async describeNode(
    _nodesStore: NodesStore,
    _setProcessing: React.Dispatch<React.SetStateAction<boolean>>,
    _set?: React.Dispatch<React.SetStateAction<string | undefined>>,
    _force?: boolean,
  ): Promise<void> {}

  async entitle(
    set: React.Dispatch<React.SetStateAction<string | undefined>>,
    force?: boolean,
  ): Promise<void> {
    const titleCache = this.node.title;
    if (titleCache && !force) {
      return;
    }

    const description = this.node.description;
    if (!description) {
      return;
    }

    const generator = await GroqClient.stream(
      this._basePromptTemplates.title(description),
    );
    if (!generator) {
      return;
    }

    await this.streamField("title", () => {}, generator, set);
  }

  stringify() {
    return this.node;
  }

  async streamField(
    fieldKey: "description" | "title",
    setProcessing: React.Dispatch<React.SetStateAction<boolean>>,
    generator?: ReadableStream<AIMessageChunk>,
    set?: React.Dispatch<React.SetStateAction<string | undefined>>,
  ) {
    if (!generator) {
      return;
    }

    setProcessing(false);

    this.node[fieldKey] = "";
    set?.(this.node[fieldKey]);

    for await (const chunk of generator) {
      this.node[fieldKey] += chunk.content;
      set?.(this.node[fieldKey]);
    }
  }
}
