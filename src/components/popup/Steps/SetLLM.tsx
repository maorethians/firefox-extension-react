import React, { Dispatch, SetStateAction, useEffect } from "react";
import {
  Chip,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { colors } from "@/public/colors.ts";
import { debounce } from "lodash";
import { LLMConfig, ModelProvider } from "@/services/content/llm/LLMConfig.ts";
import {
  defaultModelProvider,
  getStoredModelProvider,
  MODEL_PROVIDER_STORAGE_KEY,
} from "@/services/content/llm/getStoredModelProvider.ts";

export const SetLLM: React.FC = () => {
  const [modelProvider, setModelProvider] =
    useState<ModelProvider>(defaultModelProvider);
  useEffect(() => {
    getStoredModelProvider().then((storedModelProvider) => {
      if (!storedModelProvider) {
        return;
      }
      setModelProvider(storedModelProvider);
    });
  }, []);

  const [modelKey, setModelKey] = useState<string | null>(null);
  useEffect(() => {
    storage.setItem(MODEL_PROVIDER_STORAGE_KEY, modelProvider);

    const storageKey = LLMConfig[modelProvider].storageKey;
    if (!storageKey) {
      setModelKey(null);
      return;
    }

    storage.getItem(storageKey).then((key) => {
      if (typeof key != "string") {
        return;
      }
      setModelKey(key);
    });
  }, [modelProvider]);

  const [isLlmConnected, setLlmConnected] = React.useState<boolean>(false);
  const backgroundColor = isLlmConnected ? "#4caf50" : "#f44336";
  useEffect(() => {
    setLlmConnected(false);
  }, [modelProvider, modelKey]);

  const updateLlmStatus = async (modelProvider: ModelProvider) => {
    const verify = LLMConfig[modelProvider]
      .verify as (typeof LLMConfig)[ModelProvider.ollama]["verify"];
    const isLlmConnected = await verify();
    setLlmConnected(isLlmConnected);
  };
  useEffect(() => {
    const storageKey = LLMConfig[modelProvider].storageKey;
    if (storageKey) {
      return;
    }

    updateLlmStatus(modelProvider);
    const interval = setInterval(() => updateLlmStatus(modelProvider), 1000);
    return () => clearInterval(interval);
  }, [modelProvider]);

  const keyDebounce = useCallback(
    debounce((modelProvider: ModelProvider, key: string) => {
      saveKey(modelProvider, key, setLlmConnected);
    }, 500),
    [],
  );
  useEffect(() => {
    if (!modelKey) {
      return;
    }
    keyDebounce(modelProvider, modelKey);
  }, [modelKey]);

  return (
    <div
      style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      <FormControl fullWidth={true} style={{ flex: 1 }}>
        <InputLabel>Model Provider</InputLabel>
        <Select
          variant={"standard"}
          value={modelProvider}
          onChange={async (event) => {
            const value = event.target.value as ModelProvider;
            setModelProvider(value);
          }}
        >
          {Object.keys(LLMConfig).map((key) => (
            <MenuItem key={key} value={key}>
              {key}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div style={{ flex: 2 }}>
        {LLMConfig[modelProvider].storageKey && (
          <TextField
            label="API Key"
            variant="filled"
            style={{ backgroundColor: colors.DARK.SECONDARY }}
            value={modelKey}
            onChange={(e) => setModelKey(e.target.value)}
            type={"password"}
          />
        )}
        <Chip
          label={isLlmConnected ? "Connected" : "Not Connected"}
          style={{
            backgroundColor: backgroundColor,
            color: "#fff",
          }}
        />
        <Link href={LLMConfig[modelProvider].link}>More Info</Link>
      </div>
    </div>
  );
};

const saveKey = async (
  modelProvider: ModelProvider,
  key: string,
  setLlmConnected: Dispatch<SetStateAction<boolean>>,
) => {
  const storageKey = LLMConfig[modelProvider].storageKey;
  if (!storageKey) {
    return;
  }

  const verify = LLMConfig[modelProvider]
    .verify as (typeof LLMConfig)[ModelProvider.groq]["verify"];
  const isLlmConnected = await verify(key);
  setLlmConnected(isLlmConnected);
  if (!isLlmConnected) {
    return;
  }

  await storage.setItem(storageKey, key);
};
