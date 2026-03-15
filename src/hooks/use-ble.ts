import { useEffect, useState, useCallback } from "react";
import {
  BtConnectionStatus,
  onStatusChange,
  onDataReceived,
  getConnectionStatus,
  startAdvertising,
  stopAdvertising,
  updateAdvertisedStates,
  startScanning,
  stopScanning,
} from "@/lib/bt-service";

export const useBle = (role: "master" | "viewer") => {
  const [status, setStatus] = useState<BleConnectionStatus>(getConnectionStatus());
  const [receivedStates, setReceivedStates] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onStatusChange(setStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (role === "viewer") {
      const unsub = onDataReceived(setReceivedStates);
      return unsub;
    }
  }, [role]);

  const share = useCallback(async (states: number[]) => {
    setError(null);
    try {
      await startAdvertising(states);
    } catch (e: any) {
      setError(e.message || "Erreur Bluetooth");
    }
  }, []);

  const stopSharing = useCallback(async () => {
    await stopAdvertising();
  }, []);

  const scan = useCallback(async () => {
    setError(null);
    try {
      await startScanning();
    } catch (e: any) {
      setError(e.message || "Erreur Bluetooth");
    }
  }, []);

  const stopScan = useCallback(async () => {
    await stopScanning();
  }, []);

  const sendUpdate = useCallback(async (states: number[]) => {
    await updateAdvertisedStates(states);
  }, []);

  return {
    status,
    receivedStates,
    error,
    share,
    stopSharing,
    scan,
    stopScan,
    sendUpdate,
  };
};
