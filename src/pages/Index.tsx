import { useState, useEffect, useCallback, useRef } from "react";
import ButtonGrid from "@/components/ButtonGrid";
import ProjectHome, { type AppRole } from "@/components/ProjectHome";
import ProjectEditor from "@/components/ProjectEditor";
import ViewerSessionList from "@/components/ViewerSessionList";
import BleStatusBadge from "@/components/BleStatusBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bluetooth, BluetoothOff, Lock } from "lucide-react";
import { ProjectData, BUTTON_COUNT, getButtonLabel, createDefaultInfos } from "@/types/project";
import { useBluetooth } from "@/hooks/use-bluetooth";

type Screen = "home" | "editor" | "grid" | "viewer-scan";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [role, setRole] = useState<AppRole>("master");

  const [states, setStates] = useState<number[]>(Array(BUTTON_COUNT).fill(0));
  const [buttonInfos, setButtonInfos] = useState(createDefaultInfos());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const isMaster = role === "master";
  const ble = useBluetooth(role);
  const gridRef = useRef<HTMLDivElement>(null);

  // Viewer: receive states from master
  useEffect(() => {
    if (ble.receivedStates && role === "viewer") {
      setStates(ble.receivedStates);
    }
  }, [ble.receivedStates, role]);

  const sendBleUpdate = useCallback((newStates: number[]) => {
    if (isMaster && ble.status === "connected") ble.sendUpdate(newStates);
  }, [isMaster, ble.status]);

  const loadProject = (p: ProjectData, selectedRole?: AppRole) => {
    setProject(p);
    setStates(p.states);
    setButtonInfos(p.buttonInfos);
    setSelectedIndex(null);
    if (selectedRole) setRole(selectedRole);
    setScreen("grid");
  };

  const handleViewerScan = () => {
    setRole("viewer");
    setScreen("viewer-scan");
  };

  const handleViewerConnected = () => {
    // Once connected to a master session, go to grid
    setProject({ name: "Session Viewer", states: Array(BUTTON_COUNT).fill(0), buttonInfos: createDefaultInfos() });
    setStates(Array(BUTTON_COUNT).fill(0));
    setButtonInfos(createDefaultInfos());
    setSelectedIndex(null);
    setScreen("grid");
  };

  const handleToggle = (index: number) => {
    setStates((prev) => {
      const next = [...prev];
      const currentState = next[index];
      const newState = (currentState + 1) % 4;

      // "En cours" (state 1) exclusivity
      if (newState === 1) {
        for (let i = 0; i < next.length; i++) {
          if (next[i] === 1) {
            next[i] = 0;
          }
        }
      }

      next[index] = newState;
      sendBleUpdate(next);
      return next;
    });
  };

  const handleSelect = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const handleShareBle = async () => {
    if (ble.status === "disconnected") {
      const { ensureBluetoothEnabled } = await import("@/lib/bt-service");
      const enabled = await ensureBluetoothEnabled();
      if (!enabled) return;
      await ble.share(states);
    } else {
      await ble.stopSharing();
    }
  };

  const handleGoHome = () => {
    setProject(null);
    setStates(Array(BUTTON_COUNT).fill(0));
    setButtonInfos(createDefaultInfos());
    setSelectedIndex(null);
    setScreen("home");

    const stopPromise = isMaster ? ble.stopSharing() : ble.stopScan();
    void stopPromise.catch((e) => {
      console.error("Error stopping Bluetooth:", e);
    });
  };

  if (screen === "home") {
    return (
      <ProjectHome
        onLoadProject={loadProject}
        onCreateProject={() => { setRole("master"); setScreen("editor"); }}
        onViewerScan={handleViewerScan}
      />
    );
  }

  if (screen === "editor") {
    return (
      <ProjectEditor
        onSave={(p) => loadProject(p, "master")}
        onAccess={(p) => loadProject(p, "master")}
        onCancel={() => setScreen("home")}
      />
    );
  }

  if (screen === "viewer-scan") {
    return (
      <ViewerSessionList
        onConnected={handleViewerConnected}
        onCancel={() => setScreen("home")}
      />
    );
  }

  const selectedInfo = selectedIndex !== null ? buttonInfos[selectedIndex] : null;
  const selectedLabel = selectedIndex !== null ? getButtonLabel(selectedIndex) : null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="flex items-center justify-between px-2 safe-area-x py-1 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-1.5">
          <button onClick={handleGoHome} className="p-1.5 rounded-md bg-secondary text-secondary-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-foreground tracking-tight">{project?.name}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {isMaster && (
            <button
              onClick={handleShareBle}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                ble.status === "connected"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {ble.status === "disconnected" ? (
                <>
                  <Bluetooth className="w-3.5 h-3.5" />
                  Partager projet
                </>
              ) : (
                <>
                  <BluetoothOff className="w-3.5 h-3.5" />
                  Arrêter
                </>
              )}
            </button>
          )}
          <BleStatusBadge status={ble.status} />
          <Badge
            variant={isMaster ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0 select-none"
          >
            {isMaster ? "Master" : "Viewer"}
          </Badge>
        </div>
      </header>

      {/* BLE error */}
      {ble.error && (
        <div className="px-2 py-1 bg-destructive/10 text-destructive text-[10px] text-center shrink-0">
          {ble.error}
        </div>
      )}

      {/* Info bar + Legend */}
      <div className="flex items-center gap-2 px-2 safe-area-x py-1 bg-muted/50 border-b border-border shrink-0 min-h-[28px]">
        {selectedIndex !== null && selectedInfo ? (
          <>
            <span className="text-[11px] font-bold text-foreground">#{selectedLabel}</span>
            <span className="text-[11px] text-field-fils font-semibold">
              Fils: <span className="font-medium">{selectedInfo.fils || "—"}</span>
            </span>
            <span className="text-[11px] text-field-borne font-semibold">
              Borne: <span className="font-medium">{selectedInfo.borne || "—"}</span>
            </span>
            <span className="text-[11px] text-field-bornier font-semibold">
              Bornier: <span className="font-medium">{selectedInfo.bornier || "—"}</span>
            </span>
            {selectedInfo.locked && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-state-locked text-muted-foreground">
                <Lock className="w-2.5 h-2.5 mr-0.5" /> Non Testé
              </Badge>
            )}
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">Appuyez sur un bouton pour voir ses infos</span>
        )}

        <div className="hidden landscape:flex items-center gap-3 ml-auto text-[11px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-idle inline-block" /> Attente</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-warning inline-block" /> En cours</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-active inline-block" /> Validé</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-alert inline-block" /> Défaut</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-locked inline-block" /> Non Testé</span>
        </div>
      </div>

      {/* Legend - portrait only */}
      <div className="flex landscape:hidden gap-4 px-2 py-1 text-[11px] items-center justify-center bg-muted/30 shrink-0">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-idle inline-block" /> Attente</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-warning inline-block" /> En cours</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-active inline-block" /> Validé</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-alert inline-block" /> Défaut</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-locked inline-block" /> Non Testé</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-1" ref={gridRef}>
        <ButtonGrid
          isMaster={isMaster}
          states={states}
          buttonInfos={buttonInfos}
          selectedIndex={selectedIndex}
          onToggle={handleToggle}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
};

export default Index;
