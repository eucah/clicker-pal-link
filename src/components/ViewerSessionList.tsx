import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bluetooth, Loader2, Radio, RefreshCw, Search } from "lucide-react";
import {
  type DiscoveredDevice,
  onDeviceDiscovered,
  onStatusChange,
  startScanningForDevices,
  connectToDevice,
  stopScanning,
  getConnectionStatus,
  ensureBluetoothEnabled,
} from "@/lib/bt-service";

interface ViewerSessionListProps {
  onConnected: () => void;
  onCancel: () => void;
}

const ViewerSessionList = ({ onConnected, onCancel }: ViewerSessionListProps) => {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [status, setStatus] = useState(getConnectionStatus());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubStatus = onStatusChange(setStatus);
    const unsubDevice = onDeviceDiscovered((device) => {
      setDevices((prev) => {
        if (prev.find((d) => d.deviceId === device.deviceId)) return prev;
        return [...prev, device];
      });
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

  const handleScan = useCallback(async () => {
    setError(null);
    setScanning(true);
    setDevices([]);
    try {
      const enabled = await ensureBluetoothEnabled();
      if (!enabled) {
        setScanning(false);
        return;
      }
      await startScanningForDevices();
    } catch (e: any) {
      setError(e.message || "Erreur Bluetooth");
    } finally {
      setScanning(false);
    }
  }, []);

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

  const handleCancel = useCallback(() => {
    onCancel();
    void stopScanning().catch((e) => console.error("Stop scan error:", e));
  }, [onCancel]);

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4 safe-area-all">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={handleCancel} className="p-1.5 rounded-md bg-secondary text-secondary-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Recherche Master</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Recherchez un appareil Master partageant un projet via Bluetooth Classic (SPP).
          Les appareils doivent être appairés au préalable.
        </p>

        {/* Scan button */}
        <Button onClick={handleScan} disabled={scanning || connecting !== null} className="w-full gap-2 mb-4" size="sm">
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Rechercher des appareils
            </>
          )}
        </Button>

        {error && (
          <div className="px-3 py-2 mb-3 rounded-md bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-4 min-h-[120px]">
          {devices.length === 0 && !scanning && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Appuyez sur "Rechercher" pour trouver les appareils disponibles.
            </p>
          )}
          {devices.length === 0 && scanning && (
            <div className="flex flex-col items-center py-6 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Recherche en cours...</p>
            </div>
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
          <Button variant="outline" onClick={handleScan} disabled={scanning} className="flex-1 gap-2" size="sm">
            <RefreshCw className="w-4 h-4" /> Relancer
          </Button>
          <Button variant="secondary" onClick={handleCancel} className="flex-1" size="sm">
            Retour
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewerSessionList;
