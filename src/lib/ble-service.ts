import { BluetoothLowEnergy } from "@capgo/capacitor-bluetooth-low-energy";
import type { DeviceScannedEvent, CharacteristicChangedEvent } from "@capgo/capacitor-bluetooth-low-energy";
import { ensureBluetoothEnabled } from "@/lib/permissions";

// Custom BLE UUIDs for Grid Controller
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHAR_STATES_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

export type BleConnectionStatus = "disconnected" | "scanning" | "advertising" | "connected";

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
}

type StatusCallback = (status: BleConnectionStatus) => void;
type DataCallback = (states: number[]) => void;
type DeviceDiscoveredCallback = (device: DiscoveredDevice) => void;

let currentStatus: BleConnectionStatus = "disconnected";
let statusListeners: StatusCallback[] = [];
let dataListeners: DataCallback[] = [];
let deviceDiscoveredListeners: DeviceDiscoveredCallback[] = [];
let connectedDeviceId: string | null = null;
let isInitialized = false;

const notifyStatus = (status: BleConnectionStatus) => {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
};

export const onStatusChange = (cb: StatusCallback) => {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== cb);
  };
};

export const onDataReceived = (cb: DataCallback) => {
  dataListeners.push(cb);
  return () => {
    dataListeners = dataListeners.filter((l) => l !== cb);
  };
};

export const onDeviceDiscovered = (cb: DeviceDiscoveredCallback) => {
  deviceDiscoveredListeners.push(cb);
  return () => {
    deviceDiscoveredListeners = deviceDiscoveredListeners.filter((l) => l !== cb);
  };
};

export const getConnectionStatus = () => currentStatus;

const initBle = async (mode: "central" | "peripheral") => {
  if (isInitialized) return;

  // Ensure Bluetooth is enabled before init
  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  try {
    try {
      await BluetoothLowEnergy.requestPermissions();
    } catch (e) {
      console.warn("BLE requestPermissions:", e);
    }
    await BluetoothLowEnergy.initialize({ mode });
    isInitialized = true;
  } catch (e) {
    console.error("BLE init error:", e);
    throw new Error("Bluetooth non disponible sur cet appareil");
  }
};

// ── Encoding helpers ──
const encodeStates = (states: number[]): number[] => {
  const bytes: number[] = new Array(Math.ceil(states.length / 4)).fill(0);
  for (let i = 0; i < states.length; i++) {
    const byteIdx = Math.floor(i / 4);
    const bitOffset = (i % 4) * 2;
    bytes[byteIdx] |= (states[i] & 0x03) << bitOffset;
  }
  return bytes;
};

const decodeStates = (bytes: number[]): number[] => {
  const states: number[] = [];
  for (let i = 0; i < 150; i++) {
    const byteIdx = Math.floor(i / 4);
    const bitOffset = (i % 4) * 2;
    states.push((bytes[byteIdx] >> bitOffset) & 0x03);
  }
  return states;
};

// ── Master: advertise as peripheral ──
export const startAdvertising = async (_states: number[]) => {
  await initBle("peripheral");
  notifyStatus("advertising");

  try {
    await BluetoothLowEnergy.startAdvertising({
      name: "GridCtrl",
      services: [SERVICE_UUID],
    });

    await BluetoothLowEnergy.addListener("deviceConnected", () => {
      notifyStatus("connected");
    });

    await BluetoothLowEnergy.addListener("deviceDisconnected", () => {
      notifyStatus("advertising");
    });
  } catch (e) {
    console.error("Advertise error:", e);
    notifyStatus("disconnected");
    throw e;
  }
};

let latestStates: number[] = [];

export const updateAdvertisedStates = async (states: number[]) => {
  latestStates = states;
};

export const getLatestStates = () => latestStates;

export const stopAdvertising = async () => {
  try {
    await BluetoothLowEnergy.stopAdvertising();
    await BluetoothLowEnergy.removeAllListeners();
  } catch (e) {
    console.error("Stop advertise error:", e);
  }
  notifyStatus("disconnected");
  isInitialized = false;
};

