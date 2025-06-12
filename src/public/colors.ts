import { createTheme } from "@mui/material";

export const colors = {
  DARK: {
    PRIMARY: "#1A1730",
    SECONDARY: "#90caf9",
  },
  LIGHT: {
    PRIMARY: "#D8D6E9",
    SECONDARY: "#1565C0",
  },
  HUNK: {
    BASE: "#1f4972",
    AGGREGATOR: "#2C2C2C",
    LOCATION_CONTEXT: "#3E1F47",
    SEMANTIC_CONTEXT: "#3E1F47",
    EXTENSION: "#1F3E47",
    HIGHLIGHT: "#4A0D0D",
  },
  NODE: {
    BASE: "#2C2C2C",
    CONTEXT: "#3E1F47",
    EXTENSION: "#1F3E47",
    HIGHLIGHT: "#4A0D0D",
    EXPANSION: "#65581b",
  },
  EDGE: {
    DEF_USE: "#E67E22",
    SIMILARITY: "#5DADE2",
    SUCCESSION: "#58D68D",
    CONTEXT: "#9B59B6",
    EXPANSION: "#F4D03F",
  },
};

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.DARK.PRIMARY,
    },
    secondary: {
      main: colors.DARK.SECONDARY,
    },
  },
});
