import { useCallback, useEffect, useState } from "react";
import {
  type BtConnectionStatus,
  connectToDevice,
  disconnect,
  getConnectionStatus,
  onDataReceived,
  onStatusChange,
  scanDevices,
  sendMessage,
  startAdvertising,
  stopAdvertising,
  stopScanning,
  updateAdvertisedStates,
} from "@/lib/bt-service";

export const useBluetooth = (role: "master" | "viewer") => {
  const [status, setStatus] = useState<BtConnectionStatus>(getConnectionStatus());
  const [receivedStates, setReceivedStates] = useState<number[] | null>(null);
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
        if (Array.isArray(parsed)) {
          setReceivedStates(parsed.map((value) => Number(value) || 0));
        }
      } catch (parseError) {
        console.warn("Bluetooth payload parsing failed", parseError, data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [role]);

  const share = useCallback(async (states: number[]) => {
    setError(null);

    try {
      await startAdvertising(states);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur démarrage Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, []);

  const stopSharing = useCallback(async () => {
    setError(null);

    try {
      await stopAdvertising();
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
      await stopScanning();
      await disconnect();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur arrêt scan Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    setError(null);

    try {
      await connectToDevice(deviceId);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur connexion Bluetooth";
      setError(message);
      throw caughtError;
    }
  }, []);

  const sendUpdate = useCallback(async (states: number[]) => {
    try {
      await updateAdvertisedStates(states);
    } catch (caughtError) {
      console.warn("Bluetooth state update failed", caughtError);
    }
  }, []);

  const sendRawMessage = useCallback(async (message: string) => {
    try {
      await sendMessage(message);
    } catch (caughtError) {
      console.warn("Bluetooth raw send failed", caughtError);
    }
  }, []);

  return {
    status,
    receivedStates,
    error,
    share,
    stopSharing,
    scan,
    stopScan,
    connect,
    disconnect,
    sendUpdate,
    sendRawMessage,
  };
};
