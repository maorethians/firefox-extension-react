import React from "react";
import { colors } from "@/public/colors.ts";
import { NodeOverlay } from "@/components/content/NodeOverlay.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { Generation } from "@/components/content/Generation.tsx";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { useTitle } from "@/services/content/useTitle.ts";

export const SubjectNode: React.FC<{
  nodesStore: NodesStore;
}> = ({ nodesStore }) => {
  const subjectId = useSubjectId((state) => state.subjectId);
  const title = useTitle((state) => state.title[subjectId]);

  const [isHovered, setIsHovered] = useState(false);

  const colorMode = useColorMode((state) => state.colorMode);

  return (
    <div
      style={{
        backgroundColor: colors[colorMode].PRIMARY,
        position: "relative",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <NodeOverlay
          nodesStore={nodesStore}
          nodeIds={[subjectId]}
          style={{ left: 0, top: "100%" }}
        />
      )}
      <Generation subjectId={subjectId} nodesStore={nodesStore} />
    </div>
  );
};
