import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { BluetoothClassic } from "@/lib/bluetooth-classic";

export type BtConnectionStatus = "disconnected" | "scanning" | "advertising" | "connected";

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
}

export interface BluetoothLogEntry {
  timestamp: string;
  message: string;
  source: "js" | "native";
}

type StatusCallback = (status: BtConnectionStatus) => void;
type DataCallback = (data: string) => void;
type DeviceDiscoveredCallback = (device: DiscoveredDevice) => void;
type LogCallback = (entry: BluetoothLogEntry) => void;

type BtMode = "master" | "viewer" | null;

const MAX_LOG_ENTRIES = 200;
const statusListeners = new Set<StatusCallback>();
const dataListeners = new Set<DataCallback>();
const deviceListeners = new Set<DeviceDiscoveredCallback>();
const logListeners = new Set<LogCallback>();
const listenerHandles: PluginListenerHandle[] = [];

let listenersInitialized = false;
let currentStatus: BtConnectionStatus = "disconnected";
let currentMode: BtMode = null;
let advertisedPayload: string = "";
let logBuffer: BluetoothLogEntry[] = [];

const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const addLog = (message: string, source: BluetoothLogEntry["source"] = "js") => {
  const entry: BluetoothLogEntry = {
    timestamp: new Date().toISOString(),
    message,
    source,
  };

  logBuffer = [...logBuffer.slice(-(MAX_LOG_ENTRIES - 1)), entry];
  logListeners.forEach((listener) => listener(entry));

  const prefix = source === "native" ? "[BT NATIVE]" : "[BT JS]";
  console.log(prefix, message);
};

const notifyStatus = (status: BtConnectionStatus) => {
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
};

const emitDiscoveredDevices = (devices: DiscoveredDevice[]) => {
  devices.forEach((device) => {
    deviceListeners.forEach((listener) => listener(device));
  });
};

const ensureNativeRuntime = () => {
  if (!isNativeAndroid) {
    throw new Error("Bluetooth Classic natif disponible uniquement sur Android via Capacitor.");
  }
};

const initializeListeners = async () => {
  if (listenersInitialized || !isNativeAndroid) {
    return;
  }

  listenersInitialized = true;

  listenerHandles.push(
    await BluetoothClassic.addListener("btStatus", ({ state }) => {
      addLog(`Status changed to ${state}`, "native");
      notifyStatus(state as BtConnectionStatus);

      if (state === "connected" && currentMode === "master" && advertisedPayload) {
        void sendMessage(advertisedPayload);
      }
    }),
  );

  listenerHandles.push(
    await BluetoothClassic.addListener("btData", ({ message }) => {
      addLog(`Data received: ${message}`, "native");
      dataListeners.forEach((listener) => listener(message));
    }),
  );

  listenerHandles.push(
    await BluetoothClassic.addListener("btLog", ({ message }) => {
      addLog(message, "native");
    }),
  );

  try {
    const { state } = await BluetoothClassic.getConnectionState();
    notifyStatus(state as BtConnectionStatus);
  } catch (error) {
    addLog(`Unable to fetch initial native state: ${String(error)}`);
  }
};

const ensureReady = async () => {
  ensureNativeRuntime();
  await initializeListeners();
};

const safelyStopListening = async () => {
  if (!isNativeAndroid) {
    return;
  }

  await BluetoothClassic.stopListening().catch(() => undefined);
};

const safelyDisconnect = async () => {
  if (!isNativeAndroid) {
    return;
  }

  await BluetoothClassic.disconnect().catch(() => undefined);
};

const safelyStopServer = async () => {
  if (!isNativeAndroid) {
    return;
  }

  await BluetoothClassic.stopServer().catch(() => undefined);
};

export const onStatusChange = (callback: StatusCallback) => {
  statusListeners.add(callback);
  callback(currentStatus);

  return () => {
    statusListeners.delete(callback);
  };
};

