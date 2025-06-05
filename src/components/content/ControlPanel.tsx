import React from "react";
import { colors } from "@/public/colors.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { Button } from "@mui/material";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { OPEN_TAB_MESSAGE } from "@/entrypoints/background.ts";

export const ControlPanel: React.FC<{
  url: string;
  nodesStore: NodesStore;
}> = ({ url, nodesStore }) => {
  const narrator = new Narrator(nodesStore);

  return (
    <div
      style={{
        backgroundColor: colors.PRIMARY,
      }}
    >
      <Button variant="contained" onClick={narrator.beginStory}>
        Narrate
      </Button>
      <Button variant="contained" onClick={() => narrator.previousChapter()}>
        Previous
      </Button>
      <Button variant="contained" onClick={() => narrator.nextChapter()}>
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
  );
};
