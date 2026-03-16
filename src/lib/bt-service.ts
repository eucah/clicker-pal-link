// Bluetooth Classic (SPP/RFCOMM) service using @yesprasoon/capacitor-bluetooth-communication
// Master = Server, Viewer = Client

export type BtConnectionStatus = "disconnected" | "scanning" | "advertising" | "connected";

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
}

type StatusCallback = (status: BtConnectionStatus) => void;
type DataCallback = (states: number[]) => void;
type DeviceDiscoveredCallback = (device: DiscoveredDevice) => void;

let currentStatus: BtConnectionStatus = "disconnected";
let statusListeners: StatusCallback[] = [];
let dataListeners: DataCallback[] = [];
let deviceDiscoveredListeners: DeviceDiscoveredCallback[] = [];
let isInitialized = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let serverDataListener: { remove: () => Promise<void> } | null = null;
let clientDataListener: { remove: () => Promise<void> } | null = null;

const notifyStatus = (status: BtConnectionStatus) => {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
};

export const onStatusChange = (cb: StatusCallback) => {
  statusListeners.push(cb);
  return () => { statusListeners = statusListeners.filter((l) => l !== cb); };
};

export const onDataReceived = (cb: DataCallback) => {
  dataListeners.push(cb);
  return () => { dataListeners = dataListeners.filter((l) => l !== cb); };
};

export const onDeviceDiscovered = (cb: DeviceDiscoveredCallback) => {
  deviceDiscoveredListeners.push(cb);
  return () => { deviceDiscoveredListeners = deviceDiscoveredListeners.filter((l) => l !== cb); };
};

export const getConnectionStatus = () => currentStatus;

// ── Encoding helpers ──
const encodeStates = (states: number[]): string => {
  // Pack 150 states (2 bits each) into base64-like string
  const bytes: number[] = new Array(Math.ceil(states.length / 4)).fill(0);
  for (let i = 0; i < states.length; i++) {
    const byteIdx = Math.floor(i / 4);
    const bitOffset = (i % 4) * 2;
    bytes[byteIdx] |= (states[i] & 0x03) << bitOffset;
  }
  return "STATES:" + bytes.map((b) => String.fromCharCode(b + 33)).join("");
};

const decodeStates = (data: string): number[] | null => {
  if (!data.startsWith("STATES:")) return null;
  const encoded = data.substring(7);
  const bytes = Array.from(encoded).map((c) => c.charCodeAt(0) - 33);
  const states: number[] = [];
  for (let i = 0; i < 150; i++) {
    const byteIdx = Math.floor(i / 4);
    const bitOffset = (i % 4) * 2;
    if (byteIdx < bytes.length) {
      states.push((bytes[byteIdx] >> bitOffset) & 0x03);
    } else {
      states.push(0);
    }
  }
  return states;
};

const isNative = () => !!(window as any).Capacitor?.isNativePlatform();

const getBtPlugin = async () => {
  if (!isNative()) throw new Error("Bluetooth non disponible sur le web");
  const { BluetoothCommunication } = await import("@yesprasoon/capacitor-bluetooth-communication");
  return BluetoothCommunication;
};

const initBt = async () => {
  if (isInitialized) return;
  const BT = await getBtPlugin();
  await BT.initialize();
  isInitialized = true;
};

export const ensureBluetoothEnabled = async (): Promise<boolean> => {
  if (!(window as any).Capacitor?.isNativePlatform()) return true;
  try {
    const BT = await getBtPlugin();
    await BT.initialize();
    await BT.enableBluetooth();
    return true;
  } catch (e) {
    console.error("BT enable error:", e);
    alert("Veuillez activer le Bluetooth dans les paramètres de votre téléphone, puis réessayez.");
    return false;
  }
};

const removeServerListener = async () => {
  if (!serverDataListener) return;
  try {
    await serverDataListener.remove();
  } catch {}
  serverDataListener = null;
};