export const onDataReceived = (callback: DataCallback) => {
  dataListeners.add(callback);

  return () => {
    dataListeners.delete(callback);
  };
};

export const onDeviceDiscovered = (callback: DeviceDiscoveredCallback) => {
  deviceListeners.add(callback);

  return () => {
    deviceListeners.delete(callback);
  };
};

export const onBluetoothLog = (callback: LogCallback) => {
  logListeners.add(callback);
  logBuffer.forEach((entry) => callback(entry));

  return () => {
    logListeners.delete(callback);
  };
};

export const getBluetoothLogs = () => [...logBuffer];

export const getConnectionStatus = () => currentStatus;

export const ensureBluetoothEnabled = async (): Promise<boolean> => {
  await ensureReady();

  addLog("Checking Bluetooth availability");
  const { available } = await BluetoothClassic.isBluetoothAvailable();
  if (!available) {
    addLog("Bluetooth unavailable on this device");
    return false;
  }

  const { enabled } = await BluetoothClassic.isBluetoothEnabled();
  if (enabled) {
    addLog("Bluetooth already enabled");
    return true;
  }

  addLog("Bluetooth disabled, requesting activation");
  const result = await BluetoothClassic.enableBluetooth();
  addLog(`Bluetooth activation result: ${result.enabled}`);
  return result.enabled;
};

export const startAdvertising = async (payload: string): Promise<void> => {
  await ensureReady();

  advertisedPayload = payload;
  currentMode = "master";

  addLog("Preparing Bluetooth Classic server");
  await safelyStopListening();
  await safelyDisconnect();
  await safelyStopServer();

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  await BluetoothClassic.startServer();
  notifyStatus("advertising");
};

export const stopAdvertising = async (): Promise<void> => {
  await ensureReady();

  addLog("Stopping Bluetooth Classic server");
  currentMode = null;
  await safelyStopListening();
  await safelyStopServer();
  await safelyDisconnect();
  notifyStatus("disconnected");
};

export const startScanningForDevices = async (): Promise<DiscoveredDevice[]> => {
  await ensureReady();

  currentMode = "viewer";
  addLog("Listing bonded Bluetooth devices");

  await safelyStopListening();
  await safelyStopServer();
  await safelyDisconnect();

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  notifyStatus("scanning");
  const { devices } = await BluetoothClassic.getBondedDevices();
  emitDiscoveredDevices(devices);
  addLog(`Bonded devices found: ${devices.length}`);
  notifyStatus("disconnected");
  return devices;
};

export const scanDevices = startScanningForDevices;
export const startScanning = startScanningForDevices;

export const stopScanning = async (): Promise<void> => {
  addLog("Stopping viewer scan state");
  if (currentStatus === "scanning") {
    notifyStatus("disconnected");
  }
};

export const connectToDevice = async (deviceId: string): Promise<void> => {
  await ensureReady();

  currentMode = "viewer";
  addLog(`Connecting viewer to device ${deviceId}`);

  await safelyStopListening();
  await safelyStopServer();
  await safelyDisconnect();

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  await BluetoothClassic.connect({ deviceAddress: deviceId });
  await BluetoothClassic.startListening();
};

export const disconnect = async (): Promise<void> => {
  if (!isNativeAndroid) {
    currentMode = null;
    notifyStatus("disconnected");
    return;
  }

  addLog("Disconnecting active Bluetooth session");
  currentMode = null;
  await safelyStopListening();
  await safelyDisconnect();
  notifyStatus("disconnected");
};

export const sendMessage = async (message: string): Promise<void> => {
  await ensureReady();
  addLog(`Sending message: ${message}`);
  await BluetoothClassic.sendMessage({ message });
};

export const updateAdvertisedPayload = async (payload: string): Promise<void> => {
  advertisedPayload = payload;
  addLog(`Updating advertised payload`);

  if (currentMode === "master" && currentStatus === "connected") {
    await sendMessage(payload);
  }
};

export const startPolling = () => undefined;
export const stopPolling = () => undefined;

void initializeListeners();
