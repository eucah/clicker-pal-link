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

export const useBluetooth = (role: "master" | "viewer") => {
  const [status, setStatus] = useState<BtConnectionStatus>(getConnectionStatus());
  const [receivedStates, setReceivedStates] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubStatus = onStatusChange(setStatus);
    return () => {
      unsubStatus?.();
    };
  }, []);

  useEffect(() => {
    if (role !== "viewer") return;

    const unsubData = onDataReceived((data: string) => {
      console.log("DATA FROM BT:", data);

      try {
        const parsed = JSON.parse(data);

        if (Array.isArray(parsed)) {
          setReceivedStates(parsed);
        } else {
          console.warn("Bluetooth payload is not an array:", parsed);
        }
      } catch {
        console.warn("Invalid data:", data);
      }
    });

    return () => {
      unsubData?.();
    };
  }, [role]);

  const share = useCallback(async (states: number[]) => {
    setError(null);

    try {
      await sendMessage(JSON.stringify(states));
    } catch (e: any) {
      setError(e?.message || "Erreur envoi Bluetooth");
      throw e;
    }
  }, []);

  const stopSharing = useCallback(async () => {
    setError(null);

    try {
      await disconnect();
    } catch (e: any) {
      setError(e?.message || "Erreur déconnexion Bluetooth");
      throw e;
    }
  }, []);

  const scan = useCallback(async () => {
    setError(null);

    try {
      await scanDevices();
    } catch (e: any) {
      setError(e?.message || "Erreur scan Bluetooth");
      throw e;
    }
  }, []);

  const stopScan = useCallback(async () => {
    setError(null);

    try {
      await disconnect();
    } catch (e: any) {
      setError(e?.message || "Erreur arrêt scan Bluetooth");
      throw e;
    }
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    setError(null);

    try {
      await connectToDevice(deviceId);
    } catch (e: any) {
      setError(e?.message || "Erreur connexion Bluetooth");
      throw e;
    }
  }, []);

  const sendUpdate = useCallback(async (states: number[]) => {
    try {
      await sendMessage(JSON.stringify(states));
    } catch (e) {
      console.warn("Bluetooth sendUpdate failed:", e);
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
    sendUpdate,
  };
};