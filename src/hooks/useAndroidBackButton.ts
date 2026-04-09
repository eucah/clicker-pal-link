import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

const DEFAULT_EXIT_INTERVAL_MS = 2000;

type UseAndroidBackButtonOptions = {
  rootPath?: string;
  exitIntervalMs?: number;
};

export function useAndroidBackButton({
  rootPath = "/",
  exitIntervalMs = DEFAULT_EXIT_INTERVAL_MS,
}: UseAndroidBackButtonOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressAtRef = useRef(0);
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const isNativeAndroid =
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

    if (!isNativeAndroid) {
      return;
    }

    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      const isRootRoute = pathnameRef.current === rootPath;

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
      void listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate, rootPath, exitIntervalMs]);
}
