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

    // Check Bluetooth is enabled and prompt user to activate
    try {
      const result = await BluetoothLowEnergy.isEnabled();
      if (!result.enabled) {
        // Prompt user to enable Bluetooth
        const userConfirmed = confirm(
          "Le Bluetooth est désactivé. Veuillez l'activer dans les paramètres pour utiliser cette application."
        );
        if (userConfirmed) {
          // Try to open Bluetooth settings on Android
          try {
            const { App: CapApp } = await import("@capacitor/app");
            // Fallback: just alert again
          } catch {
            // ignore
          }
        }
      }
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

export const ensureBluetoothEnabled = async (): Promise<boolean> => {
  if (!(window as any).Capacitor?.isNativePlatform()) return true;

  try {
    const { BluetoothLowEnergy } = await import("@capgo/capacitor-bluetooth-low-energy");
    
    try {
      await BluetoothLowEnergy.requestPermissions();
    } catch (e) {
      console.warn("BLE requestPermissions:", e);
    }

    const result = await BluetoothLowEnergy.isEnabled();
    if (!result.enabled) {
      alert("Veuillez activer le Bluetooth dans les paramètres de votre téléphone, puis réessayez.");
      return false;
    }
    return true;
  } catch {
    alert("Bluetooth non disponible sur cet appareil.");
    return false;
  }
};
