import { BluetoothClassic } from "@/lib/bluetooth-classic";

export type BtConnectionStatus = "disconnected" | "scanning" | "advertising" | "connected";

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
}

type StatusCallback = (status: BtConnectionStatus) => void;
type DataCallback = (data: string) => void;
type DeviceDiscoveredCallback = (device: DiscoveredDevice) => void;

let currentStatus: BtConnectionStatus = "disconnected";
let statusListeners: StatusCallback[] = [];
let dataListeners: DataCallback[] = [];
let deviceListeners: DeviceDiscoveredCallback[] = [];

const notifyStatus = (status: BtConnectionStatus) => {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
};

BluetoothClassic.addListener("btStatus", ({ state }) => {
  notifyStatus(state as BtConnectionStatus);
}).catch(console.error);

BluetoothClassic.addListener("btData", ({ message }) => {
  dataListeners.forEach((cb) => cb(message));
}).catch(console.error);

BluetoothClassic.addListener("btLog", ({ message }) => {
  console.log("[BT NATIVE]", message);
}).catch(console.error);

export const onStatusChange = (cb: StatusCallback) => {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter((x) => x !== cb);
  };
};

export const onDataReceived = (cb: DataCallback) => {
  dataListeners.push(cb);
  return () => {
    dataListeners = dataListeners.filter((x) => x !== cb);
  };
};

export const onDeviceDiscovered = (cb: DeviceDiscoveredCallback) => {
  deviceListeners.push(cb);
  return () => {
    deviceListeners = deviceListeners.filter((x) => x !== cb);
  };
};

export const getConnectionStatus = () => currentStatus;

export const ensureBluetoothEnabled = async (): Promise<boolean> => {
  const available = await BluetoothClassic.isBluetoothAvailable();
  if (!available.available) return false;

  const enabled = await BluetoothClassic.isBluetoothEnabled();
  if (enabled.enabled) return true;

  const result = await BluetoothClassic.enableBluetooth();
  return result.enabled;
};

export const startAdvertising = async (_states?: number[]) => {
  await ensureBluetoothEnabled();
  await BluetoothClassic.startServer();
  notifyStatus("advertising");
};

export const stopAdvertising = async () => {
  await BluetoothClassic.stopServer();
  await BluetoothClassic.disconnect().catch(() => {});
  notifyStatus("disconnected");
};

export const startScanningForDevices = async (): Promise<DiscoveredDevice[]> => {
  await ensureBluetoothEnabled();
  notifyStatus("scanning");

  const { devices } = await BluetoothClassic.getBondedDevices();

  devices.forEach((device) => {
    deviceListeners.forEach((cb) => cb(device));
  });

  notifyStatus("disconnected");
  return devices;
};

export const startScanning = startScanningForDevices;

export const stopScanning = async () => {
  notifyStatus("disconnected");
};

export const connectToDevice = async (deviceId: string) => {
  await ensureBluetoothEnabled();
  await BluetoothClassic.connect({ deviceAddress: deviceId });
  await BluetoothClassic.startListening();
  notifyStatus("connected");
};

export const disconnect = async () => {
  await BluetoothClassic.stopListening().catch(() => {});
  await BluetoothClassic.disconnect().catch(() => {});
  notifyStatus("disconnected");
};

export const sendMessage = async (message: string) => {
  await BluetoothClassic.sendMessage({ message });
};

export const updateAdvertisedStates = async (states: number[]) => {
  await sendMessage(JSON.stringify(states));
};

export const startPolling = () => {};
export const stopPolling = () => {};