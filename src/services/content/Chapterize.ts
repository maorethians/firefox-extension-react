import { NodesStore } from "@/services/content/NodesStore.ts";
import { uniq } from "lodash";
import { isAggregator } from "@/types";

export type Chapter = {
  nodeId: string;
  subStory: Chapter[];
  represents?: string[];
};

export class Chapterize {
  private nodesStore: NodesStore;

  constructor(nodesStore: NodesStore) {
    this.nodesStore = nodesStore;
  }

  private getRequirementRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      if (chapter.represents) {
        return chapter.represents
          .map((nodeId) => this.nodesStore.getNodeById(nodeId))
          .some(({ node }) => node.nodeType === "USAGE");
      }

      const { node } = this.nodesStore.getNodeById(chapter.nodeId);
      if (node.nodeType !== "USAGE") {
        return false;
      }

      const aggregators = node.aggregatorIds.map((aggregatorId) =>
        this.nodesStore.getNodeById(aggregatorId),
      );
      return aggregators.every(
        (aggregator) => aggregator.node.nodeType !== "USAGE",
      );
    });

  private getCommonHunkRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      const candidateNodes = [this.nodesStore.getNodeById(chapter.nodeId)];
      if (chapter.represents) {
        candidateNodes.push(
          ...chapter.represents.map((nodeId) =>
            this.nodesStore.getNodeById(nodeId),
          ),
        );
      }

      return candidateNodes.some(({ node }) => {
        if (node.nodeType !== "COMPONENT") {
          return false;
        }

        if (node.reasonType !== "COMMON") {
          return false;
        }

        const reasonNodes = node.reasons.map((reason) =>
          this.nodesStore.getNodeById(reason.id),
        );
        return !reasonNodes.some(
          (node) =>
            node.nodeType === "LOCATION_CONTEXT" ||
            node.nodeType === "SEMANTIC_CONTEXT",
        );
      });
    });

  private getSimilarNodesRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      const candidateNodes = [this.nodesStore.getNodeById(chapter.nodeId)];
      if (chapter.represents) {
        candidateNodes.push(
          ...chapter.represents.map((nodeId) =>
            this.nodesStore.getNodeById(nodeId),
          ),
        );
      }

      return candidateNodes.some(({ node }) => {
        if (node.nodeType !== "COMPONENT") {
          return false;
        }

        return node.reasonType === "SIMILAR";
      });
    });

  private getCommonNodesRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      const candidateNodes = [this.nodesStore.getNodeById(chapter.nodeId)];
      if (chapter.represents) {
        candidateNodes.push(
          ...chapter.represents.map((nodeId) =>
            this.nodesStore.getNodeById(nodeId),
          ),
        );
      }

      return candidateNodes.some(({ node }) => {
        if (node.nodeType !== "COMPONENT") {
          return false;
        }

        return node.reasonType === "COMMON";
      });
    });

  private getPruneRootsSubNodeIds(story: Chapter[], pruneRoots: Chapter[]) {
    const pruneRootSubNodeIds: Record<string, string[]> = {};
    const allSubNodeIds: string[] = [];

    for (const { nodeId } of pruneRoots) {
      const subNodeIds: string[] = [];

      let hopNodeIds = [nodeId];
      while (true) {
        const hopExpansionEdges = hopNodeIds
          .map((nodeId) => this.nodesStore.getSourceEdges(nodeId))
          .flat()
          .filter(({ type }) => type === "EXPANSION");
        const hopExpansionTargets = uniq(
          hopExpansionEdges.map(({ targetId }) => targetId),
        )
          .filter((nodeId) => !subNodeIds.includes(nodeId))
          .map((id) => this.nodesStore.getNodeById(id));
        const hopAggregatorTargetIds = hopExpansionTargets
          .filter(({ node }) => isAggregator(node))
          .map(({ node }) => node.id);
        if (hopAggregatorTargetIds.length === 0) {
          break;
        }

        subNodeIds.push(...hopAggregatorTargetIds);
        hopNodeIds = hopAggregatorTargetIds;

        allSubNodeIds.push(...hopAggregatorTargetIds);
      }

      pruneRootSubNodeIds[nodeId] = story
        // ordered subStory
        .filter((chapter) => subNodeIds.includes(chapter.nodeId))
        .map((chapter) => chapter.nodeId);
    }

    return Object.fromEntries(
      Object.entries(pruneRootSubNodeIds).filter(
        ([rootId]) => !allSubNodeIds.includes(rootId),
      ),
    );
  }

  private pruneRoots = (
    story: Chapter[],
    rootsSubNodeIds: Record<string, string[]>,
  ) => {
    if (Object.keys(rootsSubNodeIds).length === 0) {
      return;
    }

    const storyDeepClone = story.map(
      ({ nodeId, represents, subStory }): Chapter => ({
        nodeId,
        represents,
        subStory: [...subStory],
      }),
    );

    const allSubNodeIds: string[] = [];

    for (const [rootId, subNodeIds] of Object.entries(rootsSubNodeIds)) {
      const chapter = storyDeepClone.find(({ nodeId }) => nodeId === rootId);
      if (!chapter) {
        continue;
      }

      chapter.subStory = storyDeepClone.filter(({ nodeId }) =>
        subNodeIds.includes(nodeId),
      );
      chapter.subStory.push(chapter);

      allSubNodeIds.push(...subNodeIds);
    }

    return storyDeepClone.filter(
      (chapter) => !allSubNodeIds.includes(chapter.nodeId),
    );
  };

  getPrunedStories(story: Chapter[]) {
    const requirementRoots = this.getRequirementRoots(story);
    const requirementRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      requirementRoots,
    );
    const requirementsStory = this.pruneRoots(
      story,
      requirementRootsSubNodeIds,
    );

    const commonHunksRoots = this.getCommonHunkRoots(story);
    const commonHunksRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      commonHunksRoots,
    );
    const commonHunksStory = this.pruneRoots(story, commonHunksRootsSubNodeIds);

    const similarNodesRoots = this.getSimilarNodesRoots(story);
    const similarNodesRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      similarNodesRoots,
    );
    const similarStory = this.pruneRoots(story, similarNodesRootsSubNodeIds);

    const commonNodesRoots = this.getCommonNodesRoots(story);
    const commonNodesRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      commonNodesRoots,
    );
    const commonNodesStory = this.pruneRoots(story, commonNodesRootsSubNodeIds);

    return {
      requirementsStory,
      commonHunksStory,
      similarStory,
      commonNodesStory,
    };
  }
}
