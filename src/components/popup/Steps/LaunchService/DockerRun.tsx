import React, { useEffect } from "react";
import { Button, TextField } from "@mui/material";
import { StorageItemKey } from "@wxt-dev/storage";
import { colors } from "@/public/colors.ts";
import { debounce } from "lodash";

const GITHUB_TOKEN_STORAGE_KEY: StorageItemKey =
  "local:changeNarrator:githubKey";

export const DockerRun: React.FC = () => {
  const [githubToken, setGithubToken] = React.useState<string>("");
  useEffect(() => {
    storage.getItem(GITHUB_TOKEN_STORAGE_KEY).then((key) => {
      if (typeof key != "string") {
        return;
      }

      setGithubToken(key);
    });
  }, []);
  const githubTokenDebounce = useCallback(
    debounce(
      (value: string) => storage.setItem(GITHUB_TOKEN_STORAGE_KEY, value),
      500,
    ),
    [],
  );
  useEffect(() => {
    githubTokenDebounce(githubToken);
  }, [githubToken]);

  const [command, setCommand] = React.useState("");
  useEffect(() => {
    setCommand(
      `docker run -p 8080:8080 -e GITHUB_TOKEN=${githubToken === "" ? "$GITHUB_TOKEN" : githubToken} maorethians/change-narrator`,
    );
  }, [githubToken]);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TextField
          label="Github Token"
          variant="filled"
          style={{ backgroundColor: colors.SECONDARY }}
          value={githubToken}
          onChange={(e) => {
            setGithubToken(e.target.value);
          }}
          type={"password"}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TextField
          label="Command"
          variant="filled"
          style={{ backgroundColor: colors.SECONDARY }}
          value={command}
          contentEditable={false}
          fullWidth
          slotProps={{
            input: {
              sx: { fontSize: "10px" },
            },
          }}
        />
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(command);
            } catch (err) {}
          }}
          size="small"
        >
          Copy
        </Button>
      </div>
    </div>
  );
};
