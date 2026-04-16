import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

type StatusBarPluginModule = {
  StatusBar: {
    setBackgroundColor: (options: { color: string }) => Promise<void>;
    setStyle: (options: { style: string }) => Promise<void>;
  };
  Style: {
    Dark: string;
  };
};

const initializeStatusBar = async (): Promise<void> => {
  if (Capacitor.getPlatform() !== "android") {
    return;
  }

  const statusBarPlugin = "@capacitor/status-bar";
  const { StatusBar, Style } = (await import(statusBarPlugin)) as StatusBarPluginModule;

  await StatusBar.setBackgroundColor({ color: "#ffffff" });
  await StatusBar.setStyle({ style: Style.Dark });
};

void initializeStatusBar();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="clicker-pal-theme">
    <App />
  </ThemeProvider>,
);
