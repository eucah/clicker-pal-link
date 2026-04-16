import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createRoot } from "react-dom/client";
import { useTheme } from "next-themes";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

const DARK_STATUS_BAR_COLOR = "#000000";
const LIGHT_STATUS_BAR_COLOR = "#ffffff";

let isOverlayConfigured = false;

const applyStatusBarTheme = async (isDark: boolean): Promise<void> => {
  if (Capacitor.getPlatform() !== "android") {
    return;
  }

  try {
    if (!isOverlayConfigured) {
      await StatusBar.setOverlaysWebView({ overlay: false });
      isOverlayConfigured = true;
    }

    await StatusBar.setBackgroundColor({
      color: isDark ? DARK_STATUS_BAR_COLOR : LIGHT_STATUS_BAR_COLOR,
    });

    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });
  } catch (error) {
    console.error("Status bar update failed:", error);
  }
};

const StatusBarThemeSync = (): null => {
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";

  useEffect(() => {
    void applyStatusBarTheme(isDark);
  }, [isDark]);

  return null;
};

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="clicker-pal-theme">
    <StatusBarThemeSync />
    <App />
  </ThemeProvider>,
);
