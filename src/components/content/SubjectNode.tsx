import React from "react";
import { colors } from "@/public/colors.ts";
import { NodeOverlay } from "@/components/content/NodeOverlay.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
} from "@mui/material";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { useGenerationProcess } from "@/services/content/useGenerationProcess.ts";

export const SUBJECT_MESSAGE_TYPE = "SetSubjectNode";

export const SubjectNode: React.FC<{
  nodesStore: NodesStore;
}> = ({ nodesStore }) => {
  const { node: rootNode } = nodesStore.getNodeById("root");
  if (!rootNode) {
    return;
  }

  const generationProcess = useGenerationProcess(
    (state) => state.generationProcess,
  );
  const inGenerationNodes = Object.values(generationProcess).filter(
    (generation) => generation,
  ).length;
  const [maxGenerationNodes, setMaxGenerationNodes] = useState(0);
  useEffect(() => {
    if (maxGenerationNodes < inGenerationNodes) {
      setMaxGenerationNodes(inGenerationNodes);
    }
    if (inGenerationNodes === 0) {
      setMaxGenerationNodes(inGenerationNodes);
    }
  }, [inGenerationNodes]);

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
      <h3>{subjectTitle ?? subjectId}</h3>
      {subjectTitle && <h4>{subjectId}</h4>}
      <h4>Description:</h4>
      <Button
        loading={generationProcess[subjectId]}
        variant="contained"
        onClick={async () => {
          await nodesStore.describeNode(subjectId, setSubjectDescription, {
            force: true,
            advanced: isAdvanced,
            agent: isAgent,
          });
          await nodesStore.entitleNode(subjectId, setSubjectTitle, true);

          await nodesStore.updateStorage();
        }}
      >
        {subjectDescription ? "Regenerate" : "Generate"}
      </Button>

      {maxGenerationNodes > 0 && (
        <CircularProgress
          variant="determinate"
          value={
            ((maxGenerationNodes - inGenerationNodes) / maxGenerationNodes) *
            100
          }
        />
      )}

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
