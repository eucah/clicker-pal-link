import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bluetooth, Loader2, Radio } from "lucide-react";
import {
  type DiscoveredDevice,
  onDeviceDiscovered,
  onStatusChange,
  startScanningForDevices,
  connectToDevice,
  stopScanning,
  getConnectionStatus,
} from "@/lib/bt-service";

interface ViewerSessionListProps {
  onConnected: () => void;
  onCancel: () => void;
}

const ViewerSessionList = ({ onConnected, onCancel }: ViewerSessionListProps) => {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [status, setStatus] = useState(getConnectionStatus());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubStatus = onStatusChange(setStatus);
    const unsubDevice = onDeviceDiscovered((device) => {
      setDevices((prev) => {
        if (prev.find((d) => d.deviceId === device.deviceId)) return prev;
        return [...prev, device];
      });
    });

    startScanningForDevices().catch((e) => {
      setError(e.message || "Erreur Bluetooth");
    });

    return () => {
      unsubStatus();
      unsubDevice();
    };
  }, []);

  useEffect(() => {
    if (status === "connected" && connecting) {
      setConnecting(null);
      onConnected();
    }
  }, [status, connecting, onConnected]);

  const handleConnect = useCallback(async (device: DiscoveredDevice) => {
    setConnecting(device.deviceId);
    setError(null);
    try {
      await connectToDevice(device.deviceId);
    } catch (e: any) {
      setError(e.message || "Erreur de connexion");
      setConnecting(null);
    }
  }, []);

  const handleCancel = useCallback(async () => {
    await stopScanning();
    onCancel();
  }, [onCancel]);

  const handleRescan = useCallback(async () => {
    setDevices([]);
    setError(null);
    try {
      await stopScanning();
      await startScanningForDevices();
    } catch (e: any) {
      setError(e.message || "Erreur Bluetooth");
    }
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4 safe-area-all">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={handleCancel} className="p-1.5 rounded-md bg-secondary text-secondary-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Sessions disponibles</h1>
        </div>

        {status === "scanning" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            Recherche d'appareils Bluetooth...
          </div>
        )}

        {error && (
          <div className="px-3 py-2 mb-3 rounded-md bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-4">
          {devices.length === 0 && status !== "scanning" && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun appareil trouvé. Assurez-vous que le Master a démarré le serveur Bluetooth.
            </p>
          )}
          {devices.length === 0 && status === "scanning" && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Recherche en cours...
            </p>
          )}
          {devices.map((device) => (
            <button
              key={device.deviceId}
              onClick={() => handleConnect(device)}
              disabled={connecting !== null}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left disabled:opacity-50"
            >
              <Radio className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {device.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {device.deviceId}
                </p>
              </div>
              {connecting === device.deviceId && (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRescan} className="flex-1 gap-2" size="sm">
            <Bluetooth className="w-4 h-4" /> Relancer
          </Button>
          <Button variant="secondary" onClick={handleCancel} className="flex-1" size="sm">
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewerSessionList;
