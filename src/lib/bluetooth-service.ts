// src/lib/bluetooth-service.ts
import { BluetoothSerial } from 'capacitor-bluetooth-serial';

export type BluetoothConnectionStatus = "disconnected" | "scanning" | "discovering" | "connected";

type StatusCallback = (status: BluetoothConnectionStatus) => void;
type DataCallback = (states: number[]) => void;

let currentStatus: BluetoothConnectionStatus = "disconnected";
let statusListeners: StatusCallback[] = [];
let dataListeners: DataCallback[] = [];
let connectedAddress: string | null = null;

// --- Status notification helpers ---
const notifyStatus = (status: BluetoothConnectionStatus) => {
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

// --- Encoding helpers ---
const encodeStates = (states: number[]): string => {
  // Simple comma separated values for Bluetooth Classic Serial
  return states.join(',') + '\n';
};

const decodeStates = (data: string): number[] => {
  try {
    return data.split(',').map(Number);
  } catch (e) {
    console.error("Decode error:", e);
    return [];
  }
};

// --- Master mode: Server ---
export const startServer = async () => {
  try {
    const isEnabled = await BluetoothSerial.isEnabled();
    if (!isEnabled.enabled) {
      throw new Error("Bluetooth is disabled");
    }

    notifyStatus("discovering");

    // Note: Classic Bluetooth usually requires the device to be discoverable
    // This plugin handles the serial connection once paired or discovered

    BluetoothSerial.addListener('read', (data) => {
       // If master receives data from viewer
       console.log("Received from viewer:", data.value);
    });

  } catch (e) {
    console.error("Server error:", e);
    notifyStatus("disconnected");
    throw e;
  }
};

export const sendUpdate = async (states: number[]) => {
  if (currentStatus !== "connected" && currentStatus !== "discovering") return;

  try {
    const data = encodeStates(states);
    await BluetoothSerial.write({ value: data });
  } catch (e) {
    console.error("Send error:", e);
  }
};

export const stopServer = async () => {
  try {
    await BluetoothSerial.removeAllListeners();
  } catch (e) {
    console.error("Stop server error:", e);
  }
  notifyStatus("disconnected");
};

// --- Viewer mode: Client ---
export const startDiscovery = async () => {
  notifyStatus("scanning");

  try {
    const devices = await BluetoothSerial.list();
    // Look for a specific device name or let user pick (simplified here)
    const target = devices.devices.find(d => d.name === "GridCtrl");

    if (target) {
      await connectToDevice(target.address);
    } else {
       // If not paired, we might need to discover
       const uncovered = await BluetoothSerial.discoverUnpaired();
       const found = uncovered.devices.find(d => d.name === "GridCtrl");
       if (found) {
         await connectToDevice(found.address);
       } else {
         throw new Error("Device GridCtrl not found. Please pair it first.");
       }
    }
  } catch (e) {
    console.error("Discovery error:", e);
    notifyStatus("disconnected");
    throw e;
  }
};

const connectToDevice = async (address: string) => {
  try {
    await BluetoothSerial.connect({ address });
    connectedAddress = address;
    notifyStatus("connected");

    BluetoothSerial.addListener('read', (data) => {
      const states = decodeStates(data.value);
      dataListeners.forEach((cb) => cb(states));
    });

  } catch (e) {
    console.error("Connect error:", e);
    notifyStatus("disconnected");
  }
};

export const stopDiscovery = async () => {
  if (connectedAddress) {
    await BluetoothSerial.disconnect();
    connectedAddress = null;
  }
  await BluetoothSerial.removeAllListeners();
  notifyStatus("disconnected");
};
