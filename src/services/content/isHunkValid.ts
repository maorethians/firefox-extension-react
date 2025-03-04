import { Node } from "@/types";
import { groupBy } from "lodash";

export const isHunkValid = (hunk: Node[]) => {
  const hunks = groupBy(hunk, (node: Node) => node.hunkId);
  return Object.keys(hunks).length <= 1;
};
