import { useEffect, useRef } from "react";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

const DEFAULT_EXIT_INTERVAL_MS = 2000;

interface AppPlugin {
  addListener(
    eventName: "backButton",
    listenerFunc: () => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  exitApp(): Promise<void>;
}

const CapacitorApp = registerPlugin<AppPlugin>("App");

type UseAndroidBackButtonOptions = {
  rootPath?: string;
  exitIntervalMs?: number;
};

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/";
  }

  return path.endsWith("/") ? path.slice(0, -1) : path;
};

export function useAndroidBackButton({
  rootPath = "/",
  exitIntervalMs = DEFAULT_EXIT_INTERVAL_MS,
}: UseAndroidBackButtonOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressAtRef = useRef(0);
  const pathnameRef = useRef(location.pathname);
  const normalizedRootPath = normalizePath(rootPath);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const isNativeAndroid =
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

    if (!isNativeAndroid) {
      return;
    }

    const listener = CapacitorApp.addListener("backButton", () => {
      const currentPath = normalizePath(pathnameRef.current);
      const isRootRoute = currentPath === normalizedRootPath;

      if (!isRootRoute) {
        navigate(-1);
        return;
      }

      const historyState = window.history.state as
        | { clickerPalScreen?: string }
        | null;

      if (historyState?.clickerPalScreen) {
        window.history.back();
        return;
      }

      const now = Date.now();
      const shouldExit = now - lastBackPressAtRef.current <= exitIntervalMs;

      if (shouldExit) {
        void CapacitorApp.exitApp();
        return;
      }

      lastBackPressAtRef.current = now;
      toast("Appuyez encore pour quitter");
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [exitIntervalMs, navigate, normalizedRootPath]);
}