// ── Viewer: scan for available sessions ──
export const startScanningForDevices = async () => {
  await initBle("central");
  notifyStatus("scanning");

  try {
    const discoveredIds = new Set<string>();

    await BluetoothLowEnergy.addListener("deviceScanned", (event: DeviceScannedEvent) => {
      const device = event.device;
      if (device.name && device.name.startsWith("GridCtrl") && !discoveredIds.has(device.deviceId)) {
        discoveredIds.add(device.deviceId);
        const discovered: DiscoveredDevice = {
          deviceId: device.deviceId,
          name: device.name,
        };
        deviceDiscoveredListeners.forEach((cb) => cb(discovered));
      }
    });

    await BluetoothLowEnergy.startScan({
      services: [SERVICE_UUID],
      timeout: 30000,
    });

    setTimeout(async () => {
      if (currentStatus === "scanning") {
        try {
          await BluetoothLowEnergy.stopScan();
        } catch {}
        notifyStatus("disconnected");
      }
    }, 31000);
  } catch (e) {
    console.error("Scan error:", e);
    notifyStatus("disconnected");
    throw e;
  }
};

// ── Viewer: connect to a specific master ──
export const connectToDevice = async (deviceId: string) => {
  try {
    // Stop scanning first
    try {
      await BluetoothLowEnergy.stopScan();
    } catch {}

    await BluetoothLowEnergy.connect({ deviceId });
    connectedDeviceId = deviceId;
    notifyStatus("connected");

    await BluetoothLowEnergy.discoverServices({ deviceId });

    await BluetoothLowEnergy.startCharacteristicNotifications({
      deviceId,
      service: SERVICE_UUID,
      characteristic: CHAR_STATES_UUID,
    });

    await BluetoothLowEnergy.addListener("characteristicChanged", (event: CharacteristicChangedEvent) => {
      if (event.characteristic.toLowerCase() === CHAR_STATES_UUID.toLowerCase()) {
        const states = decodeStates(event.value);
        dataListeners.forEach((cb) => cb(states));
      }
    });

    // Initial read
    await readStatesFromMaster();

    await BluetoothLowEnergy.addListener("deviceDisconnected", () => {
      connectedDeviceId = null;
      notifyStatus("disconnected");
    });
  } catch (e) {
    console.error("Connect error:", e);
    notifyStatus("disconnected");
    throw e;
  }
};

// Keep legacy startScanning for backward compat
export const startScanning = startScanningForDevices;

const readStatesFromMaster = async () => {
  if (!connectedDeviceId) return;
  try {
    const result = await BluetoothLowEnergy.readCharacteristic({
      deviceId: connectedDeviceId,
      service: SERVICE_UUID,
      characteristic: CHAR_STATES_UUID,
    });
    if (result.value) {
      const states = decodeStates(result.value);
      dataListeners.forEach((cb) => cb(states));
    }
  } catch (e) {
    console.error("Read error:", e);
  }
};

let pollInterval: ReturnType<typeof setInterval> | null = null;

export const startPolling = () => {
  if (pollInterval) return;
  pollInterval = setInterval(readStatesFromMaster, 2000);
};

export const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

export const stopScanning = async () => {
  stopPolling();
  try {
    await BluetoothLowEnergy.stopScan();
  } catch (e) {
    console.error("Stop scan error:", e);
  }
  if (connectedDeviceId) {
    try {
      await BluetoothLowEnergy.disconnect({ deviceId: connectedDeviceId });
    } catch (e) {
      console.error("Disconnect error:", e);
    }
    connectedDeviceId = null;
  }
  try {
    await BluetoothLowEnergy.removeAllListeners();
  } catch (e) {
    console.error("Remove listeners error:", e);
  }
  notifyStatus("disconnected");
  isInitialized = false;
};
