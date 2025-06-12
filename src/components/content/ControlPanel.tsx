import React from "react";
import { colors } from "@/public/colors.ts";
import { Narrator } from "@/services/content/Narrator.ts";
import { Button, CircularProgress } from "@mui/material";
import { OPEN_TAB_MESSAGE } from "@/entrypoints/background.ts";
import { useNodesStores } from "@/services/content/getNodesStore.ts";

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

  return (
    <div
      style={{
        backgroundColor: colors.DARK.PRIMARY,
        display: "flex",
        justifyContent: "center",
      }}
    >
      {narrator ? (
        <div>
          <Button variant="contained" onClick={narrator.beginStory}>
            Narrate
          </Button>
          <Button
            variant="contained"
            onClick={() => narrator.previousChapter()}
          >
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
      ) : (
        <div style={{ display: "flex" }}>
          <CircularProgress />
        </div>
      )}
    </div>
  );
};
