import React from "react";
import { colors } from "@/public/colors.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { CircularProgress, IconButton, LinearProgress } from "@mui/material";
import { OPEN_TAB_MESSAGE } from "@/entrypoints/background.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import {
  COLOR_MODE_STORAGE_KEY,
  getColorMode,
} from "@/services/content/getColorMode.ts";
import { ColorModeSwitch } from "@/components/content/ControlPanel/ColorModeSwitch.tsx";
import { useRangeHandler } from "@/services/content/useRangeHandler.ts";
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
// @ts-ignore
import ThumbsUp from "../../public/thumbs-up.svg?react";
// @ts-ignore
import ThumbsDown from "../../public/thumbs-down.svg?react";
import { SubjectNode } from "@/components/content/SubjectNode.tsx";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";
import { Evaluation } from "@/services/content/Evaluation.ts";
import { useEvaluation } from "@/services/content/useEvaluation.ts";

export const ControlPanel: React.FC<{
  url: string;
}> = ({ url }) => {
  const evaluation = new Evaluation(url);

  const [storyLength, setStoryLength] = useState(2);
  const [currentIndex, setCurrentIndex] = useState(1);

  const [narrator, setNarrator] = React.useState<Narrator>();
  const nodesStore = useNodesStore((state) => state.nodesStore);
  useEffect(() => {
    if (!nodesStore) {
      return;
    }

    const narrator = new Narrator(nodesStore);
    setNarrator(narrator);

    setStoryLength(narrator.story.length);
    setCurrentIndex(narrator.currentIndex());
  }, [nodesStore]);

  const rangeHandler = useRangeHandler((state) => state.rangeHandler);

  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const subjectId = useSubjectId((state) => state.subjectId);

  const storyEvaluation = useEvaluation((state) => state.evaluation["story"]);

  useEffect(() => {
    if (!narrator) {
      return;
    }

    setCurrentIndex(narrator.currentIndex());
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
              disabled={currentIndex === 0 || !!subjectHunkId}
              style={{ height: "100%" }}
              onClick={narrator.begin}
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
              disabled={currentIndex === 0 || !!subjectHunkId}
              style={{ height: "100%" }}
              onClick={narrator.previous}
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
              disabled={currentIndex === storyLength - 1 || !!subjectHunkId}
              style={{ height: "100%" }}
              onClick={narrator.next}
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
              onClick={rangeHandler?.scrollSubject}
            >
              <Scroll
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            </IconButton>
            <IconButton
              disabled={!!subjectHunkId}
              style={{ height: "60%" }}
              onClick={() => evaluation.evalNode("story", "positive")}
            >
              <ThumbsUp
                style={{
                  color: storyEvaluation === "positive" ? "green" : color,
                  width: "100%",
                  height: "100%",
                }}
              />
            </IconButton>
            <IconButton
              disabled={!!subjectHunkId}
              style={{ height: "60%" }}
              onClick={() => evaluation.evalNode("story", "negative")}
            >
              <ThumbsDown
                style={{
                  color: storyEvaluation === "negative" ? "red" : color,
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

      {!subjectHunkId && (
        <LinearProgress
          variant="determinate"
          value={(100 * currentIndex) / (storyLength - 1)}
          style={{ height: "2px" }}
        />
      )}

      {narrator && <SubjectNode url={url} />}
    </div>
  );
};
