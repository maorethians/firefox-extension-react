import React from "react";
import { TextField } from "@mui/material";
import { colors } from "@/public/colors.ts";

export const APIKey: React.FC = () => {
  return (
    <div>
      <TextField
        label="API Key"
        variant="filled"
        style={{ backgroundColor: colors.SECONDARY }}
      />
    </div>
  );
};
