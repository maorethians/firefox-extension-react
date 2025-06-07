import { last } from "lodash";
import { SUBJECT_MESSAGE_TYPE } from "@/components/content/SubjectNode.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { isAggregator } from "@/types";

export class Narrator {
  nodesStore: NodesStore;
  story: string[];
  current: string | null = null;

  constructor(nodesStore: NodesStore) {
    this.nodesStore = nodesStore;

    const rootNode = this.nodesStore.getNodeById("root");
    if (!rootNode) {
      throw new Error("Could not find root node");
    }

    const visited: string[] = [],
      stack = [rootNode.node.id];
    this.dfs(visited, stack);

    this.story = visited;

    window.addEventListener("message", ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_MESSAGE_TYPE) {
        return;
      }

      const { subjectId } = data.data;
      this.current = subjectId;
    });
  }

  // TODO: prioritized dfs (starting from deeper levels of the graph)
  private dfs = (visited: string[], stack: string[]) => {
    if (stack.length === 0) {
      return;
    }

    const subjectId = last(stack)!;
    if (visited.includes(subjectId)) {
      return;
    }

    const subject = this.nodesStore.getNodeById(subjectId);

    const targetNodes = this.nodesStore.edges
      .filter(
        ({ type, sourceId, targetId }) =>
          type === "EXPANSION" &&
          this.nodesStore.getNodeById(sourceId).node.id === subjectId,
      )
      .map((edge) => this.nodesStore.getNodeById(edge.targetId))
      .filter(
        ({ node }) =>
          isAggregator(node) &&
          !visited.includes(node.id) &&
          !stack.includes(node.id),
      );

    for (const targetNode of targetNodes) {
      stack.push(targetNode.node.id);
      this.dfs(visited, stack);
    }

    visited.push(subject.node.id);
    stack.pop();
  };

  beginStory = () => {
    this.postMessage(this.story[0]);
  };

  previousChapter = () => {
    const currentIndex = this.story.findIndex((id) => id === this.current);
    const previousIndex = Math.max(0, currentIndex - 1);
    this.postMessage(this.story[previousIndex]);
  };

  nextChapter = () => {
    const currentIndex = this.story.findIndex((id) => id === this.current);
    const nextIndex = Math.min(this.story.length - 1, currentIndex + 1);
    this.postMessage(this.story[nextIndex]);
  };

  private postMessage = (subjectId: string) => {
    window.postMessage({
      type: SUBJECT_MESSAGE_TYPE,
      data: { subjectId },
    });
  };
}
