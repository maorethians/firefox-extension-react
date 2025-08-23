import React from "react";
import { colors } from "@/public/colors.ts";
import { Narrator, StoryType } from "@/services/content/Narrator.ts";
import { CircularProgress, IconButton, Slider } from "@mui/material";
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

const options: [number, StoryType][] = [
  [1, "context"],
  [2, "similar"],
  [3, "common"],
  [4, "requirements"],
  [5, "base"],
];

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

    setStoryLength(narrator.activeStory.length);
    setCurrentIndex(narrator.currentIndex());
  }, [nodesStore]);

  const [storyGranularity, setStoryGranularity] = useState(5);
  useEffect(() => {
    if (!narrator) {
      return;
    }

    const label = options.find((option) => option[0] === storyGranularity)?.[1];
    if (!label) {
      return;
    }

    narrator.setActiveStory(label);
    setStoryLength(narrator.activeStory.length);
    setCurrentIndex(narrator.currentIndex());
  }, [storyGranularity]);

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
          height: "45px",
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
              sx={{
                m: "1px",
                p: "1px",
              }}
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
              sx={{
                m: "1px",
                p: "1px",
              }}
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
              sx={{
                m: "1px",
                p: "1px",
              }}
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
              sx={{
                m: "1px",
                p: "1px",
              }}
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
              sx={{
                m: "1px",
                p: "1px",
              }}
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
              sx={{
                m: "1px",
                p: "1px",
              }}
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
            sx={{
              m: "1px",
              p: "1px",
            }}
          >
            <Hierarchy style={{ fill: color, width: "100%", height: "100%" }} />
          </IconButton>
        )}

        {!narrator && <CircularProgress style={{ marginRight: "10px" }} />}
      </div>

      {narrator && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "15%",
            }}
          >
            <Slider
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => {
                const label = options.find(
                  (option) => option[0] === value,
                )?.[1];
                if (!label) {
                  return value;
                }

                return label;
              }}
              marks
              min={1}
              max={5}
              step={1}
              value={storyGranularity}
              onChange={(_event: Event, newValue) => {
                setStoryGranularity(newValue);
              }}
              size={"small"}
              sx={{
                m: 0,
                p: 0,
              }}
            />
          </div>
        </div>
      )}

      {narrator && !subjectHunkId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            paddingLeft: "20px",
            paddingRight: "20px",
            height: "25px",
          }}
        >
          <Slider
            valueLabelDisplay="off"
            marks
            min={1}
            max={narrator?.activeStory.length}
            step={1}
            value={currentIndex + 1}
            onChange={(_event: Event, newValue) => narrator?.goto(newValue - 1)}
            size={"small"}
            sx={{
              m: 0,
              p: 0,
            }}
          />
        </div>
      )}

      {narrator && <SubjectNode url={url} />}
    </div>
  );
};
