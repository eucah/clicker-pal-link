import { Capacitor } from "@capacitor/core";
import { BluetoothClassic } from "@/lib/bluetooth-classic";

export const checkAndRequestPermissions = async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }

  try {
    // On Android, this Capacitor plugin is responsible for triggering runtime
    // permission prompts through the native `bluetooth` alias when needed.
    const pluginWithPermissions = BluetoothClassic as unknown as {
      checkPermissions?: () => Promise<Record<string, string>>;
      requestPermissions?: () => Promise<Record<string, string>>;
    };
    const permissionState = await pluginWithPermissions.checkPermissions?.();
    if (permissionState?.bluetooth && permissionState.bluetooth !== "granted") {
      await pluginWithPermissions.requestPermissions?.();
    }

    await BluetoothClassic.isBluetoothAvailable();
    await BluetoothClassic.isBluetoothEnabled();
  } catch (error) {
    console.warn("Bluetooth bootstrap check skipped:", error);
  }
};
