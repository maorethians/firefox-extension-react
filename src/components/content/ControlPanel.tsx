import React from "react";
import { colors } from "@/public/colors.ts";
import { CircularProgress, IconButton, Slider, Tab, Tabs } from "@mui/material";
import { OPEN_TAB_MESSAGE } from "@/entrypoints/background.ts";
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
import Tools from "../../public/tools.svg?react";
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
// @ts-ignore
import SearchIcon from "../../public/search.svg?react";
import { SubjectNode } from "@/components/content/SubjectNode.tsx";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";
import { Evaluation } from "@/services/content/Evaluation.ts";
import { Eval, useEvaluation } from "@/services/content/useEvaluation.ts";
import { useStoryGranularity } from "@/services/content/useStoryGranularity.ts";
import { useNarrator } from "@/services/content/useNarrator.ts";
import { useSubjectChapter } from "@/services/content/useSubjectChapter.ts";
import {
  Message,
  MessageIcon,
} from "@/components/content/Explorer/Message.tsx";
import { Box } from "@mui/system";
import { Search } from "@/components/content/Explorer/Search";

const steps = [
  { Component: Message, Icon: MessageIcon },
  { Component: Search, Icon: SearchIcon },
];

export const ControlPanel: React.FC<{
  url: string;
}> = ({ url }) => {
  const [step, setStep] = React.useState(0);
  const Component = steps[step].Component;

  const evaluation = new Evaluation(url);
  const evalNode = (value: Eval) => evaluation.evalNode("story", value);
  const storyEvaluation = useEvaluation((state) => state.evaluation["story"]);

  const [isToolsSelected, selectTools] = useState(false);

  const [storyLength, setStoryLength] = useState(2);
  const [currentIndex, setCurrentIndex] = useState(1);

  const narrator = useNarrator((state) => state.narrator);
  useEffect(() => {
    if (!narrator) {
      return;
    }

    setStoryLength(narrator.activeStory.length);
    setCurrentIndex(narrator.currentIndex());
  }, [narrator]);

  const storyGranularity = useStoryGranularity(
    (state) => state.storyGranularity,
  );
  const setGranularity = useStoryGranularity((state) => state.setGranularity);
  const subjectChapter = useSubjectChapter((state) => state.chapter);
  useEffect(() => {
    if (!narrator) {
      return;
    }

    narrator.updateActiveStory();

    console.log(narrator);
    setStoryLength(narrator.activeStory.length);
    setCurrentIndex(narrator.currentIndex());
  }, [storyGranularity, subjectChapter]);

  const rangeHandler = useRangeHandler((state) => state.rangeHandler);

  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const subjectId = useSubjectId((state) => state.subjectId);

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
        {narrator && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
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
            <IconButton
              disabled={currentIndex === 0 || !!subjectHunkId}
              style={{ height: "70%" }}
              onClick={() => selectTools(!isToolsSelected)}
              sx={{
                m: "1px",
                p: "1px",
              }}
            >
              <Tools
                style={{
                  color,
                  width: "100%",
                  height: "100%",
                }}
              />
            </IconButton>
          </div>
        )}

        {narrator && !isToolsSelected && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "25px",
                width: "100px",
                paddingLeft: "8px",
                paddingRight: "20px",
              }}
            >
              <Slider
                valueLabelDisplay="off"
                marks
                min={0}
                max={narrator.availableStories.length - 1}
                step={1}
                value={storyGranularity}
                onChange={(_event: Event, newValue) => {
                  setGranularity(newValue);
                }}
                size={"small"}
                sx={{
                  m: 0,
                  p: 0,
                }}
              />
            </div>
            <IconButton
              disabled={!!subjectHunkId}
              style={{ height: "60%" }}
              onClick={() => evalNode("positive")}
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
              onClick={() => evalNode("negative")}
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
        <div>
          {!isToolsSelected && (
            <div>
              {!subjectHunkId && (
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
                    onChange={(_event: Event, newValue) =>
                      narrator?.goto(newValue - 1)
                    }
                    size={"small"}
                    sx={{
                      m: 0,
                      p: 0,
                    }}
                  />
                </div>
              )}

              <SubjectNode url={url} />
            </div>
          )}
          {isToolsSelected && (
            <div>
              <Box sx={{ width: "100%" }}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={step}
                    onChange={(_event, newStep: number) => {
                      setStep(newStep);
                    }}
                    aria-label="basic tabs example"
                  >
                    {steps.map(({ Icon }) => (
                      <Tab
                        icon={<Icon style={{ height: "25px", color }} />}
                        style={{ flex: 1 }}
                      />
                    ))}
                  </Tabs>
                </Box>
              </Box>

              {Component && (
                <div style={{ marginTop: "15px" }}>
                  <Component url={url} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
