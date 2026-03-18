import { useEffect, useState, useCallback } from "react";
import {
  BtConnectionStatus,
  onStatusChange,
  onDataReceived,
  getConnectionStatus,
  scanDevices,
  connectToDevice,
  sendMessage,
  disconnect,
} from "@/lib/bt-service";

export const useBle = (role: "master" | "viewer") => {
  const [status, setStatus] = useState<BtConnectionStatus>(getConnectionStatus());
  const [receivedStates, setReceivedStates] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // STATUS
  useEffect(() => {
    onStatusChange(setStatus);
  }, []);

  // DATA RECEPTION (viewer)
  useEffect(() => {
    if (role === "viewer") {
      onDataReceived((data: string) => {
        try {
          const parsed = JSON.parse(data);
          setReceivedStates(parsed);
        } catch {
          console.warn("Invalid data:", data);
        }
      });
    }
  }, [role]);

  // MASTER → envoie état
  const share = useCallback(async (states: number[]) => {
    try {
      sendMessage(JSON.stringify(states));
    } catch (e: any) {
      setError(e.message || "Erreur envoi");
    }
  }, []);

  // STOP (disconnect)
  const stopSharing = useCallback(async () => {
    await disconnect();
  }, []);

  // SCAN (viewer)
  const scan = useCallback(async () => {
    setError(null);
    try {
      await scanDevices();
    } catch (e: any) {
      setError(e.message || "Erreur scan");
    }
  }, []);

  const stopScan = useCallback(async () => {
    // pas nécessaire en classic → no-op
  }, []);

  // CONNECT (viewer)
  const connect = useCallback(async (deviceId: string) => {
    try {
      await connectToDevice(deviceId);
    } catch (e: any) {
      setError(e.message || "Erreur connexion");
    }
  }, []);

  // UPDATE (master → viewer)
  const sendUpdate = useCallback(async (states: number[]) => {
    try {
      sendMessage(JSON.stringify(states));
    } catch {}
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
    sendUpdate,
  };
};
