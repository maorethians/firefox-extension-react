import { last } from "lodash";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { isAggregator } from "@/types";
import { useSubjectId } from "@/services/content/useSubjectId.ts";

export class Narrator {
  private nodesStore: NodesStore;
  story: string[] = [];

  constructor(nodesStore: NodesStore) {
    this.nodesStore = nodesStore;

    const rootNode = this.nodesStore.getNodeById("root");
    if (!rootNode) {
      throw new Error("Could not find root node");
    }

    const stack = [rootNode.node.id];
    this.dfs(stack);
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
    useSubjectId.getState().setSubjectId(this.story[0]);
  };

  previousChapter = () => {
    const currentIndex = this.currentIndex();
    const previousIndex = Math.max(0, currentIndex - 1);
    useSubjectId.getState().setSubjectId(this.story[previousIndex]);
  };

  nextChapter = () => {
    const currentIndex = this.currentIndex();
    const nextIndex = Math.min(this.story.length - 1, currentIndex + 1);
    useSubjectId.getState().setSubjectId(this.story[nextIndex]);
  };

  currentIndex = () =>
    this.story.findIndex((id) => id === useSubjectId.getState().subjectId);
}
