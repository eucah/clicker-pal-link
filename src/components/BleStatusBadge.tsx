import { BtConnectionStatus as BleConnectionStatus } from "@/lib/bt-service";
import { Bluetooth, BluetoothOff, BluetoothSearching, BluetoothConnected } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BleStatusBadgeProps {
  status: BleConnectionStatus;
}

const statusConfig: Record<BleConnectionStatus, { label: string; icon: typeof Bluetooth; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  disconnected: { label: "Déconnecté", icon: BluetoothOff, variant: "outline" },
  scanning: { label: "Recherche...", icon: BluetoothSearching, variant: "secondary" },
  advertising: { label: "En attente...", icon: BluetoothSearching, variant: "secondary" },
  connected: { label: "Connecté", icon: BluetoothConnected, variant: "default" },
};

const BleStatusBadge = ({ status }: BleStatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="text-[13px] px-2 py-1 gap-1.5">
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
};

export default BleStatusBadge;
