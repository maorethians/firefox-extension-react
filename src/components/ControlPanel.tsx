import React from "react";
import { colors } from "@/public/colors.ts";
import { Commit } from "@/types";
import { Narrator } from "@/services/content/Narrator.ts";
import { Button } from "@mui/material";

export const ControlPanel: React.FC<{ commit: Commit }> = ({ commit }) => {
  const narrator = new Narrator(commit);

  return (
    <div
      style={{
        backgroundColor: colors.PRIMARY,
      }}
    >
      <h2
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        Change Narrator
      </h2>
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