const removeClientListener = async () => {
  if (!clientDataListener) return;
  try {
    await clientDataListener.remove();
  } catch {}
  clientDataListener = null;
};

// ── Master: start as server ──
let latestStates: number[] = [];

export const startAdvertising = async (states: number[]) => {
  const enabled = await ensureBluetoothEnabled();
  if (!enabled) throw new Error("Bluetooth non activé");

  await initBt();
  latestStates = states;
  notifyStatus("advertising");

  try {
    const BT = await getBtPlugin();
    await removeServerListener();

    serverDataListener = await BT.addListener("dataReceived", async (event: any) => {
      const data = event?.data ?? event;
      if (data === "HELLO") {
        try {
          await BT.sendData({ data: encodeStates(latestStates) });
        } catch (sendError) {
          console.warn("Initial states send error:", sendError);
        }
      }
    });

    await BT.startServer();
    notifyStatus("connected");
  } catch (e) {
    console.error("Server start error:", e);
    notifyStatus("disconnected");
    throw new Error("Impossible de démarrer le serveur Bluetooth");
  }
};

export const updateAdvertisedStates = async (states: number[]) => {
  latestStates = states;
  // Send to connected viewer
  try {
    const BT = await getBtPlugin();
    const encoded = encodeStates(states);
    await BT.sendData({ data: encoded });
  } catch (e) {
    console.warn("Send states error:", e);
  }
};

export const getLatestStates = () => latestStates;

export const stopAdvertising = async () => {
  notifyStatus("disconnected");
  isInitialized = false;
  await removeServerListener();

  try {
    const BT = await getBtPlugin();
    await BT.stopServer();
  } catch (e) {
    console.error("Stop server error:", e);
  }
};

// ── Viewer: scan for devices ──
export const startScanningForDevices = async () => {
  const enabled = await ensureBluetoothEnabled();
  if (!enabled) throw new Error("Bluetooth non activé");

  await initBt();
  notifyStatus("scanning");

  try {
    const BT = await getBtPlugin();
    const result = await BT.scanDevices();

    // result should contain a list of devices
    const devices = (result as any)?.devices || [];
    for (const device of devices) {
      if (device.name || device.address) {
        const discovered: DiscoveredDevice = {
          deviceId: device.address || device.id || "",
          name: device.name || device.address || "Appareil inconnu",
        };
        deviceDiscoveredListeners.forEach((cb) => cb(discovered));
      }
    }

    if (devices.length === 0) {
      notifyStatus("disconnected");
    }
  } catch (e) {
    console.error("Scan error:", e);
    notifyStatus("disconnected");
    throw new Error("Erreur lors de la recherche d'appareils Bluetooth");
  }
};

// ── Viewer: connect to a specific master ──
export const connectToDevice = async (deviceId: string) => {
  try {
    const BT = await getBtPlugin();
    await removeClientListener();

    clientDataListener = await BT.addListener("dataReceived", (event: any) => {
      const data = event?.data ?? event;
      if (typeof data === "string") {
        const states = decodeStates(data);
        if (states) {
          dataListeners.forEach((cb) => cb(states));
        }
      }
    });

    await BT.connect({ address: deviceId });
    await BT.sendData({ data: "HELLO" });
    notifyStatus("connected");
  } catch (e) {
    console.error("Connect error:", e);
    notifyStatus("disconnected");
    throw new Error("Impossible de se connecter à l'appareil");
  }
};

export const startScanning = startScanningForDevices;

export const startPolling = () => {
  // No polling needed with Bluetooth Classic - data comes via listener
};

export const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

export const stopScanning = async () => {
  stopPolling();
  notifyStatus("disconnected");
  isInitialized = false;

  try {
    const BT = await getBtPlugin();
    await BT.disconnect();
    try { await (BT as any).removeAllListeners?.(); } catch {}
  } catch (e) {
    console.error("Disconnect error:", e);
  }
};
