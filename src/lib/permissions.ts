// Android permission checks for Bluetooth and file access
// Uses Capacitor native APIs when available

export const checkAndRequestPermissions = async () => {
  // Only run on native Android
  if (!(window as any).Capacitor?.isNativePlatform()) return;

  try {
    // Check Bluetooth is enabled
    const { BluetoothLowEnergy } = await import("@capgo/capacitor-bluetooth-low-energy");
    
    try {
      await BluetoothLowEnergy.isEnabled();
    } catch {
      // Bluetooth not enabled - alert user
      alert("Veuillez activer le Bluetooth pour utiliser cette application.");
    }

    // Request permissions via the Capacitor Permissions API
    try {
      await BluetoothLowEnergy.initialize({ mode: "central" });
      // This triggers the Android permission dialogs for BLE
    } catch (e) {
      console.warn("BLE permission request:", e);
    }
  } catch (e) {
    console.warn("Permission check error:", e);
  }
};
