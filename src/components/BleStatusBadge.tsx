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
    <Badge variant={config.variant} className="text-[9px] px-1.5 py-0.5 gap-1">
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </Badge>
  );
};

export default BleStatusBadge;
