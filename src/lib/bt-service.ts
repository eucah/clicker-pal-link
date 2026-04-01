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
let isStoppingSession = false;
let writesBlocked = false;

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
      try {
        const parsed = JSON.parse(message) as { type?: string };
        if (parsed?.type === "session_end") {
          addLog("Session end signal received from remote", "native");
          void disconnectSession("remote-session-end");
          return;
        }
      } catch {
        // Backward compatible: non-control payloads are treated as project data
      }

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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const trySendSessionEndSignal = async () => {
  if (!isNativeAndroid || currentStatus !== "connected") {
    return;
  }

  try {
    const payload = JSON.stringify({ type: "session_end", origin: currentMode ?? "unknown" });
    await BluetoothClassic.sendMessage({ message: payload });
    addLog("Session end signal sent");
    await wait(80);
  } catch (error) {
    addLog(`Session end signal failed: ${String(error)}`);
  }
};

const resetSessionState = () => {
  currentMode = null;
  advertisedPayload = "";
  writesBlocked = false;
  notifyStatus("disconnected");
};

const disconnectSession = async (reason: string): Promise<void> => {
  if (!isNativeAndroid) {
    resetSessionState();
    return;
  }

  if (isStoppingSession) {
    addLog(`Disconnect already in progress (${reason})`);
    return;
  }

  isStoppingSession = true;
  writesBlocked = true;
  addLog(`Disconnect session started (${reason})`);

  try {
    await trySendSessionEndSignal();
    await safelyStopListening();
    await safelyDisconnect();
    await safelyStopServer();
  } finally {
    resetSessionState();
    isStoppingSession = false;
    addLog(`Disconnect session completed (${reason})`);
  }
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

  addLog("Preparing Bluetooth Classic server");
  await disconnectSession("start-advertising-reset");

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  advertisedPayload = payload;
  currentMode = "master";
  await BluetoothClassic.startServer();
  notifyStatus("advertising");
};

export const stopAdvertising = async (): Promise<void> => {
  await ensureReady();

  addLog("Stopping Bluetooth Classic server");
  await disconnectSession("stop-advertising");
};

export const startScanningForDevices = async (): Promise<DiscoveredDevice[]> => {
  await ensureReady();

  addLog("Listing bonded Bluetooth devices");

  await disconnectSession("start-scanning-reset");

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  currentMode = "viewer";
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
  await disconnectSession("stop-scanning");
  if (currentStatus === "scanning") {
    notifyStatus("disconnected");
  }
};

export const connectToDevice = async (deviceId: string): Promise<void> => {
  await ensureReady();

  addLog(`Connecting viewer to device ${deviceId}`);

  await disconnectSession("connect-reset");

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  currentMode = "viewer";
  await BluetoothClassic.connect({ deviceAddress: deviceId });
  await BluetoothClassic.startListening();
};

export const disconnect = async (): Promise<void> => {
  addLog("Disconnecting active Bluetooth session");
  await disconnectSession("disconnect");
};

export const sendMessage = async (message: string): Promise<void> => {
  await ensureReady();
  if (isStoppingSession || writesBlocked) {
    addLog("Send skipped because session is stopping");
    return;
  }
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
