// Bluetooth Classic (SPP) service using cordova-plugin-bluetooth-serial
// Master = Server (listen), Viewer = Client (connect)

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
let sendInterval: ReturnType<typeof setInterval> | null = null;
let subscribed = false;

const notifyStatus = (s: BtConnectionStatus) => {
  currentStatus = s;
  statusListeners.forEach((cb) => cb(s));
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

// ── Helpers ──
const isNative = () => !!(window as any).Capacitor?.isNativePlatform();

const getBtSerial = (): any => {
  const bt = (window as any).bluetoothSerial;
  if (!bt) throw new Error("bluetoothSerial plugin non disponible");
  return bt;
};

// Promise wrapper for cordova callbacks
const btPromise = <T>(fn: (resolve: (v: T) => void, reject: (e: any) => void) => void): Promise<T> =>
  new Promise<T>((resolve, reject) => fn(resolve, reject));

// ── Encoding ──
const encodeStates = (states: number[]): string => {
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
    states.push(byteIdx < bytes.length ? (bytes[byteIdx] >> bitOffset) & 0x03 : 0);
  }
  return states;
};

// ── Bluetooth enable ──
export const ensureBluetoothEnabled = async (): Promise<boolean> => {
  if (!isNative()) return true;
  try {
    const bt = getBtSerial();
    const enabled = await btPromise<boolean>((res, rej) => bt.isEnabled(res, rej)).catch(() => false);
    if (!enabled) {
      await btPromise<void>((res, rej) => bt.enable(res, rej));
    }
    return true;
  } catch (e) {
    console.error("BT enable error:", e);
    alert("Veuillez activer le Bluetooth dans les paramètres de votre téléphone, puis réessayez.");
    return false;
  }
};

// ── Subscribe to incoming data (line-delimited) ──
const subscribeToData = () => {
  if (subscribed) return;
  try {
    const bt = getBtSerial();
    bt.subscribe("\n", (rawData: string) => {
      console.log("BT DATA RECEIVED:", rawData);
      const trimmed = rawData.trim();
      if (!trimmed) return;
      const states = decodeStates(trimmed);
      if (states) {
        dataListeners.forEach((cb) => cb(states));
      }
    }, (err: any) => {
      console.error("BT subscribe error:", err);
    });
    subscribed = true;
  } catch (e) {
    console.error("Subscribe setup error:", e);
  }
};

const unsubscribeData = () => {
  if (!subscribed) return;
  try {
    const bt = getBtSerial();
    bt.unsubscribe();
  } catch {}
  subscribed = false;
};

// ── MASTER: Start server (listen for incoming SPP connections) ──
let latestStates: number[] = [];

export const startAdvertising = async (states: number[]) => {
  console.log("MASTER CLICK OK - startAdvertising");
  const enabled = await ensureBluetoothEnabled();
  if (!enabled) throw new Error("Bluetooth non activé");

  if (!isNative()) {
    notifyStatus("advertising");
    return;
  }

  latestStates = states;
  notifyStatus("advertising");

  try {
    const bt = getBtSerial();

    // Make device discoverable
    await btPromise<void>((res, rej) => {
      if (bt.setDiscoverable) {
        bt.setDiscoverable(300, res, rej);
      } else {
        res();
      }
    }).catch((e) => console.warn("setDiscoverable not supported:", e));

    // Listen for incoming connections
    await btPromise<void>((res, rej) => {
      if (bt.listen) {
        bt.listen(
          () => {
            console.log("MASTER: Client connected!");
            notifyStatus("connected");
            subscribeToData();
            // Send initial states immediately
            const encoded = encodeStates(latestStates) + "\n";
            bt.write(encoded, () => console.log("MASTER: Initial states sent"), (e: any) => console.warn("MASTER write err:", e));
            res();
          },
          (err: any) => {
            console.error("MASTER listen error:", err);
            rej(err);
          }
        );
      } else {
        // Fallback: plugin may not support listen, stay in advertising mode
        console.warn("bt.listen not available - server mode not supported by this plugin build");
        res();
      }
    });

    // Start continuous sending
    startContinuousSend();
  } catch (e) {
    console.error("Server start error:", e);
    notifyStatus("disconnected");
    throw new Error("Impossible de démarrer le serveur Bluetooth");
  }
};

const startContinuousSend = () => {
  stopContinuousSend();
  sendInterval = setInterval(() => {
    if (currentStatus !== "connected") return;
    try {
      const bt = getBtSerial();
      const encoded = encodeStates(latestStates) + "\n";
      bt.write(encoded,
        () => {},
        (e: any) => {
          console.warn("MASTER periodic send error:", e);
          notifyStatus("disconnected");
          stopContinuousSend();
        }
      );
    } catch {}
  }, 500);
};

