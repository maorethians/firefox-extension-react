import React, { Dispatch, SetStateAction } from "react";
import { Button, TextField } from "@mui/material";
import { colors } from "@/public/colors.ts";
import { GroqClient } from "@/services/content/llm/GroqClient.ts";

export const API_KEY_STORAGE_KEY = "local:changeNarrator:apiKey";

export const APIKey: React.FC = () => {
  const [key, setKey] = useState("");
  const [error, setError] = React.useState<string | null>(null);

  storage.getItem(API_KEY_STORAGE_KEY).then((key) => {
    if (typeof key != "string") {
      return;
    }

    setKey(key);
  });

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <TextField
        label="API Key"
        variant="filled"
        style={{ backgroundColor: colors.SECONDARY }}
        value={key}
        onChange={(e) => {
          setError(null);
          setKey(e.target.value);
        }}
        type={"password"}
        error={!!error}
      />
      <Button
        variant="contained"
        onClick={async () => await verifyAndSaveKey(key, setError)}
      >
        Save
      </Button>
    </div>
  );
};

const verifyAndSaveKey = async (
  key: string,
  setError: Dispatch<SetStateAction<string | null>>,
) => {
  const isKeyValid = await GroqClient.verifyKey(key);
  if (!isKeyValid) {
    setError("Invalid Key");
    return;
  }

  await storage.setItem(API_KEY_STORAGE_KEY, key);
};
