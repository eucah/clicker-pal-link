// Android permission checks for Bluetooth and file access
// Uses Capacitor native APIs when available

export const checkAndRequestPermissions = async () => {
  // Only run on native Android
  if (!(window as any).Capacitor?.isNativePlatform()) return;

  // Request Bluetooth permissions
  try {
    const { BluetoothLowEnergy } = await import("@capgo/capacitor-bluetooth-low-energy");

    try {
      await BluetoothLowEnergy.requestPermissions();
    } catch (e) {
      console.warn("BLE requestPermissions:", e);
    }

    // Check Bluetooth is enabled
    try {
      await BluetoothLowEnergy.isEnabled();
    } catch {
      alert("Veuillez activer le Bluetooth pour utiliser cette application.");
    }
  } catch (e) {
    console.warn("BLE permission check error:", e);
  }

  // Request Filesystem permissions
  try {
    const { Filesystem } = await import("@capacitor/filesystem");
    try {
      await Filesystem.requestPermissions();
    } catch (e) {
      console.warn("Filesystem requestPermissions:", e);
    }
  } catch (e) {
    console.warn("Filesystem permission check error:", e);
  }
};
