import React from "react";
import { Commit, Node } from "@/types";
import { intersection, uniq } from "lodash";
import { SUBJECT_MESSAGE_TYPE } from "@/components/SubjectNode.tsx";

export const Navigator: React.FC<{
  hunk: Node[];
  commit: Commit;
}> = ({ hunk, commit }) => {
  const nodeIds = hunk.map((node) => node.id);
  const children = commit.nodes.filter(
    (node) =>
      node.aggregatorIds &&
      intersection(nodeIds, node.aggregatorIds).length > 0,
  );

  const parentIds = uniq(hunk.map((node) => node.aggregatorIds ?? []).flat());
  const parents = commit.nodes.filter((node) => parentIds.includes(node.id));

  return (
    <div>
      {parents.length > 0 && (
        <div>
          <h3>Parents:</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {parents.map((parent) => (
              <button
                onClick={() => {
                  window.postMessage({
                    type: SUBJECT_MESSAGE_TYPE,
                    data: { subjectId: parent.id },
                  });
                }}
              >
                {parent.title ?? parent.id}
              </button>
            ))}
          </div>
        </div>
      )}
      {children.length > 0 && (
        <div>
          <h3>Explore:</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {children.map((child) => (
              <button
                onClick={() => {
                  window.postMessage({
                    type: SUBJECT_MESSAGE_TYPE,
                    data: { subjectId: child.id },
                  });
                }}
              >
                {child.title ?? child.id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
