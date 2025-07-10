import React from "react";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Generation } from "@/components/content/Generation.tsx";
import { IconButton } from "@mui/material";
import { Navigator } from "@/components/content/Navigator.tsx";
// @ts-ignore
import Navigation from "../../public/navigation.svg?react";
// @ts-ignore
import Description from "../../public/description.svg?react";
// @ts-ignore
import Cross from "../../public/cross.svg?react";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";
import { useTitle } from "@/services/content/useTitle.ts";

export const SubjectNode: React.FC<{
  nodesStore: NodesStore;
}> = ({ nodesStore }) => {
  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];
  const highlightColor = colors[colorMode].HIGHLIGHT;

  const subjectId = useSubjectId((state) => state.subjectId);
  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const setSubjectHunkId = useSubjectHunkId((state) => state.setHunkId);

  const id = subjectHunkId ?? subjectId;

  const title = useTitle((state) => state.title[id]);
  const setTitle = useTitle((state) => state.setTitle);
  useEffect(() => {
    const node = nodesStore.getNodeById(id).node;

    if (!title) {
      setTitle(id, node.title ?? "");
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
          title={title || id}
        >
          {title || id}
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
        <IconButton
          style={{ height: "35px" }}
          onClick={() => setExtension("navigation", !isNavigation)}
        >
          <Navigation
            style={{
              width: "100%",
              height: "100%",
              color: isNavigation ? highlightColor : color,
            }}
          />
        </IconButton>
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

      {isGeneration && <Generation nodesStore={nodesStore} />}
      {isNavigation && <Navigator nodesStore={nodesStore} />}
    </div>
  );
};
