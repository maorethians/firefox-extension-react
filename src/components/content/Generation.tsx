import React from "react";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";
import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
} from "@mui/material";
import { useGenerationProcess } from "@/services/content/useGenerationProcess.ts";
import { useAdvanced } from "@/services/content/useAdvanced.ts";
import { useAgentic } from "@/services/content/useAgentic.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import { useTitle } from "@/services/content/useTitle.ts";

export const Generation: React.FC<{
  subjectId: string;
  nodesStore: NodesStore;
}> = ({ subjectId, nodesStore }) => {
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

  const description = useDescription((state) => state.description[subjectId]);
  const setDescription = useDescription((state) => state.setDescription);
  const title = useTitle((state) => state.title[subjectId]);
  const setTitle = useTitle((state) => state.setTitle);
  useEffect(() => {
    const node = nodesStore.getNodeById(subjectId).node;

    if (!description) {
      setDescription(subjectId, node.description ?? "");
    }
    if (!title) {
      setTitle(subjectId, node.title ?? "");
    }
  }, [subjectId]);

  const isAdvanced = useAdvanced((state) => state.isAdvanced);
  const setAdvanced = useAdvanced((state) => state.setAdvanced);
  const isAgentic = useAgentic((state) => state.isAgentic);
  const setAgentic = useAgentic((state) => state.setAgentic);

  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  return (
    <div style={{ color }}>
      <h3>{title ?? subjectId}</h3>
      {title && <h5>{subjectId}</h5>}

      <Button
        loading={generationProcess[subjectId]}
        variant="contained"
        onClick={async () => {
          await nodesStore.describeNode(subjectId, {
            force: true,
          });
          await nodesStore.entitleNode(subjectId, true);

          await nodesStore.updateStorage();
        }}
      >
        {description ? "Regenerate" : "Generate"}
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
            checked={isAgentic}
            onChange={() => setAgentic(!isAgentic)}
            color={"secondary"}
          />
        }
        label={"Agent"}
      />

      <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
        {description}
      </pre>
    </div>
  );
};
