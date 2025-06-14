import { create } from "zustand";
import {
  ColorMode,
  defaultColorMode,
} from "@/services/content/getColorMode.ts";

type ColorModeState = {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
};

export const useColorMode = create<ColorModeState>((set) => ({
  colorMode: defaultColorMode,
  setColorMode: (colorMode: ColorMode) => set(() => ({ colorMode })),
}));
