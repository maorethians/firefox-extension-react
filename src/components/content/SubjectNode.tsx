import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodeOverlay } from "@/components/content/NodeOverlay.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Button, Checkbox, FormControlLabel } from "@mui/material";

export const SUBJECT_MESSAGE_TYPE = "SetSubjectNode";

export const SubjectNode: React.FC<{
  nodesStore: NodesStore;
}> = ({ nodesStore }) => {
  const { node: rootNode } = nodesStore.getNodeById("root");
  if (!rootNode) {
    return;
  }

  const [isProcessing, setProcessing] = React.useState(false);
  const [subjectId, setSubjectId] = useState(rootNode.id);
  const [subjectTitle, setSubjectTitle] = useState(rootNode.title);
  const [subjectDescription, setSubjectDescription] = useState(
    rootNode.description,
  );
  const setSubject = (id: string) => {
    const newNode = nodesStore.getNodeById(id);
    if (!newNode) {
      return;
    }

    setSubjectId(newNode.node.id);
    setSubjectTitle(newNode.node.title);
    setSubjectDescription(newNode.node.description);
  };

  const [isAdvanced, setAdvanced] = useState(false);
  const [isAgent, setAgent] = useState(true);

  useEffect(() => {
    window.addEventListener("message", ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_MESSAGE_TYPE) {
        return;
      }

      const { subjectId } = data.data;
      setSubject(subjectId);
    });
  }, []);

  const [isHovered, setIsHovered] = useState(false);

  const ref: RefObject<HTMLDivElement | null> = useRef(null);
  return (
    <div
      ref={ref}
      style={{
        backgroundColor: colors.DARK.PRIMARY,
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
          setProcessing(true);

          await nodesStore.describeNode(
            subjectId,
            setProcessing,
            setSubjectDescription,
            { force: true, advanced: isAdvanced, agent: isAgent },
          );
          await nodesStore.entitleNode(subjectId, setSubjectTitle, true);

          setProcessing(false);

          await nodesStore.updateStorage();
        }}
      >
        {subjectDescription ? "Regenerate" : "Generate"}
      </Button>

      <FormControlLabel
        control={
          <Checkbox
            checked={isAdvanced}
            onChange={() => setAdvanced(!isAdvanced)}
            color={"secondary"}
          />
        }
        label={"Advanced"}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={isAgent}
            onChange={() => setAgent(!isAgent)}
            color={"secondary"}
          />
        }
        label={"Agent"}
      />

      <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
        {subjectDescription}
      </pre>
    </div>
  );
};
