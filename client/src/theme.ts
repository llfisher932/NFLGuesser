import type { PaletteMode, ThemeOptions } from "@mui/material";

export function getTheme(mode: PaletteMode): ThemeOptions {
  const isLight = mode === "light";

  return {
    palette: {
      mode,
      background: {
        default: isLight ? "#f4f6f3" : "#0b110d",
        paper: isLight ? "#ffffff" : "#131c16",
      },
      // Field green.
      primary: {
        main: isLight ? "#1f7a3d" : "#4cc274",
        contrastText: isLight ? "#ffffff" : "#06170c",
      },
      secondary: {
        main: isLight ? "#8a4b22" : "#d89463",
      },
      text: isLight
        ? { primary: "#14201a", secondary: "#56685d" }
        : { primary: "#e6efe9", secondary: "#93a69a" },
      divider: isLight ? "rgba(20, 40, 28, 0.1)" : "rgba(255, 255, 255, 0.1)",
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Inter", system-ui, sans-serif',
      h4: { fontWeight: 700, letterSpacing: "-0.025em" },
      h5: { fontWeight: 700, letterSpacing: "-0.02em" },
      h6: { fontWeight: 700, letterSpacing: "-0.01em" },
      subtitle2: { fontWeight: 600 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiCard: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiDialog: {
        styleOverrides: { paper: { backgroundImage: "none" } },
      },
      MuiChip: {
        styleOverrides: { label: { fontWeight: 600 } },
      },
      MuiToggleButton: {
        styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
      },
    },
  };
}
