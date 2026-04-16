import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

const initializeStatusBar = async (): Promise<void> => {
  if (Capacitor.getPlatform() !== "android") {
    return;
  }

  try {
    await StatusBar.setBackgroundColor({ color: "#ffffff" });
    await StatusBar.setStyle({ style: Style.Light });
  } catch (error) {
    console.error("Status bar init failed:", error);
  }
};

void initializeStatusBar();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="clicker-pal-theme">
    <App />
  </ThemeProvider>,
);
