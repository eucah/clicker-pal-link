import { registerPlugin } from "@capacitor/core";

interface AndroidKeepAwakePlugin {
  setKeepAwake(options: { enabled: boolean }): Promise<void>;
}

export const AndroidKeepAwake = registerPlugin<AndroidKeepAwakePlugin>("AndroidKeepAwake");
