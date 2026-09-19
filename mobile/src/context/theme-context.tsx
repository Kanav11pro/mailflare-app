import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark" | "obsidian";

export interface ThemeColors {
  background: string;
  card: string;
  cardSecondary: string;
  cardSubtle: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySubtle: string;
  primaryHover: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  purple: string;
  purpleSubtle: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  inputBackground: string;
  inputBorder: string;
  statusBarStyle: "light" | "dark";
}

export const lightTheme: ThemeColors = {
  background: "#f8fafc",
  card: "#ffffff",
  cardSecondary: "#f1f5f9",
  cardSubtle: "#f8fafc",
  border: "#e2e8f0",
  borderSubtle: "#f1f5f9",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  primary: "#2563eb",
  primarySubtle: "rgba(37, 99, 235, 0.08)",
  primaryHover: "#1d4ed8",
  success: "#10b981",
  successSubtle: "rgba(16, 185, 129, 0.1)",
  warning: "#f59e0b",
  warningSubtle: "rgba(245, 158, 11, 0.1)",
  danger: "#ef4444",
  dangerSubtle: "rgba(239, 68, 68, 0.1)",
  purple: "#8b5cf6",
  purpleSubtle: "rgba(139, 92, 246, 0.1)",
  tabBar: "#ffffff",
  tabBarBorder: "#e2e8f0",
  tabBarActive: "#2563eb",
  tabBarInactive: "#64748b",
  inputBackground: "#ffffff",
  inputBorder: "#cbd5e1",
  statusBarStyle: "dark",
};

export const darkTheme: ThemeColors = {
  background: "#12141c",
  card: "#181a24",
  cardSecondary: "#1f2230",
  cardSubtle: "#151722",
  border: "#282b3d",
  borderSubtle: "#1f2230",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  primary: "#3b82f6",
  primarySubtle: "rgba(59, 130, 246, 0.12)",
  primaryHover: "#60a5fa",
  success: "#10b981",
  successSubtle: "rgba(16, 185, 129, 0.15)",
  warning: "#f59e0b",
  warningSubtle: "rgba(245, 158, 11, 0.15)",
  danger: "#ef4444",
  dangerSubtle: "rgba(239, 68, 68, 0.15)",
  purple: "#a855f7",
  purpleSubtle: "rgba(168, 85, 247, 0.15)",
  tabBar: "#141620",
  tabBarBorder: "#222534",
  tabBarActive: "#60a5fa",
  tabBarInactive: "#64748b",
  inputBackground: "#181a24",
  inputBorder: "#282b3d",
  statusBarStyle: "light",
};

export const obsidianTheme: ThemeColors = {
  background: "#0b0c10",
  card: "#13141d",
  cardSecondary: "#181a24",
  cardSubtle: "#161822",
  border: "#222534",
  borderSubtle: "#191a26",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  primary: "#3b82f6",
  primarySubtle: "rgba(59, 130, 246, 0.15)",
  primaryHover: "#60a5fa",
  success: "#10b981",
  successSubtle: "rgba(16, 185, 129, 0.15)",
  warning: "#f59e0b",
  warningSubtle: "rgba(245, 158, 11, 0.15)",
  danger: "#ef4444",
  dangerSubtle: "rgba(239, 68, 68, 0.15)",
  purple: "#a855f7",
  purpleSubtle: "rgba(168, 85, 247, 0.15)",
  tabBar: "#0f1016",
  tabBarBorder: "#1a1c28",
  tabBarActive: "#60a5fa",
  tabBarInactive: "#64748b",
  inputBackground: "#13141d",
  inputBorder: "#222534",
  statusBarStyle: "light",
};

interface ThemeContextType {
  mode: ThemeMode;
  theme: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  theme: obsidianTheme,
  isDark: true,
  setMode: async () => {},
});

const THEME_STORAGE_KEY = "@mailflare_theme_mode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && ["system", "light", "dark", "obsidian"].includes(saved)) {
          setModeState(saved as ThemeMode);
        }
      } catch (err) {
        console.warn("[Theme] Failed to load saved theme preference:", err);
      }
    }
    loadSavedTheme();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (err) {
      console.warn("[Theme] Failed to save theme preference:", err);
    }
  };

  const activeTheme = useMemo<ThemeColors>(() => {
    if (mode === "light") return lightTheme;
    if (mode === "dark") return darkTheme;
    if (mode === "obsidian") return obsidianTheme;

    // "system" mode:
    return systemScheme === "light" ? lightTheme : obsidianTheme;
  }, [mode, systemScheme]);

  const isDark = activeTheme.statusBarStyle === "light";

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme: activeTheme,
        isDark,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
