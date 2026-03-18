// Android permission checks for Bluetooth Classic

export const checkAndRequestPermissions = async () => {
  if (!(window as any).Capacitor?.isNativePlatform()) return;

  try {
    const bt = (window as any).bluetoothSerial;
    if (!bt) {
      console.warn("bluetoothSerial plugin not available");
      return;
    }

    // Check if bluetooth is enabled
    bt.isEnabled(
      () => console.log("Bluetooth is enabled"),
      () => {
        console.log("Bluetooth is disabled, trying to enable...");
        bt.enable(
          () => console.log("Bluetooth enabled successfully"),
          (e: any) => console.warn("Failed to enable Bluetooth:", e)
        );
      }
    );
  } catch (e) {
    console.warn("Permission check error:", e);
  }
};
