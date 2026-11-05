import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider, createTheme, type PaletteMode } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getTheme } from "../theme";
import { ColorModeContext, STORAGE_KEY, getInitialMode, type ColorModeContextValue } from "./colorModeContext";

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(getInitialMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Not remembered this time; nothing else depends on it.
    }
  }, [mode]);

  const value = useMemo<ColorModeContextValue>(
    () => ({ mode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }),
    [mode],
  );

  const theme = useMemo(() => createTheme(getTheme(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
