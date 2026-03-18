// Bluetooth Classic via cordova-plugin-bluetooth-serial
// Version stabilisée pour Capacitor / Android

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

const notifyStatus = (status: BtConnectionStatus) => {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
};

export const onStatusChange = (cb: StatusCallback) => {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter((listener) => listener !== cb);
  };
};

export const onDataReceived = (cb: DataCallback) => {
  dataListeners.push(cb);
  return () => {
    dataListeners = dataListeners.filter((listener) => listener !== cb);
  };
};

export const onDeviceDiscovered = (cb: DeviceDiscoveredCallback) => {
  deviceListeners.push(cb);
  return () => {
    deviceListeners = deviceListeners.filter((listener) => listener !== cb);
  };
};

const isNative = () => !!(window as any).Capacitor?.isNativePlatform?.();

const getBT = () => {
  const bt = (window as any).bluetoothSerial;
  if (!bt) {
    throw new Error("Plugin bluetoothSerial non disponible");
  }
  return bt;
};

const btPromise = <T>(
  executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void,
): Promise<T> => new Promise<T>((resolve, reject) => executor(resolve, reject));

const unsubscribeInternal = async () => {
  if (!subscribed || !isNative()) {
    subscribed = false;
    return;
  }

  try {
    const bt = getBT();
    await btPromise<void>((resolve, reject) => bt.unsubscribe(resolve, reject));
  } catch (e) {
    console.warn("UNSUBSCRIBE WARNING:", e);
  } finally {
    subscribed = false;
  }
};

const subscribeInternal = () => {
  if (subscribed || !isNative()) return;

  const bt = getBT();

  bt.subscribe(
    "\n",
    (data: string) => {
      const normalized = typeof data === "string" ? data.trim() : "";
      if (!normalized) return;

      console.log("RECEIVED:", normalized);
      dataListeners.forEach((cb) => cb(normalized));
    },
    (error: any) => {
      console.error("SUBSCRIBE ERROR:", error);
    },
  );

  subscribed = true;
};

const safeDisconnectInternal = async () => {
  if (!isNative()) {
    subscribed = false;
    currentStatus = "disconnected";
    return;
  }

  try {
    await unsubscribeInternal();
  } catch {}

  try {
    const bt = getBT();
    await btPromise<void>((resolve, reject) => bt.disconnect(resolve, reject));
    console.log("DISCONNECT OK");
  } catch (e) {
    console.warn("DISCONNECT WARNING:", e);
  } finally {
    subscribed = false;
    notifyStatus("disconnected");
  }
};

export const ensureBluetoothEnabled = async (): Promise<boolean> => {
  if (!isNative()) return true;

  try {
    const bt = getBT();

    const enabled = await btPromise<boolean>((resolve, reject) =>
      bt.isEnabled(resolve, reject),
    ).catch(() => false);

    if (!enabled) {
      await btPromise<void>((resolve, reject) => bt.enable(resolve, reject));
    }

    return true;
  } catch (e) {
    console.error("BT ENABLE ERROR:", e);
    return false;
  }
};

export const scanDevices = async (): Promise<DiscoveredDevice[]> => {
  console.log("SCAN START");

  if (!isNative()) {
    notifyStatus("scanning");
    const mockDevice = { deviceId: "00:11:22:33:44:55", name: "Test Device (Web)" };
    deviceListeners.forEach((cb) => cb(mockDevice));
    notifyStatus("disconnected");
    return [mockDevice];
  }

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  // Amélioration importante :
  // on coupe toute connexion résiduelle avant un nouveau scan
  await safeDisconnectInternal();
  notifyStatus("scanning");

  try {
    const bt = getBT();
    const rawDevices = await btPromise<any[]>((resolve, reject) => bt.list(resolve, reject));

    console.log("DEVICES RAW:", rawDevices);

    const seen = new Set<string>();
    const devices: DiscoveredDevice[] = [];

    for (const device of rawDevices ?? []) {
      const deviceId = device?.address || device?.id || "";
      if (!deviceId || seen.has(deviceId)) continue;

      seen.add(deviceId);

      const normalized: DiscoveredDevice = {
        deviceId,
        name: device?.name || deviceId,
      };

      devices.push(normalized);
      deviceListeners.forEach((cb) => cb(normalized));
    }

    notifyStatus("disconnected");
    return devices;
  } catch (e) {
    console.error("SCAN ERROR:", e);
    notifyStatus("disconnected");
    throw new Error("Erreur lors de la recherche d'appareils Bluetooth");
  }
};

export const connectToDevice = async (deviceId: string): Promise<void> => {
  console.log("CONNECT TO:", deviceId);

  if (!deviceId) {
    throw new Error("Identifiant appareil invalide");
  }

  if (!isNative()) {
    notifyStatus("connected");
    return;
  }

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error("Bluetooth non activé");
  }

  // Amélioration importante :
  // on force une déconnexion propre avant nouvelle connexion
  await safeDisconnectInternal();

  try {
    const bt = getBT();

    await btPromise<void>((resolve, reject) => bt.connect(deviceId, resolve, reject));

    console.log("CONNECTED OK:", deviceId);
    notifyStatus("connected");
    subscribeInternal();

    // Handshake léger pour valider le flux
    await btPromise<void>((resolve, reject) => bt.write("HELLO\n", resolve, reject)).catch(
      (e) => {
        console.warn("HANDSHAKE WARNING:", e);
      },
    );
  } catch (e) {
    console.error("CONNECT ERROR:", e);
    notifyStatus("disconnected");
    throw new Error("Impossible de se connecter à l'appareil");
  }
};

export const sendMessage = async (message: string): Promise<void> => {
  if (!message?.trim()) return;

  if (!isNative()) {
    console.log("SEND MOCK:", message);
    return;
  }

  try {
    const bt = getBT();
    const payload = message.endsWith("\n") ? message : `${message}\n`;

    await btPromise<void>((resolve, reject) => bt.write(payload, resolve, reject));
    console.log("SENT:", payload.trim());
  } catch (e) {
    console.error("SEND ERROR:", e);
    notifyStatus("disconnected");
    throw new Error("Erreur lors de l'envoi Bluetooth");
  }
};

export const disconnect = async (): Promise<void> => {
  await safeDisconnectInternal();
};

export const getConnectionStatus = () => currentStatus;

// ───────────────
// COMPATIBILITÉ ANCIEN CODE
// ───────────────

export const startScanningForDevices = scanDevices;
export const startScanning = scanDevices;

export const stopScanning = async () => {
  await disconnect();
};

export const startAdvertising = async (_states?: number[]) => {
  console.warn("startAdvertising supprimé : mode Bluetooth Classic direct utilisé");
};

export const stopAdvertising = async () => {
  await disconnect();
};

export const updateAdvertisedStates = async (states?: number[]) => {
  if (!states) return;
  try {
    await sendMessage(JSON.stringify(states));
  } catch (e) {
    console.warn("UPDATE STATES WARNING:", e);
  }
};

export const startPolling = () => {};
export const stopPolling = () => {};
