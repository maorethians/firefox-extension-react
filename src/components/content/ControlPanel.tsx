import React from "react";
import { colors } from "@/public/colors.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { Button } from "@mui/material";
import { NodesStore } from "@/services/content/NodesStore.ts";

export const ControlPanel: React.FC<{ nodesStore: NodesStore }> = ({
  nodesStore,
}) => {
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
    </div>
  );
};
