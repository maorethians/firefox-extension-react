import React from "react";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";
import { CircularProgress, IconButton } from "@mui/material";
import { useGenerationProcess } from "@/services/content/useGenerationProcess.ts";
import { useAdvanced } from "@/services/content/useAdvanced.ts";
import { useAgentic } from "@/services/content/useAgentic.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import ReactMarkdown from "react-markdown";
// @ts-ignore
import Generate from "../../public/generate.svg?react";
// @ts-ignore
import Advanced from "../../public/advanced.svg?react";
// @ts-ignore
import Simple from "../../public/simple.svg?react";
// @ts-ignore
import Agentic from "../../public/agentic.svg?react";
// @ts-ignore
import Gear from "../../public/gear.svg?react";
// @ts-ignore
import ThumbsUp from "../../public/thumbs-up.svg?react";
// @ts-ignore
import ThumbsDown from "../../public/thumbs-down.svg?react";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";
import { Evaluation } from "@/services/content/Evaluation.ts";
import { useEvaluation } from "@/services/content/useEvaluation.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";

export const Generation: React.FC<{
  url: string;
}> = ({ url }) => {
  const evaluation = new Evaluation(url);

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

  const subjectId = useSubjectId((state) => state.subjectId);
  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const id = subjectHunkId ?? subjectId;

  const nodeEvaluation = useEvaluation((state) => state.evaluation[id]);
  const description = useDescription((state) => state.description[id]);
  const setDescription = useDescription((state) => state.setDescription);

  const nodesStore = useNodesStore((state) => state.nodesStore);

  useEffect(() => {
    if (!nodesStore) {
      return;
    }

    const node = nodesStore.getNodeById(id).node;

    if (!description) {
      setDescription(id, node?.description ?? "");
    }
  }, [subjectId, subjectHunkId]);

  const isAdvanced = useAdvanced((state) => state.isAdvanced);
  const setAdvanced = useAdvanced((state) => state.setAdvanced);
  const isAgentic = useAgentic((state) => state.isAgentic);
  const setAgentic = useAgentic((state) => state.setAgentic);

  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  if (!nodesStore) {
    return;
  }

  return (
    <div style={{ color, width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <IconButton
          loading={generationProcess[id]}
          style={{ height: "55px" }}
          onClick={async () => {
            await nodesStore.describeNode(id, {
              force: true,
            });
            await nodesStore.entitleNode(id, true);

            await nodesStore.updateStorage();
          }}
        >
          <Generate
            style={{
              color,
              width: "100%",
              height: "100%",
            }}
          />
        </IconButton>
        <IconButton
          style={{ height: "35px" }}
          onClick={() => setAdvanced(!isAdvanced)}
        >
          {isAdvanced ? (
            <Advanced
              style={{
                color,
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <Simple
              style={{
                color,
                width: "100%",
                height: "100%",
              }}
            />
          )}
        </IconButton>
        <IconButton
          style={{ height: "35px" }}
          onClick={() => setAgentic(!isAgentic)}
        >
          {isAgentic ? (
            <Agentic
              style={{
                color,
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <Gear
              style={{
                color,
                width: "100%",
                height: "100%",
              }}
            />
          )}
        </IconButton>
        {description && (
          <IconButton
            style={{ height: "35px" }}
            onClick={() => evaluation.evalNode(id, "positive")}
          >
            <ThumbsUp
              style={{
                color: nodeEvaluation === "positive" ? "green" : color,
                width: "100%",
                height: "100%",
              }}
            />
          </IconButton>
        )}
        {description && (
          <IconButton
            style={{ height: "35px" }}
            onClick={() => evaluation.evalNode(id, "negative")}
          >
            <ThumbsDown
              style={{
                color: nodeEvaluation === "negative" ? "red" : color,
                width: "100%",
                height: "100%",
              }}
            />
          </IconButton>
        )}

        {maxGenerationNodes > 0 &&
          (maxGenerationNodes - inGenerationNodes === 0 ? (
            <CircularProgress />
          ) : (
            <CircularProgress
              variant="determinate"
              value={
                ((maxGenerationNodes - inGenerationNodes) /
                  maxGenerationNodes) *
                100
              }
            />
          ))}
      </div>

      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
        {description && (
          <ReactMarkdown className={"generation"}>{description}</ReactMarkdown>
        )}
      </div>
    </div>
  );
};
