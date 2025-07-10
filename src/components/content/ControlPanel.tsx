import React from "react";
import { colors } from "@/public/colors.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { CircularProgress, IconButton } from "@mui/material";
import { OPEN_TAB_MESSAGE } from "@/entrypoints/background.ts";
import { useNodesStores } from "@/services/content/useNodesStores.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import {
  COLOR_MODE_STORAGE_KEY,
  getColorMode,
} from "@/services/content/getColorMode.ts";
import { ColorModeSwitch } from "@/components/content/ControlPanel/ColorModeSwitch.tsx";
import { useHunkLinesHandler } from "@/services/content/useHunkLinesHandler.ts";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
// @ts-ignore
import Hierarchy from "../../public/hierarchy.svg?react";
// @ts-ignore
import GoToStart from "../../public/goToStart.svg?react";
// @ts-ignore
import Previous from "../../public/previous.svg?react";
// @ts-ignore
import Next from "../../public/next.svg?react";
// @ts-ignore
import Scroll from "../../public/scroll.svg?react";
import { SubjectNode } from "@/components/content/SubjectNode.tsx";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";

export const ControlPanel: React.FC<{
  url: string;
}> = ({ url }) => {
  const [narrator, setNarrator] = React.useState<Narrator>();
  const nodesStore = useNodesStores((state) => state.nodesStores[url]);
  useEffect(() => {
    if (!nodesStore) {
      return;
    }

    setNarrator(new Narrator(nodesStore));
  }, [nodesStore]);

  const hunkLinesHandler = useHunkLinesHandler(
    (state) => state.hunkLinesHandler,
  );

  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const subjectId = useSubjectId((state) => state.subjectId);

  const [isFirst, setFirst] = useState(false);
  const [isLast, setLast] = useState(true);
  useEffect(() => {
    if (!narrator) {
      return;
    }

    setFirst(narrator.isFirst());
    setLast(narrator.isLast());
  }, [subjectId]);

  const colorMode = useColorMode((state) => state.colorMode);
  const setColorMode = useColorMode((state) => state.setColorMode);
  useEffect(() => {
    getColorMode().then((colorMode) => setColorMode(colorMode));
  }, []);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors[colorMode].PRIMARY,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "55px",
        }}
      >
        <ColorModeSwitch
          checked={colorMode === "DARK"}
          onChange={async () => {
            const newColorMode = colorMode === "DARK" ? "LIGHT" : "DARK";

            setColorMode(newColorMode);
            await storage.setItem(COLOR_MODE_STORAGE_KEY, newColorMode);
          }}
        />

        {narrator && (
          <div style={{ height: "100%" }}>
            <IconButton
              disabled={isFirst || !!subjectHunkId}
              style={{ height: "100%" }}
              onClick={narrator.beginStory}
            >
              <GoToStart
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            </IconButton>
            <IconButton
              disabled={isFirst || !!subjectHunkId}
              style={{ height: "100%" }}
              onClick={narrator.previousChapter}
            >
              <Previous
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            </IconButton>
            <IconButton
              disabled={isLast || !!subjectHunkId}
              style={{ height: "100%" }}
              onClick={narrator.nextChapter}
            >
              <Next
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            </IconButton>
            <IconButton
              disabled={!!subjectHunkId}
              style={{ height: "100%" }}
              onClick={hunkLinesHandler?.scroll}
            >
              <Scroll
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            </IconButton>
          </div>
        )}

        {narrator && (
          <IconButton
            onClick={async () => {
              const parameterizedUrl = `${browser.runtime.getURL("/graph.html")}?url=${url}`;
              browser.runtime.sendMessage({
                action: OPEN_TAB_MESSAGE,
                url: parameterizedUrl,
              });
            }}
            style={{ height: "100%" }}
          >
            <Hierarchy style={{ fill: color, width: "100%", height: "100%" }} />
          </IconButton>
        )}

        {!narrator && <CircularProgress style={{ marginRight: "10px" }} />}
      </div>

      {narrator && <SubjectNode nodesStore={nodesStore} />}
    </div>
  );
};
