import React from "react";
import { colors } from "@/public/colors.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { Button, CircularProgress } from "@mui/material";
import { OPEN_TAB_MESSAGE } from "@/entrypoints/background.ts";
import { useNodesStores } from "@/services/content/useNodesStores.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import {
  COLOR_MODE_STORAGE_KEY,
  getColorMode,
} from "@/services/content/getColorMode.ts";
import { MUISwitch } from "@/components/content/ControlPanel/MUISwitch.tsx";
import { useHunkLinesHandler } from "@/services/content/useHunkLinesHandler.ts";

export const ControlPanel: React.FC<{
  url: string;
}> = ({ url }) => {
  const [narrator, setNarrator] = React.useState<Narrator>();
  const [isFirst, setIsFirst] = React.useState(true);
  const [isLast, setIsLast] = React.useState(true);
  const nodesStore = useNodesStores((state) => state.nodesStores[url]);

  useEffect(() => {
    if (!nodesStore) {
      return;
    }

    setNarrator(new Narrator(nodesStore, setIsFirst, setIsLast));
  }, [nodesStore]);

  const hunkLinesHandler = useHunkLinesHandler(
    (state) => state.hunkLinesHandler,
  );

  const colorMode = useColorMode((state) => state.colorMode);
  const setColorMode = useColorMode((state) => state.setColorMode);
  useEffect(() => {
    getColorMode().then((colorMode) => setColorMode(colorMode));
  }, []);

  return (
    <div
      style={{
        backgroundColor: colors[colorMode].PRIMARY,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <MUISwitch
        checked={colorMode === "DARK"}
        onChange={async () => {
          const newColorMode = colorMode === "DARK" ? "LIGHT" : "DARK";

          setColorMode(newColorMode);
          await storage.setItem(COLOR_MODE_STORAGE_KEY, newColorMode);
        }}
      />
      {narrator ? (
        <div style={{ display: "flex", flexDirection: "row" }}>
          <Button variant="contained" onClick={narrator.beginStory}>
            Begin
          </Button>
          <Button
            disabled={isFirst}
            variant="contained"
            onClick={narrator.previousChapter}
          >
            Previous
          </Button>
          <Button
            disabled={isLast}
            variant="contained"
            onClick={narrator.nextChapter}
          >
            Next
          </Button>
          <div style={{ marginLeft: "10px" }}></div>
          <Button
            variant="contained"
            onClick={() => hunkLinesHandler?.scrollPrevious()}
          >
            Previous
          </Button>
          <Button
            variant="contained"
            onClick={() => hunkLinesHandler?.scrollNext()}
          >
            Next
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const parameterizedUrl = `${browser.runtime.getURL("/graph.html")}?url=${url}`;
              browser.runtime.sendMessage({
                action: OPEN_TAB_MESSAGE,
                url: parameterizedUrl,
              });
            }}
          >
            Graph
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex" }}>
          <CircularProgress />
        </div>
      )}
    </div>
  );
};
