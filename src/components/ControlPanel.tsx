import React from "react";
import { colors } from "@/public/colors.ts";
import { Commit } from "@/types";
import { Narrator } from "@/services/content/Narrator.ts";

export const ControlPanel: React.FC<{ commit: Commit }> = ({ commit }) => {
  const narrator = new Narrator(commit);

  return (
    <div
      style={{
        backgroundColor: colors.APP,
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
      <button onClick={narrator.beginStory}>Narrate</button>
      <button onClick={() => narrator.previousChapter()}>Previous</button>
      <button onClick={() => narrator.nextChapter()}>Next</button>
    </div>
  );
};
