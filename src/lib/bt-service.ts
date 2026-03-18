// Bluetooth Classic via cordova-plugin-bluetooth-serial
// Architecture corrigée : connexion directe entre appareils appairés

export type BtConnectionStatus = "disconnected" | "scanning" | "connected";

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

let subscribed = false;

const notifyStatus = (s: BtConnectionStatus) => {
  currentStatus = s;
  statusListeners.forEach(cb => cb(s));
};

export const onStatusChange = (cb: StatusCallback) => {
  statusListeners.push(cb);
};

export const onDataReceived = (cb: DataCallback) => {
  dataListeners.push(cb);
};

export const onDeviceDiscovered = (cb: DeviceDiscoveredCallback) => {
  deviceListeners.push(cb);
};

const getBT = () => {
  const bt = (window as any).bluetoothSerial;
  if (!bt) throw new Error("BluetoothSerial non dispo");
  return bt;
};

const btPromise = <T>(fn: (res: any, rej: any) => void) =>
  new Promise<T>((resolve, reject) => fn(resolve, reject));

// ───────────────
// ACTIVER BLUETOOTH
// ───────────────
export const ensureBluetoothEnabled = async () => {
  const bt = getBT();

  try {
    const enabled = await btPromise<boolean>((res, rej) =>
      bt.isEnabled(res, rej)
    ).catch(() => false);

    if (!enabled) {
      await btPromise<void>((res, rej) => bt.enable(res, rej));
    }

    return true;
  } catch (e) {
    console.error("BT enable error", e);
    return false;
  }
};

// ───────────────
// SCAN (appareils appairés)
// ───────────────
export const scanDevices = async () => {
  console.log("SCAN START");

  await ensureBluetoothEnabled();
  notifyStatus("scanning");

  const bt = getBT();

  try {
    const devices = await btPromise<any[]>((res, rej) =>
      bt.list(res, rej)
    );

    console.log("DEVICES:", devices);

    devices.forEach(d => {
      deviceListeners.forEach(cb =>
        cb({
          deviceId: d.address,
          name: d.name || d.address
        })
      );
    });

    notifyStatus("disconnected");
  } catch (e) {
    console.error("SCAN ERROR", e);
    notifyStatus("disconnected");
  }
};

// ───────────────
// CONNEXION
// ───────────────
export const connectToDevice = async (deviceId: string) => {
  console.log("CONNECT TO:", deviceId);

  await ensureBluetoothEnabled();

  const bt = getBT();

  try {
    await btPromise<void>((res, rej) =>
      bt.connect(deviceId, res, rej)
    );

    console.log("CONNECTED OK");
    notifyStatus("connected");

    subscribe();

    // test handshake
    bt.write("HELLO\n");
  } catch (e) {
    console.error("CONNECT ERROR", e);
    notifyStatus("disconnected");
  }
};

// ───────────────
// ENVOI
// ───────────────
export const sendMessage = (msg: string) => {
  try {
    const bt = getBT();
    bt.write(msg + "\n");
  } catch (e) {
    console.error("SEND ERROR", e);
  }
};

// ───────────────
// RÉCEPTION
// ───────────────
const subscribe = () => {
  if (subscribed) return;

  const bt = getBT();

  bt.subscribe("\n", (data: string) => {
    console.log("RECEIVED:", data);
    dataListeners.forEach(cb => cb(data));
  });

  subscribed = true;
};

// ───────────────
// DECONNEXION
// ───────────────
export const disconnect = async () => {
  const bt = getBT();

  try {
    await btPromise<void>((res, rej) =>
      bt.disconnect(res, rej)
    );
  } catch {}

  subscribed = false;
  notifyStatus("disconnected");
};
