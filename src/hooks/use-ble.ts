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
  const [status, setStatus] = useState<BtConnectionStatus>(getConnectionStatus());
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
    try { await stopAdvertising(); } catch {}
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
    try { await stopScanning(); } catch {}
  }, []);

  const sendUpdate = useCallback(async (states: number[]) => {
    try { await updateAdvertisedStates(states); } catch {}
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
