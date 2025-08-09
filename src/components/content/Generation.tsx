import React from "react";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";
import { CircularProgress, IconButton } from "@mui/material";
import { useGenerationProcess } from "@/services/content/useGenerationProcess.ts";
import { useAdvanced } from "@/services/content/useAdvanced.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import ReactMarkdown from "react-markdown";
// @ts-ignore
import Generate from "../../public/generate.svg?react";
// @ts-ignore
import Advanced from "../../public/advanced.svg?react";
// @ts-ignore
import Simple from "../../public/simple.svg?react";
// @ts-ignore
import ThumbsUp from "../../public/thumbs-up.svg?react";
// @ts-ignore
import ThumbsDown from "../../public/thumbs-down.svg?react";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";
import { Evaluation } from "@/services/content/Evaluation.ts";
import { useEvaluation } from "@/services/content/useEvaluation.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";
import { useRangeHandler } from "@/services/content/useRangeHandler.ts";

export const Generation: React.FC<{
  url: string;
}> = ({ url }) => {
  const evaluation = new Evaluation(url);

  const subjectId = useSubjectId((state) => state.subjectId);
  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const id = subjectHunkId ?? subjectId;

  const nodeEvaluation = useEvaluation((state) => state.evaluation[id]);
  const description = useDescription((state) => state.description[id]);
  const setDescription = useDescription((state) => state.setDescription);

  const nodesStore = useNodesStore((state) => state.nodesStore);
  const rangeHandler = useRangeHandler((state) => state.rangeHandler);

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

  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  if (!nodesStore) {
    return;
  }

  const generationProcess = useGenerationProcess(
    (state) => state.generationProcess[id],
  );
  const allDependencies = nodesStore
    .getNodeById(id)
    .getDependencyGraphNodesId(nodesStore);
  const remainingDependencies = generationProcess?.remainingDependencies;
  const generationProcessState = generationProcess?.state;

  const promptIdsDetail = nodesStore.getPromptIdsDetail(id);

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
          loading={generationProcessState === "waiting"}
          style={{ height: "55px" }}
          onClick={async () => {
            const node = nodesStore!.getNodeById(id);
            await node.wrappedDescribeNode(nodesStore, {
              invalidateCache: true,
            });

            await nodesStore!.updateStorage();
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

        {generationProcessState === "waiting" &&
          (remainingDependencies?.length === allDependencies.length ||
          remainingDependencies?.length === 0 ? (
            <CircularProgress />
          ) : (
            <CircularProgress
              variant="determinate"
              value={
                (100 *
                  (allDependencies.length - remainingDependencies.length)) /
                allDependencies.length
              }
            />
          ))}
      </div>

      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
        {description && (
          <div className={"generation"}>
            <ReactMarkdown
              components={{
                code: (input) => {
                  const content = input?.children as string;
                  if (
                    content &&
                    content.startsWith("code_") &&
                    promptIdsDetail[content]
                  ) {
                    const detail = promptIdsDetail[content];
                    return (
                      <a
                        onClick={() => {
                          if (rangeHandler) {
                            rangeHandler.scrollRange(detail);
                          }
                        }}
                      >
                        {content}
                      </a>
                    );
                  }
                  return <code>{content}</code>;
                },
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
