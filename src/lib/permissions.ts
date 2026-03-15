// Android permission checks for Bluetooth and file access
// Uses Capacitor native APIs when available

export const checkAndRequestPermissions = async () => {
  if (!(window as any).Capacitor?.isNativePlatform()) return;

  // Request Bluetooth permissions and enable
  try {
    const { BluetoothCommunication } = await import("@yesprasoon/capacitor-bluetooth-communication");
    await BluetoothCommunication.initialize();
    await BluetoothCommunication.enableBluetooth();
  } catch (e) {
    console.warn("BT permission/enable error:", e);
    alert("Veuillez activer le Bluetooth pour utiliser cette application.");
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
    const { BluetoothCommunication } = await import("@yesprasoon/capacitor-bluetooth-communication");
    await BluetoothCommunication.initialize();
    await BluetoothCommunication.enableBluetooth();
    return true;
  } catch {
    alert("Veuillez activer le Bluetooth dans les paramètres de votre téléphone, puis réessayez.");
    return false;
  }
};
