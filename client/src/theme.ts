import type { PaletteMode, ThemeOptions } from "@mui/material";

/** The nav bar is maroon in both modes; everything on it is white. */
export const BAR_COLOR = { light: "#6b1622", dark: "#4a0f18" } as const;

export function getTheme(mode: PaletteMode): ThemeOptions {
  const isLight = mode === "light";

  return {
    palette: {
      mode,
      background: {
        default: isLight ? "#f6f3f3" : "#121011",
        paper: isLight ? "#ffffff" : "#1c1819",
      },
      // Maroon. Lifted in dark mode so it still reads against the background.
      primary: {
        main: isLight ? "#7a1c29" : "#e06a76",
        dark: isLight ? "#5c1420" : "#c4505c",
        contrastText: isLight ? "#ffffff" : "#1a0a0c",
      },
      secondary: {
        main: isLight ? "#b3263a" : "#f08a94",
        contrastText: isLight ? "#ffffff" : "#1a0a0c",
      },
      text: isLight
        ? { primary: "#1f1416", secondary: "#6a5a5d" }
        : { primary: "#f1eaeb", secondary: "#a8999b" },
      divider: isLight ? "rgba(70, 20, 28, 0.12)" : "rgba(255, 255, 255, 0.1)",
    },
    shape: {
      borderRadius: 6,
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
      // Square-ish tags rather than pills.
      MuiChip: {
        styleOverrides: { root: { borderRadius: 4 }, label: { fontWeight: 600 } },
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