const stopContinuousSend = () => {
  if (sendInterval) {
    clearInterval(sendInterval);
    sendInterval = null;
  }
};

export const updateAdvertisedStates = async (states: number[]) => {
  latestStates = states;
  // Next interval tick will send the updated states
  // Also send immediately if connected
  if (currentStatus === "connected" && isNative()) {
    try {
      const bt = getBtSerial();
      const encoded = encodeStates(states) + "\n";
      bt.write(encoded, () => {}, (e: any) => console.warn("Send error:", e));
    } catch {}
  }
};

export const getLatestStates = () => latestStates;

export const stopAdvertising = async () => {
  console.log("MASTER: stopAdvertising");
  stopContinuousSend();
  unsubscribeData();
  notifyStatus("disconnected");

  if (!isNative()) return;
  try {
    const bt = getBtSerial();
    await btPromise<void>((res, rej) => bt.disconnect(res, rej)).catch(() => {});
  } catch {}
};

// ── VIEWER: Scan for paired devices ──
export const startScanningForDevices = async () => {
  console.log("VIEWER CLICK OK - startScanningForDevices");
  const enabled = await ensureBluetoothEnabled();
  if (!enabled) throw new Error("Bluetooth non activé");

  if (!isNative()) {
    notifyStatus("scanning");
    // Simulate a device on web for testing UI
    setTimeout(() => {
      deviceDiscoveredListeners.forEach((cb) => cb({ deviceId: "00:11:22:33:44:55", name: "Appareil Test (Web)" }));
      notifyStatus("disconnected");
    }, 1000);
    return;
  }

  notifyStatus("scanning");

  try {
    const bt = getBtSerial();
    // List paired/bonded devices
    const devices = await btPromise<any[]>((res, rej) => bt.list(res, rej));
    console.log("BT paired devices:", JSON.stringify(devices));

    for (const device of devices) {
      const discovered: DiscoveredDevice = {
        deviceId: device.address || device.id || "",
        name: device.name || device.address || "Appareil inconnu",
      };
      deviceDiscoveredListeners.forEach((cb) => cb(discovered));
    }

    // Also try discovery for unpaired devices
    if (bt.discoverUnpaired) {
      try {
        const unpaired = await btPromise<any[]>((res, rej) => bt.discoverUnpaired(res, rej));
        console.log("BT unpaired devices:", JSON.stringify(unpaired));
        for (const device of unpaired) {
          const discovered: DiscoveredDevice = {
            deviceId: device.address || device.id || "",
            name: device.name || device.address || "Appareil inconnu",
          };
          deviceDiscoveredListeners.forEach((cb) => cb(discovered));
        }
      } catch (e) {
        console.warn("discoverUnpaired error:", e);
      }
    }

    notifyStatus("disconnected");
  } catch (e) {
    console.error("Scan error:", e);
    notifyStatus("disconnected");
    throw new Error("Erreur lors de la recherche d'appareils Bluetooth");
  }
};

// ── VIEWER: Connect to a specific master ──
export const connectToDevice = async (deviceId: string) => {
  console.log("VIEWER CLICK OK - connectToDevice:", deviceId);
  if (!isNative()) {
    notifyStatus("connected");
    return;
  }

  try {
    const bt = getBtSerial();

    await btPromise<void>((res, rej) => bt.connect(deviceId, res, rej));
    console.log("VIEWER: Connected to", deviceId);
    notifyStatus("connected");

    // Subscribe to receive data from master
    subscribeToData();

    // Send HELLO handshake
    bt.write("HELLO\n",
      () => console.log("VIEWER: HELLO sent"),
      (e: any) => console.warn("VIEWER write err:", e)
    );
  } catch (e) {
    console.error("Connect error:", e);
    notifyStatus("disconnected");
    throw new Error("Impossible de se connecter à l'appareil");
  }
};

export const startScanning = startScanningForDevices;

export const stopScanning = async () => {
  console.log("VIEWER: stopScanning");
  unsubscribeData();
  notifyStatus("disconnected");

  if (!isNative()) return;
  try {
    const bt = getBtSerial();
    await btPromise<void>((res, rej) => bt.disconnect(res, rej)).catch(() => {});
  } catch {}
};

// Legacy compat
export const startPolling = () => {};
export const stopPolling = () => {};
