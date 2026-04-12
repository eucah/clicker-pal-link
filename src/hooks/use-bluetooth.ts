import { useCallback, useEffect, useState } from "react";
import {
  type BtConnectionStatus,
  connectToDevice,
  disconnect,
  getConnectionStatus,
  hardStop,
  onDataReceived,
  onStatusChange,
  scanDevices,
  sendMessage,
  startAdvertising,
  updateAdvertisedPayload,
} from "@/lib/bt-service";
import { type ButtonInfo, normalizeButtonInfo } from "@/types/project";

export interface ReceivedProjectData {
  states: number[];
  buttonInfos: ButtonInfo[];
}

export const useBluetooth = (role: "master" | "viewer") => {
  const [status, setStatus] = useState<BtConnectionStatus>(getConnectionStatus());
  const [receivedData, setReceivedData] = useState<ReceivedProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onStatusChange(setStatus);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (role !== "viewer") {
      return;
    }

    const unsubscribe = onDataReceived((data) => {
      try {
        const parsed = JSON.parse(data);
        // New format: { states: [...], buttonInfos: [...] }
        if (parsed && Array.isArray(parsed.states)) {
          setReceivedData({
            states: parsed.states.map((v: unknown) => Number(v) || 0),
            buttonInfos: Array.isArray(parsed.buttonInfos)
              ? parsed.buttonInfos.map((info: ButtonInfo) => normalizeButtonInfo(info))
              : [],
          });
        }
        // Legacy format: plain array of states
        else if (Array.isArray(parsed)) {
          setReceivedData({
            states: parsed.map((v: unknown) => Number(v) || 0),
            buttonInfos: [],
          });
        }
      } catch (parseError) {
        console.warn("Bluetooth payload parsing failed", parseError, data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [role]);

  const buildPayload = useCallback((states: number[], buttonInfos: ButtonInfo[]): string => {
    return JSON.stringify({ states, buttonInfos });
  }, []);

  const share = useCallback(async (states: number[], buttonInfos: ButtonInfo[]) => {
    setError(null);
    try {
      console.log("MASTER CLICK OK - Starting share");
      await startAdvertising(buildPayload(states, buttonInfos));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur démarrage Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, [buildPayload]);

  const stopSharing = useCallback(async () => {
    setError(null);
    try {
      console.log("MASTER CLICK OK - Stopping share");
      await hardStop({ notifyPeer: true, reason: "stopSharing" });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur arrêt Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, []);

  const scan = useCallback(async () => {
    setError(null);
    try {
      return await scanDevices();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur scan Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, []);

  const stopScan = useCallback(async () => {
    setError(null);
    try {
      await hardStop({ notifyPeer: true, reason: "stopScan" });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur arrêt scan Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, []);

  const hardStopSession = useCallback(async (reason?: string) => {
    setError(null);
    try {
      await hardStop({ notifyPeer: true, reason: reason ?? "hook hard stop" });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur arrêt session";
      setError(message);
      throw caughtError;
    }
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    setError(null);
    try {
      console.log("VIEWER CLICK OK - Connecting to", deviceId);
      await connectToDevice(deviceId);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur connexion Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, []);

  const sendUpdate = useCallback(async (states: number[], buttonInfos: ButtonInfo[]) => {
    try {
      await updateAdvertisedPayload(buildPayload(states, buttonInfos));
    } catch (caughtError) {
      console.warn("Bluetooth state update failed", caughtError);
    }
  }, [buildPayload]);

  const sendRawMessage = useCallback(async (message: string) => {
    try {
      await sendMessage(message);
    } catch (caughtError) {
      console.warn("Bluetooth raw send failed", caughtError);
    }
  }, []);

  return {
    status,
    receivedData,
    error,
    share,
    stopSharing,
    scan,
    stopScan,
    connect,
    disconnect,
    sendUpdate,
    sendRawMessage,
    hardStopSession,
  };
};
