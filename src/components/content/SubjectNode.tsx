import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodeOverlay } from "@/components/content/NodeOverlay.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Button } from "@mui/material";

export const SUBJECT_MESSAGE_TYPE = "SetSubjectNode";

export const SubjectNode: React.FC<{
  nodesStore: NodesStore;
}> = ({ nodesStore }) => {
  const { node: commitNode } = nodesStore.getNodeById("commit");
  if (!commitNode) {
    return;
  }

  const [isProcessing, setProcessing] = React.useState(false);
  const [subjectId, setSubjectId] = useState(commitNode.id);
  const setSubject = (id: string) => {
    const newNode = nodesStore.getNodeById(id);
    if (!newNode) {
      return;
    }

    setSubjectId(newNode.node.id);
    setSubjectTitle(newNode.node.title);
    setSubjectDescription(newNode.node.description);
  };
  const [subjectTitle, setSubjectTitle] = useState(commitNode.title);
  const [subjectDescription, setSubjectDescription] = useState(
    commitNode.description,
  );

  window.addEventListener("message", ({ data }: MessageEvent) => {
    if (data.type !== SUBJECT_MESSAGE_TYPE) {
      return;
    }

    const { subjectId } = data.data;
    setSubject(subjectId);
  });

  const [isHovered, setIsHovered] = useState(false);

  const ref: RefObject<HTMLDivElement | null> = useRef(null);
  return (
    <div
      ref={ref}
      style={{
        backgroundColor: colors.PRIMARY,
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
      <h3>{subjectTitle ?? subjectId}</h3>
      {subjectTitle && <h4>{subjectId}</h4>}
      <h4>Description:</h4>
      <Button
        loading={isProcessing}
        variant="contained"
        onClick={async () => {
          // TODO: preprocess
          setProcessing(true);

          await nodesStore.describeNode(
            subjectId,
            setProcessing,
            setSubjectDescription,
            true,
          );
          await nodesStore.entitleNode(subjectId, setSubjectTitle, true);

          setProcessing(false);
        }}
      >
        {subjectDescription ? "Regenerate" : "Generate"}
      </Button>
      <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
        {subjectDescription}
      </pre>
    </div>
  );
};
