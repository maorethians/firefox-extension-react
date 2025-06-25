import React, { useEffect } from "react";
import { Chip, IconButton, TextField } from "@mui/material";
import { colors } from "@/public/colors.ts";
import { StorageItemKey } from "@wxt-dev/storage";
import { debounce } from "lodash";
import { ContainerClient } from "@/services/ContainerClient.ts";
// @ts-ignore
import Copy from "../../../public/copy.svg?react";

const GITHUB_TOKEN_STORAGE_KEY: StorageItemKey =
  "local:changeNarrator:githubKey";

export const LaunchService: React.FC = () => {
  const [serviceStatus, setServiceStatus] = React.useState<
    "up" | "down" | "unknown"
  >("unknown");
  const updateServiceStatus = async () => {
    const isServiceUp = await ContainerClient.check();
    setServiceStatus(isServiceUp ? "up" : "down");
  };
  useEffect(() => {
    updateServiceStatus();
    const interval = setInterval(updateServiceStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  let backgroundColor;
  switch (serviceStatus) {
    case "up":
      backgroundColor = "#4caf50";
      break;
    case "down":
      backgroundColor = "#f44336";
      break;
    default:
      backgroundColor = "#555";
  }

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
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Chip
        label={`Service is ${serviceStatus}`}
        style={{
          backgroundColor: backgroundColor,
          color: "#fff",
        }}
      />

      <div style={{ width: "100%", marginTop: "5px" }}>
        <div style={{ display: "flex", flexDirection: "row", width: "100%" }}>
          <TextField
            label="Github Token"
            variant="filled"
            style={{ backgroundColor: colors.DARK.SECONDARY, width: "100%" }}
            value={githubToken}
            onChange={(e) => {
              setGithubToken(e.target.value);
            }}
            type={"password"}
            slotProps={{
              input: {
                sx: { fontSize: "12px" },
              },
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextField
            label="Command"
            variant="filled"
            style={{ backgroundColor: colors.DARK.SECONDARY }}
            value={command}
            contentEditable={false}
            fullWidth
            slotProps={{
              input: {
                sx: { fontSize: "12px" },
              },
            }}
          />
          <IconButton
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(command);
              } catch (err) {}
            }}
            style={{ height: "100%", width: "40px" }}
          >
            <Copy style={{ height: "100%" }} />
          </IconButton>
        </div>
      </div>
    </div>
  );
};
