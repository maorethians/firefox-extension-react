import { last } from "lodash";
import { SUBJECT_MESSAGE_TYPE } from "@/components/content/SubjectNode.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { isAggregator } from "@/types";
import { Dispatch, SetStateAction } from "react";

export class Narrator {
  nodesStore: NodesStore;
  private story: string[] = [];
  private current: string | null = null;

  constructor(
    nodesStore: NodesStore,
    setIsFirst: Dispatch<SetStateAction<boolean>>,
    setIsLast: Dispatch<SetStateAction<boolean>>,
  ) {
    this.nodesStore = nodesStore;

    const rootNode = this.nodesStore.getNodeById("root");
    if (!rootNode) {
      throw new Error("Could not find root node");
    }

    const stack = [rootNode.node.id];
    this.dfs(stack);

    window.addEventListener("message", ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_MESSAGE_TYPE) {
        return;
      }

      const { subjectId } = data.data;
      this.current = subjectId;
      setIsFirst(this.isFirst());
      setIsLast(this.isLast());
    });
  }

  private dfs = (stack: string[]) => {
    if (stack.length === 0) {
      return;
    }

    const subjectId = last(stack)!;
    if (this.story.includes(subjectId)) {
      return;
    }

    const targetNodes = this.nodesStore.edges
      .filter(
        ({ type, sourceId }) => type === "EXPANSION" && sourceId === subjectId,
      )
      .map(({ targetId }) => this.nodesStore.getNodeById(targetId));

    const aggregatorTargetNodes = targetNodes.filter(
      ({ node }) =>
        isAggregator(node) &&
        !this.story.includes(node.id) &&
        !stack.includes(node.id),
    );
    const depthSortedIds = aggregatorTargetNodes
      .map(({ node }) => ({
        id: node.id,
        depth: this.nodesStore.getNodeBranches(node.id),
      }))
      .sort((a, b) => b.depth - a.depth)
      .map(({ id }) => id);
    for (const id of depthSortedIds) {
      stack.push(id);
      this.dfs(stack);
    }

    if (targetNodes.length === 1 && isAggregator(targetNodes[0].node)) {
      const childId = targetNodes[0].node.id;
      this.story = this.story.filter((id) => id !== childId);
    }

    const subject = this.nodesStore.getNodeById(subjectId);
    this.story.push(subject.node.id);

    stack.pop();
  };

  beginStory = () => {
    this.postMessage(this.story[0]);
  };

  previousChapter = () => {
    const currentIndex = this.currentIndex();
    const previousIndex = Math.max(0, currentIndex - 1);
    this.postMessage(this.story[previousIndex]);
  };

  nextChapter = () => {
    const currentIndex = this.currentIndex();
    const nextIndex = Math.min(this.story.length - 1, currentIndex + 1);
    this.postMessage(this.story[nextIndex]);
  };

  currentIndex = () => {
    return this.story.findIndex((id) => id === this.current);
  };

  isFirst = () => this.currentIndex() === 0;
  isLast = () => this.currentIndex() === this.story.length - 1;

  private postMessage = (subjectId: string) => {
    window.postMessage({
      type: SUBJECT_MESSAGE_TYPE,
      data: { subjectId },
    });
  };
}
