import { createContext, useContext } from "react";
import type { PaletteMode } from "@mui/material/styles";

export const STORAGE_KEY = "pickem:color-mode";

export type ColorModeContextValue = {
  mode: PaletteMode;
  toggle: () => void;
};

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function getInitialMode(): PaletteMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked; fall back to the system preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error("useColorMode must be used within a ColorModeProvider");
  return ctx;
}
