import React from "react";
import { colors } from "@/public/colors.ts";
import { CircularProgress, IconButton } from "@mui/material";
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
import { MessageStatementsAgent } from "@/services/content/llm/agents/MessageStatementsAgent";
import ReactMarkdown from "react-markdown";
import { getMessageContent } from "@/components/content/Explorer/getMessageContent.ts";
import { HumanMessage } from "@langchain/core/messages";

export { MessageIcon };

const nodeId = "messageStatements";

export const Message: React.FC<{
  url: string;
}> = ({ url }) => {
  const evaluation = new Evaluation(url);
  const evalNode = (value: Eval) => evaluation.evalNode(nodeId, value);
  const explorerEvaluation = useEvaluation((state) => state.evaluation[nodeId]);

  const [statements, setStatements] = useState<string[]>([]);

  const nodesStore = useNodesStore((state) => state.nodesStore);
  if (!nodesStore) {
    return;
  }

  useEffect(() => {
    setStatements(nodesStore.getMessageStatements());
  }, []);

  const [generationProcess, setGenerationProcess] =
    useState<ProcessState>("result");

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
        <IconButton
          loading={generationProcess === "waiting"}
          style={{ height: "55px" }}
          onClick={async () => {
            setGenerationProcess("waiting");

            const agent = new MessageStatementsAgent();
            await agent.init();
            const response = await agent.invoke({
              messages: [new HumanMessage(getMessageContent())],
            });

            nodesStore.setMessageStatements(response.statemets);
            setStatements(nodesStore.getMessageStatements());
            await nodesStore.updateStorage();

            setGenerationProcess("result");
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
        {statements.length !== 0 && (
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
        )}
        {statements.length !== 0 && (
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
        )}
        {generationProcess === "waiting" && <CircularProgress />}
      </div>
      <div
        style={{
          paddingLeft: "30px",
          paddingRight: "10px",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        <ReactMarkdown>
          {statements
            .map((statement) =>
              statement.startsWith("- ") ? statement : `- ${statement}`,
            )
            .join("  \n")}
        </ReactMarkdown>
      </div>
    </div>
  );
};
