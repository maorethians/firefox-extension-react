import { StorageItemKey } from "@wxt-dev/storage";

export const COLOR_MODE_STORAGE_KEY: StorageItemKey =
  "local:changeNarrator:colorMode";

export type ColorMode = "DARK" | "LIGHT";

export const defaultColorMode: ColorMode =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: light)").matches
    ? "LIGHT"
    : "DARK";

export const getColorMode = async () => {
  const storageColorMode = await storage.getItem(COLOR_MODE_STORAGE_KEY);
  if (typeof storageColorMode !== "string") {
    return defaultColorMode as ColorMode;
  }

  return storageColorMode as ColorMode;
};
