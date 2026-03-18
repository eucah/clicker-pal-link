import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bluetooth, ArrowLeft, RefreshCw } from "lucide-react";
import {
  onDeviceDiscovered,
  onStatusChange,
  startScanningForDevices,
  connectToDevice,
  stopScanning,
  getConnectionStatus,
  ensureBluetoothEnabled,
  type DiscoveredDevice,
  type BtConnectionStatus,
} from "@/lib/bt-service";

interface ViewerSessionListProps {
  onConnected: () => void;
  onCancel: () => void;
}

const ViewerSessionList = ({ onConnected, onCancel }: ViewerSessionListProps) => {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [status, setStatus] = useState<BtConnectionStatus>(getConnectionStatus());
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubStatus = onStatusChange((newStatus) => {
      setStatus(newStatus);

      if (newStatus === "connected") {
        onConnected();
      }
    });

    const unsubDevice = onDeviceDiscovered((device) => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.deviceId === device.deviceId);
        return exists ? prev : [...prev, device];
      });
    });

    return () => {
      unsubStatus?.();
      unsubDevice?.();
    };
  }, [onConnected]);

  const handleScan = async () => {
    setError(null);
    setDevices([]);

    try {
      const enabled = await ensureBluetoothEnabled();
      if (!enabled) {
        setError("Bluetooth non activé");
        return;
      }

      await startScanningForDevices();
    } catch (e: any) {
      console.error("SCAN UI ERROR:", e);
      setError(e?.message || "Erreur lors de la recherche");
    }
  };

  const handleConnect = async (deviceId: string) => {
    setError(null);
    setConnectingId(deviceId);

    try {
      await connectToDevice(deviceId);
    } catch (e: any) {
      console.error("CONNECT UI ERROR:", e);
      setError(e?.message || "Impossible de se connecter");
    } finally {
      setConnectingId(null);
    }
  };

  const handleCancel = async () => {
    try {
      await stopScanning();
    } catch {}
    onCancel();
  };

  return (
    <div className="h-screen bg-background flex flex-col px-4 py-4 safe-area-all">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleCancel}
          className="p-2 rounded-md bg-secondary text-secondary-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-sm font-bold text-foreground">Recherche Bluetooth</h1>

        <Button variant="secondary" size="sm" onClick={handleScan} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Scanner
        </Button>
      </div>

      <div className="mb-3 text-xs text-muted-foreground text-center">
        Appaire d’abord les deux téléphones dans les paramètres Bluetooth Android
      </div>

      {status === "scanning" && (
        <div className="mb-3 text-xs text-center text-primary animate-pulse">
          Recherche des appareils…
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {devices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <Bluetooth className="w-10 h-10 opacity-50" />
            <p className="text-sm">Aucun appareil trouvé</p>
            <p className="text-xs">
              Lance un scan puis choisis un appareil déjà appairé
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => handleConnect(device.deviceId)}
                disabled={connectingId === device.deviceId}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-accent transition-colors disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {device.name || "Appareil inconnu"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {device.deviceId}
                    </div>
                  </div>

                  <div className="text-xs font-medium text-primary">
                    {connectingId === device.deviceId ? "Connexion…" : "Connecter"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4">
        <Button onClick={handleScan} className="w-full gap-2">
          <Bluetooth className="w-4 h-4" />
          Rechercher les appareils appairés
        </Button>
      </div>
    </div>
  );
};

export default ViewerSessionList;
