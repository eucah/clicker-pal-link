import { Capacitor } from "@capacitor/core";
import { BluetoothClassic } from "@/lib/bluetooth-classic";

export const checkAndRequestPermissions = async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }

  try {
    await BluetoothClassic.isBluetoothAvailable();
    await BluetoothClassic.isBluetoothEnabled();
  } catch (error) {
    console.warn("Bluetooth bootstrap check skipped:", error);
  }
};
