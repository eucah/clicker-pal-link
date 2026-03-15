// Android permission checks for Bluetooth and file access
// Uses Capacitor native APIs when available

export const checkAndRequestPermissions = async () => {
  // Only run on native Android
  if (!(window as any).Capacitor?.isNativePlatform()) return;

  try {
    const { BluetoothLowEnergy } = await import("@capgo/capacitor-bluetooth-low-energy");

    // Request runtime permissions (BLUETOOTH_SCAN, BLUETOOTH_CONNECT, BLUETOOTH_ADVERTISE)
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
    console.warn("Permission check error:", e);
  }
};
