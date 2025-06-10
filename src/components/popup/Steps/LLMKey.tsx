import React, { Dispatch, SetStateAction, useEffect } from "react";
import {
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
  getModelProvider,
  MODEL_PROVIDER_STORAGE_KEY,
} from "@/services/content/llm/getModelProvider.ts";

export const LLMKey: React.FC = () => {
  const [modelProvider, setModelProvider] =
    React.useState<ModelProvider>(defaultModelProvider);
  useEffect(() => {
    getModelProvider().then((modelProvider) => {
      setModelProvider(modelProvider as ModelProvider);
    });
  }, []);

  const [key, setKey] = useState("");
  useEffect(() => {
    storage.getItem(LLMConfig[modelProvider].storageKey).then((key) => {
      if (typeof key != "string") {
        return;
      }

      setKey(key);
    });
  }, [modelProvider]);
  const keyDebounce = useCallback(
    debounce((value: string) => {
      if (value) {
        return verifyAndSaveKey(modelProvider, value, setError);
      }
    }, 500),
    [],
  );
  useEffect(() => {
    keyDebounce(key);
  }, [key]);

  const [error, setError] = React.useState<string | null>(null);
  useEffect(() => {
    setError(null);
  }, [modelProvider, key]);

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <FormControl fullWidth={true}>
        <InputLabel>Model Provider</InputLabel>
        <Select
          variant={"standard"}
          value={modelProvider}
          onChange={async (event) => {
            const value = event.target.value as ModelProvider;

            setModelProvider(value);
            await storage.setItem(MODEL_PROVIDER_STORAGE_KEY, value);
          }}
        >
          {Object.keys(LLMConfig).map((key) => (
            <MenuItem key={key} value={key}>
              {key}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div>
        <TextField
          label="API Key"
          variant="filled"
          style={{ backgroundColor: colors.SECONDARY }}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
          }}
          type={"password"}
          error={!!error}
          helperText={error}
        />
        <Link href={LLMConfig[modelProvider].link}>Get Your Key</Link>
      </div>
    </div>
  );
};

const verifyAndSaveKey = async (
  modelProvider: ModelProvider,
  key: string,
  setError: Dispatch<SetStateAction<string | null>>,
) => {
  const { verify, storageKey } = LLMConfig[modelProvider];

  const isKeyValid = await verify(key);
  if (!isKeyValid) {
    setError("Invalid Key");
    return;
  }

  await storage.setItem(storageKey, key);
};
