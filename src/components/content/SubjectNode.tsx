import React from "react";
import { Generation } from "@/components/content/Generation.tsx";
import { IconButton } from "@mui/material";
import { Navigator } from "@/components/content/Navigator.tsx";
// @ts-ignore
import Navigation from "../../public/navigation.svg?react";
// @ts-ignore
import Description from "../../public/description.svg?react";
// @ts-ignore
import Cross from "../../public/cross.svg?react";
// @ts-ignore
import GetOut from "../../public/getOut.svg?react";
// @ts-ignore
import GetIn from "../../public/getIn.svg?react";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";
import { useTitle } from "@/services/content/useTitle.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";
import { HunkJson, isHunk } from "@/types";
import { useNarrator } from "@/services/content/useNarrator.ts";
import { Chapter } from "@/services/content/Chapterize.ts";
import { useSubjectChapter } from "@/services/content/useSubjectChapter.ts";

export const SubjectNode: React.FC<{
  url: string;
}> = ({ url }) => {
  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];
  const highlightColor = colors[colorMode].HIGHLIGHT;

  const subjectId = useSubjectId((state) => state.subjectId);
  const setSubjectId = useSubjectId((state) => state.setSubjectId);
  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const setSubjectHunkId = useSubjectHunkId((state) => state.setHunkId);

  const id = subjectHunkId ?? subjectId;

  const narrator = useNarrator((state) => state.narrator);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  useEffect(() => {
    if (!narrator) {
      return;
    }

    setCurrentChapter(narrator.currentChapter());
  }, [subjectId]);

  const subjectChapter = useSubjectChapter((state) => state.chapter);
  const setSubjectChapter = useSubjectChapter((state) => state.setChapter);

  const nodesStore = useNodesStore((state) => state.nodesStore);
  if (!nodesStore) {
    return;
  }

  const node = nodesStore.getNodeById(id).node;

  let shadowNode: HunkJson;
  if (isHunk(node)) {
    shadowNode = node;
  } else {
    const { firstGeneration } = nodesStore
      .getNodeById(id)
      .getDescendantHunks(nodesStore);
    shadowNode = firstGeneration[0].node;
    for (const { node: generationNode } of firstGeneration) {
      if (
        shadowNode.endLine - shadowNode.startLine <
        generationNode.endLine - generationNode.startLine
      ) {
        shadowNode = generationNode;
      }
    }
  }
  let shadowTitle = `${shadowNode.path.split("/").pop()}-${shadowNode.startLine}`;
  if (shadowNode.startLine !== shadowNode.endLine) {
    shadowTitle += `-${shadowNode.endLine}`;
  }

  const title = useTitle((state) => state.title[id]);
  const setTitle = useTitle((state) => state.setTitle);
  useEffect(() => {
    if (!title) {
      setTitle(id, node?.title ?? "");
    }
  }, [subjectId, subjectHunkId]);

  const [isGeneration, setGeneration] = React.useState(false);
  const [isNavigation, setNavigation] = React.useState(false);
  const setExtension = (
    extension: "generation" | "navigation",
    value: boolean,
  ) => {
    if (isGeneration) {
      setGeneration(false);
    }
    if (isNavigation) {
      setNavigation(false);
    }

    (extension === "navigation" ? setNavigation : setGeneration)(value);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: "10px",
        }}
      >
        <h3
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "600px",
          }}
          title={title || shadowTitle}
        >
          {title || shadowTitle}
        </h3>
        <IconButton
          style={{ height: "35px", marginLeft: "20px" }}
          onClick={() => setExtension("generation", !isGeneration)}
        >
          <Description
            style={{
              width: "100%",
              height: "100%",
              color: isGeneration ? highlightColor : color,
            }}
          />
        </IconButton>
        {/* TODO: navigator lib error*/}
        {/*<IconButton*/}
        {/*  style={{ height: "35px" }}*/}
        {/*  onClick={() => setExtension("navigation", !isNavigation)}*/}
        {/*>*/}
        {/*  <Navigation*/}
        {/*    style={{*/}
        {/*      width: "100%",*/}
        {/*      height: "100%",*/}
        {/*      color: isNavigation ? highlightColor : color,*/}
        {/*    }}*/}
        {/*  />*/}
        {/*</IconButton>*/}
        {(subjectChapter !== null ||
          (currentChapter && currentChapter.subStory.length > 0)) && (
          <IconButton
            style={{ height: "35px" }}
            onClick={() => {
              if (subjectChapter !== null) {
                setSubjectId(subjectChapter.nodeId);
              }
              setSubjectChapter(
                subjectChapter === null ? currentChapter : null,
              );
            }}
            sx={{
              m: "1px",
              p: "1px",
            }}
          >
            {subjectChapter === null ? (
              <GetIn
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : (
              <GetOut
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            )}
          </IconButton>
        )}

        {subjectHunkId && (
          <IconButton
            style={{ height: "35px" }}
            title={"Exit Hunk Mode"}
            onClick={() => setSubjectHunkId(null)}
          >
            <Cross
              style={{
                width: "100%",
                height: "100%",
                color,
              }}
            />
          </IconButton>
        )}
      </div>

      {isGeneration && <Generation url={url} />}
      {isNavigation && <Navigator />}
    </div>
  );
};
