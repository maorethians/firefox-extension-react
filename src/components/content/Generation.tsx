import React, { JSX } from "react";
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
import { Dictionary, isArray } from "lodash";
import { AIDetail } from "@/services/content/graph/Hunk.ts";
import { RangeHandler } from "@/services/content/RangeHandler.ts";

const codeIdRegex = /code_[A-Z0-9]+/g;

export const replaceCodeIds = (
  text: string,
  promptIdsDetail: Dictionary<AIDetail>,
  rangeHandler: RangeHandler,
) => {
  const codeIds = text.match(codeIdRegex);
  if (!codeIds) {
    return text;
  }

  const resultChildren: (string | JSX.Element)[] = [];

  const nonIds = text.split(codeIdRegex);
  for (let nonIdIndex = 0; nonIdIndex < nonIds.length; nonIdIndex++) {
    resultChildren.push(nonIds[nonIdIndex]);

    const codeId = codeIds[nonIdIndex];
    if (!codeId) {
      break;
    }

    const detail = promptIdsDetail[codeId];
    resultChildren.push(
      detail ? (
        <a
          onClick={() => {
            if (rangeHandler) {
              rangeHandler.scrollRange(detail.path, detail.srcDst, detail);
            }
          }}
        >
          {codeId}
        </a>
      ) : (
        codeId
      ),
    );
  }

  return resultChildren;
};

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

  const promptIdsDetail = nodesStore
    .getNodeById(id)
    .getPromptIdsDetail(nodesStore);

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
                code: ({ children }) => {
                  if (typeof children !== "string" || !rangeHandler) {
                    return <code>{children}</code>;
                  }

                  const resultChildren = replaceCodeIds(
                    children,
                    promptIdsDetail,
                    rangeHandler,
                  );
                  return <code>{resultChildren}</code>;
                },
                strong: ({ children }) => {
                  if (typeof children !== "string" || !rangeHandler) {
                    return <strong>{children}</strong>;
                  }

                  const resultChildren = replaceCodeIds(
                    children,
                    promptIdsDetail,
                    rangeHandler,
                  );
                  return <strong>{resultChildren}</strong>;
                },
                p: ({ children }) => {
                  if (!children) {
                    return <span>No Children</span>;
                  }

                  if (!rangeHandler) {
                    return <p>{children}</p>;
                  }

                  const validChildren = isArray(children)
                    ? children
                    : [children];
                  const resultChildren = validChildren
                    .map((child) => {
                      if (typeof child !== "string") {
                        return child;
                      }

                      return replaceCodeIds(
                        child,
                        promptIdsDetail,
                        rangeHandler,
                      );
                    })
                    .flat();

                  return <p>{resultChildren}</p>;
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
