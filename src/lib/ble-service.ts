import { BluetoothLowEnergy } from "@capgo/capacitor-bluetooth-low-energy";
import type { DeviceScannedEvent, CharacteristicChangedEvent } from "@capgo/capacitor-bluetooth-low-energy";

// Custom BLE UUIDs for Grid Controller
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHAR_STATES_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

export type BleConnectionStatus = "disconnected" | "scanning" | "advertising" | "connected";

type StatusCallback = (status: BleConnectionStatus) => void;
type DataCallback = (states: number[]) => void;

let currentStatus: BleConnectionStatus = "disconnected";
let statusListeners: StatusCallback[] = [];
let dataListeners: DataCallback[] = [];
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

export const getConnectionStatus = () => currentStatus;

const initBle = async (mode: "central" | "peripheral") => {
  if (isInitialized) return;
  try {
    // Request permissions first (Android 12+)
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
// Pack 150 states (0-3, 2 bits each) into ~38 bytes
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

    // Listen for viewer connecting
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

// Master sends updated states by writing to the characteristic
// Since peripheral mode has limited API, we use a polling approach:
// The viewer periodically reads the characteristic from the master.
// We store latest states so when viewer reads, it gets current data.
let latestStates: number[] = [];

export const updateAdvertisedStates = async (states: number[]) => {
  latestStates = states;
  // In peripheral mode, the plugin handles characteristic reads natively.
  // We can't programmatically update char values via JS in this plugin.
  // So we use a workaround: viewer polls by reconnecting/reading.
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

// ── Viewer: scan and connect as central ──
export const startScanning = async () => {
  await initBle("central");
  notifyStatus("scanning");

  try {
    await BluetoothLowEnergy.addListener("deviceScanned", async (event: DeviceScannedEvent) => {
      const device = event.device;
      if (device.name === "GridCtrl") {
        await BluetoothLowEnergy.stopScan();
        await connectToMaster(device.deviceId);
      }
    });

    await BluetoothLowEnergy.startScan({
      services: [SERVICE_UUID],
      timeout: 30000,
    });

    // Timeout fallback
    setTimeout(async () => {
      if (currentStatus === "scanning") {
        await stopScanning();
      }
    }, 31000);
  } catch (e) {
    console.error("Scan error:", e);
    notifyStatus("disconnected");
    throw e;
  }
};

const connectToMaster = async (deviceId: string) => {
  try {
    await BluetoothLowEnergy.connect({ deviceId });
    connectedDeviceId = deviceId;
    notifyStatus("connected");

    // Discover services first
    await BluetoothLowEnergy.discoverServices({ deviceId });

    // Start listening for characteristic notifications
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

    // Listen for disconnect
    await BluetoothLowEnergy.addListener("deviceDisconnected", () => {
      connectedDeviceId = null;
      notifyStatus("disconnected");
    });
  } catch (e) {
    console.error("Connect error:", e);
    notifyStatus("disconnected");
  }
};

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

// Start polling for state updates (fallback for when notifications aren't supported)
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
