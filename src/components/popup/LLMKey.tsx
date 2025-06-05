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
import { StorageItemKey } from "@wxt-dev/storage";
import { ChatGroq } from "@langchain/groq";
import { debounce } from "lodash";

type ModelProvider = "groq";

const modelProviderConfig: Record<
  ModelProvider,
  {
    link: string;
    storageKey: StorageItemKey;
    verify: (key: string) => Promise<boolean>;
  }
> = {
  groq: {
    link: "https://console.groq.com/keys",
    storageKey: "local:changeNarrator:groq",
    verify: async (key) => {
      try {
        await new ChatGroq({
          model: "llama3-8b-8192",
          apiKey: key,
        }).invoke("Hi!");
        return true;
      } catch (e) {
        return false;
      }
    },
  },
};

const MODEL_PROVIDER_STORAGE_KEY: StorageItemKey =
  "local:changeNarrator:modelProvider";

export const LLMKey: React.FC = () => {
  const [modelProvider, setModelProvider] = React.useState<ModelProvider>(
    Object.keys(modelProviderConfig)[0] as ModelProvider,
  );
  useEffect(() => {
    storage.getItem(MODEL_PROVIDER_STORAGE_KEY).then((modelProvider) => {
      if (typeof modelProvider != "string") {
        return;
      }

      setModelProvider(modelProvider as ModelProvider);
    });
  }, []);

  const [key, setKey] = useState("");
  useEffect(() => {
    storage
      .getItem(modelProviderConfig[modelProvider].storageKey)
      .then((key) => {
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
          {Object.keys(modelProviderConfig).map((key) => (
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
        <Link href={modelProviderConfig[modelProvider].link}>Get Your Key</Link>
      </div>
    </div>
  );
};

const verifyAndSaveKey = async (
  modelProvider: ModelProvider,
  key: string,
  setError: Dispatch<SetStateAction<string | null>>,
) => {
  const { verify, storageKey } = modelProviderConfig[modelProvider];

  const isKeyValid = await verify(key);
  if (!isKeyValid) {
    setError("Invalid Key");
    return;
  }

  await storage.setItem(storageKey, key);
};
