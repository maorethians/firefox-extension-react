import React from "react";
// @ts-ignore
import { IconButton } from "@mui/material";
// @ts-ignore
import Export from "../../../public/export.svg?react";
import { Evaluation } from "@/services/content/Evaluation.ts";

export const ExportEvaluation: React.FC = () => {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <IconButton
        onClick={async () => {
          const evaluation = await Evaluation.getExport();

          const blob = new Blob([JSON.stringify(evaluation)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          link.download = "export.json";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          URL.revokeObjectURL(url);
        }}
        style={{ height: "100%", width: "40px" }}
      >
        <Export style={{ height: "100%" }} />
      </IconButton>
    </div>
  );
};
