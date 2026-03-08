import { BluetoothLowEnergy } from "@capgo/capacitor-bluetooth-low-energy";

// Custom BLE UUIDs for Grid Controller
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHAR_STATES_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const CHAR_NOTIFY_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

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
    await BluetoothLowEnergy.initialize({ mode });
    isInitialized = true;
  } catch (e) {
    console.error("BLE init error:", e);
    throw new Error("Bluetooth non disponible sur cet appareil");
  }
};

// ── Master: advertise as peripheral ──
export const startAdvertising = async (states: number[]) => {
  await initBle("peripheral");
  notifyStatus("advertising");

  try {
    // Create GATT service with characteristics
    await BluetoothLowEnergy.addService({
      id: SERVICE_UUID,
      characteristics: [
        {
          id: CHAR_STATES_UUID,
          properties: ["read", "write"],
          permissions: ["readable", "writeable"],
          value: Array.from(encodeStates(states)),
        },
        {
          id: CHAR_NOTIFY_UUID,
          properties: ["read", "notify"],
          permissions: ["readable"],
          value: [1],
        },
      ],
    });

    await BluetoothLowEnergy.startAdvertising({
      name: "GridCtrl",
      services: [
        {
          id: SERVICE_UUID,
          characteristics: [
            {
              id: CHAR_STATES_UUID,
              properties: ["read", "write"],
              permissions: ["readable", "writeable"],
              value: Array.from(encodeStates(states)),
            },
          ],
        },
      ],
    });

    // Listen for connection events
    BluetoothLowEnergy.addListener("connected", () => {
      notifyStatus("connected");
    });

    BluetoothLowEnergy.addListener("disconnected", () => {
      notifyStatus("advertising");
    });
  } catch (e) {
    console.error("Advertise error:", e);
    notifyStatus("disconnected");
    throw e;
  }
};

export const updateAdvertisedStates = async (states: number[]) => {
  if (currentStatus !== "connected" && currentStatus !== "advertising") return;
  try {
    await BluetoothLowEnergy.updateCharacteristicValue({
      serviceId: SERVICE_UUID,
      characteristicId: CHAR_STATES_UUID,
      value: Array.from(encodeStates(states)),
    });
    // Notify connected viewer
    await BluetoothLowEnergy.notifyCharacteristicValueChanged({
      serviceId: SERVICE_UUID,
      characteristicId: CHAR_NOTIFY_UUID,
      value: [1],
    });
  } catch (e) {
    console.error("Update characteristic error:", e);
  }
};

export const stopAdvertising = async () => {
  try {
    await BluetoothLowEnergy.stopAdvertising();
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
    BluetoothLowEnergy.addListener("scanResult", async (device: any) => {
      if (device.name === "GridCtrl" || device.localName === "GridCtrl") {
        await BluetoothLowEnergy.stopScan();
        await connectToMaster(device.deviceId || device.id);
      }
    });

    await BluetoothLowEnergy.startScan({
      services: [SERVICE_UUID],
    });

    // Timeout after 30s
    setTimeout(async () => {
      if (currentStatus === "scanning") {
        await stopScanning();
      }
    }, 30000);
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

    // Start listening for notifications
    await BluetoothLowEnergy.startNotifications({
      deviceId,
      serviceId: SERVICE_UUID,
      characteristicId: CHAR_NOTIFY_UUID,
    });

    BluetoothLowEnergy.addListener("characteristicValueChanged", async () => {
      await readStatesFromMaster();
    });

    // Initial read
    await readStatesFromMaster();

    // Listen for disconnect
    BluetoothLowEnergy.addListener("disconnected", () => {
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
    const result = await BluetoothLowEnergy.read({
      deviceId: connectedDeviceId,
      serviceId: SERVICE_UUID,
      characteristicId: CHAR_STATES_UUID,
    });
    if (result.value) {
      const states = decodeStates(new Uint8Array(result.value));
      dataListeners.forEach((cb) => cb(states));
    }
  } catch (e) {
    console.error("Read error:", e);
  }
};

export const stopScanning = async () => {
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
  notifyStatus("disconnected");
  isInitialized = false;
};

// ── Encoding helpers ──
// Pack 150 states (0-3, 2 bits each) into ~38 bytes
const encodeStates = (states: number[]): Uint8Array => {
  const bytes = new Uint8Array(Math.ceil(states.length / 4));
  for (let i = 0; i < states.length; i++) {
    const byteIdx = Math.floor(i / 4);
    const bitOffset = (i % 4) * 2;
    bytes[byteIdx] |= (states[i] & 0x03) << bitOffset;
  }
  return bytes;
};

const decodeStates = (bytes: Uint8Array): number[] => {
  const states: number[] = [];
  for (let i = 0; i < 150; i++) {
    const byteIdx = Math.floor(i / 4);
    const bitOffset = (i % 4) * 2;
    states.push((bytes[byteIdx] >> bitOffset) & 0x03);
  }
  return states;
};
