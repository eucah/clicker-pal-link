// Android permission checks for Bluetooth Classic and file access

export const checkAndRequestPermissions = async () => {
  if (!(window as any).Capacitor?.isNativePlatform()) return;

  try {
    const { BluetoothCommunication } = await import("@yesprasoon/capacitor-bluetooth-communication");
    await BluetoothCommunication.initialize();

    try {
      await BluetoothCommunication.enableBluetooth();
    } catch (e) {
      console.warn("Bluetooth enable error:", e);
    }
  } catch (e) {
    console.warn("Permission check error:", e);
  }
};
