import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type NativeBtState = "disconnected" | "advertising" | "connected";

export interface BondedDevice {
  deviceId: string;
  name: string;
}

export interface BluetoothClassicPlugin {
  isBluetoothAvailable(): Promise<{ available: boolean }>;
  isBluetoothEnabled(): Promise<{ enabled: boolean }>;
  enableBluetooth(): Promise<{ enabled: boolean }>;
  getBondedDevices(): Promise<{ devices: BondedDevice[] }>;
  startServer(): Promise<void>;
  stopServer(): Promise<void>;
  connect(options: { deviceAddress: string }): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(options: { message: string }): Promise<{ sent: boolean }>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  getConnectionState(): Promise<{ state: NativeBtState | "scanning" }>;
  addListener(
    eventName: "btStatus",
    listenerFunc: (event: { state: NativeBtState | "scanning" }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "btData",
    listenerFunc: (event: { message: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "btLog",
    listenerFunc: (event: { message: string }) => void,
  ): Promise<PluginListenerHandle>;
}

export const BluetoothClassic = registerPlugin<BluetoothClassicPlugin>("BluetoothClassic");
