import { Capacitor } from "@capacitor/core";
import { AndroidKeepAwake } from "@/lib/android-keep-awake";

const activeReasons = new Set<string>();
let isKeepAwakeEnabled = false;
let syncQueue: Promise<void> = Promise.resolve();

const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const syncKeepAwakeState = async () => {
  if (!isNativeAndroid) {
    return;
  }

  const shouldEnable = activeReasons.size > 0;
  if (shouldEnable === isKeepAwakeEnabled) {
    return;
  }

  await AndroidKeepAwake.setKeepAwake({ enabled: shouldEnable });
  isKeepAwakeEnabled = shouldEnable;
};

const enqueueSync = () => {
  syncQueue = syncQueue.then(syncKeepAwakeState).catch((error) => {
    console.warn("Keep-awake sync failed", error);
  });

  return syncQueue;
};

export const setKeepAwakeReason = async (reason: string, enabled: boolean) => {
  const hadReason = activeReasons.has(reason);

  if (enabled) {
    if (hadReason) {
      return;
    }
    activeReasons.add(reason);
  } else {
    if (!hadReason) {
      return;
    }
    activeReasons.delete(reason);
  }

  await enqueueSync();
};

export const clearKeepAwakeReasons = async (reasons: string[]) => {
  let changed = false;
  for (const reason of reasons) {
    if (activeReasons.delete(reason)) {
      changed = true;
    }
  }

  if (changed) {
    await enqueueSync();
  }
};
