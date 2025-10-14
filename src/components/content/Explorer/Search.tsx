import React from "react";
import { colors } from "@/public/colors.ts";
import { CircularProgress, IconButton, TextField } from "@mui/material";
import { useColorMode } from "@/services/content/useColorMode.ts";
// @ts-ignore
import ThumbsUp from "../../../public/thumbs-up.svg?react";
// @ts-ignore
import ThumbsDown from "../../../public/thumbs-down.svg?react";
import { Evaluation } from "@/services/content/Evaluation.ts";
import { Eval, useEvaluation } from "@/services/content/useEvaluation.ts";
import { useNodesStore } from "@/services/content/useNodesStore.ts";
// @ts-ignore
import MessageIcon from "../../../public/message.svg?react";
// @ts-ignore
import Generate from "../../../public/generate.svg?react";
import { ProcessState } from "@/services/content/useGenerationProcess.ts";
import { useSearchQuery } from "@/services/content/useSearchQuery.ts";
import { SearchAgent } from "@/services/content/llm/agents/SearchAgent";
import ReactMarkdown from "react-markdown";
import { useRangeHandler } from "@/services/content/useRangeHandler";
import { replaceCodeIds } from "../Generation";
import { Hunk } from "@/services/content/graph/Hunk";
import { keyBy } from "lodash";

export { MessageIcon };

const nodeId = "searchEngine";

export const Search: React.FC<{
  url: string;
}> = ({ url }) => {
  const evaluation = new Evaluation(url);
  const evalNode = (value: Eval) => evaluation.evalNode(nodeId, value);
  const explorerEvaluation = useEvaluation((state) => state.evaluation[nodeId]);

  const searchQuery = useSearchQuery((state) => state.searchQuery);
  const setSearchQuery = useSearchQuery((state) => state.setSearchQuery);

  const [error, setError] = useState("");

  const [hunks, setHunks] = useState<string[]>([]);

  const nodesStore = useNodesStore((state) => state.nodesStore);
  const rangeHandler = useRangeHandler((state) => state.rangeHandler);
  if (!nodesStore || !rangeHandler) {
    return;
  }

  const hunksDetail = hunks.map((hunkId) =>
    (nodesStore.getNodeById(hunkId) as Hunk).getDetail(nodesStore),
  );

  const [searchProcess, setSearchProcess] = useState<ProcessState>("result");

  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: colors[colorMode].PRIMARY,
          width: "100%",
        }}
      >
        <TextField
          style={{
            backgroundColor:
              colors[colorMode === "DARK" ? "LIGHT" : "DARK"].PRIMARY,
          }}
          sx={{
            "& .MuiFilledInput-input": {
              color: colors[colorMode].PRIMARY,
            },
          }}
          variant="filled"
          value={searchQuery}
          onChange={(e) => {
            setError("");
            setSearchQuery(e.target.value);
          }}
          error={!!error}
          label={error || "Search query"}
        />
        <IconButton
          loading={searchProcess === "waiting"}
          style={{ height: "55px" }}
          onClick={async () => {
            if (searchQuery.trim().length === 0) {
              setError("Search for something");
              return;
            }

            const rootDescription =
              nodesStore.getNodeById("root")?.node.description;
            if (!rootDescription) {
              setError("Generate description first");
              return;
            }

            setSearchProcess("waiting");

            const searchAgent = new SearchAgent();
            await searchAgent.init();
            const response = await searchAgent.invoke({ query: searchQuery });
            setHunks(Array.from(response.hunks));

            setSearchProcess("result");
          }}
        >
          <Generate
            style={{
              color,
              width: "100%",
              height: "100%",
            }}
          />
        </IconButton>
        <IconButton
          style={{ height: "27px" }}
          onClick={() => evalNode("positive")}
          sx={{
            m: "1px",
            p: "1px",
          }}
        >
          <ThumbsUp
            style={{
              color: explorerEvaluation === "positive" ? "green" : color,
              width: "100%",
              height: "100%",
            }}
          />
        </IconButton>
        <IconButton
          style={{ height: "27px" }}
          onClick={() => evalNode("negative")}
          sx={{
            m: "1px",
            p: "1px",
          }}
        >
          <ThumbsDown
            style={{
              color: explorerEvaluation === "negative" ? "red" : color,
              width: "100%",
              height: "100%",
            }}
          />
        </IconButton>
        {searchProcess === "waiting" && <CircularProgress />}
      </div>
      <div
        style={{
          paddingLeft: "30px",
          paddingRight: "10px",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        <ReactMarkdown
          components={{
            code: ({ children }) => {
              if (typeof children !== "string") {
                return <code>{children}</code>;
              }

              const resultChildren = replaceCodeIds(
                children,
                keyBy(hunksDetail, "promptId"),
                rangeHandler,
              );
              return <code>{resultChildren}</code>;
            },
          }}
        >
          {"\`" + hunksDetail.map((h) => h.promptId).join(", ") + "\`"}
        </ReactMarkdown>
      </div>
    </div>
  );
};
