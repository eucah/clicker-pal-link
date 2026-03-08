import { useState, useEffect, useCallback, useRef } from "react";
import ButtonGrid from "@/components/ButtonGrid";
import ProjectHome, { type AppRole } from "@/components/ProjectHome";
import ProjectEditor from "@/components/ProjectEditor";
import BleStatusBadge from "@/components/BleStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, ArrowLeft, Save, Bluetooth, BluetoothOff, Lock, Unlock } from "lucide-react";
import { ProjectData, BUTTON_COUNT, getButtonLabel, createDefaultInfos } from "@/types/project";
import { useBle } from "@/hooks/use-ble";
import html2canvas from "html2canvas";

type Screen = "home" | "editor" | "grid";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [role, setRole] = useState<AppRole>("master");

  const [states, setStates] = useState<number[]>(Array(BUTTON_COUNT).fill(0));
  const [buttonInfos, setButtonInfos] = useState(createDefaultInfos());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFils, setEditFils] = useState("");
  const [editBornier, setEditBornier] = useState("");

  const isMaster = role === "master";
  const ble = useBle(role);
  const gridRef = useRef<HTMLDivElement>(null);

  // Auto-scan when viewer enters grid
  useEffect(() => {
    if (screen === "grid" && role === "viewer") {
      ble.scan();
    }
    return () => {
      if (role === "viewer") {
        ble.stopScan();
      }
    };
  }, [screen, role]);

  // Receive states from master via BLE
  useEffect(() => {
    if (ble.receivedStates && role === "viewer") {
      setStates(ble.receivedStates);
    }
  }, [ble.receivedStates, role]);

  // Send state updates via BLE when master changes states
  const sendBleUpdate = useCallback((newStates: number[]) => {
    if (isMaster && ble.status === "connected") {
      ble.sendUpdate(newStates);
    }
  }, [isMaster, ble.status]);

  const loadProject = (p: ProjectData, selectedRole?: AppRole) => {
    setProject(p);
    setStates(p.states);
    setButtonInfos(p.buttonInfos);
    setSelectedIndex(null);
    if (selectedRole) setRole(selectedRole);
    setScreen("grid");
  };

  const handleToggle = (index: number) => {
    setStates((prev) => {
      const next = [...prev];
      next[index] = (next[index] + 1) % 4;
      sendBleUpdate(next);
      return next;
    });
  };

  const handleSelect = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const handleEditOpen = () => {
    if (selectedIndex === null) return;
    const info = buttonInfos[selectedIndex];
    setEditFils(info.fils);
    setEditBornier(info.bornier);
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (selectedIndex === null) return;
    setButtonInfos((prev) => {
      const next = [...prev];
      next[selectedIndex] = { ...next[selectedIndex], fils: editFils, bornier: editBornier };
      return next;
    });
    setEditDialogOpen(false);
  };

  const handleToggleLock = () => {
    if (selectedIndex === null) return;
    setButtonInfos((prev) => {
      const next = [...prev];
      next[selectedIndex] = { ...next[selectedIndex], locked: !next[selectedIndex].locked };
      return next;
    });
  };

  const handleSaveScreenshot = async () => {
    if (!gridRef.current || !project) return;
    const canvas = await html2canvas(gridRef.current, { backgroundColor: null });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.download = `${project.name}.jpeg`;
    link.click();
  };

  const handleShareBle = async () => {
    if (ble.status === "disconnected" || ble.status === "advertising") {
      if (ble.status === "disconnected") {
        await ble.share(states);
      } else {
        await ble.stopSharing();
      }
    } else if (ble.status === "connected") {
      await ble.stopSharing();
    }
  };

  const handleGoHome = async () => {
    if (isMaster) {
      await ble.stopSharing();
    } else {
      await ble.stopScan();
    }
    setScreen("home");
  };

  if (screen === "home") {
    return (
      <ProjectHome
        onLoadProject={loadProject}
        onCreateProject={() => { setRole("master"); setScreen("editor"); }}
      />
    );
  }

  if (screen === "editor") {
    return (
      <ProjectEditor
        onSave={(p) => loadProject(p, "master")}
        onCancel={() => setScreen("home")}
      />
    );
  }

  const selectedInfo = selectedIndex !== null ? buttonInfos[selectedIndex] : null;
  const selectedLabel = selectedIndex !== null ? getButtonLabel(selectedIndex) : null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-1 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={handleGoHome} className="p-1 rounded-md bg-secondary text-secondary-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <h1 className="text-sm font-bold text-foreground tracking-tight">{project?.name}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {/* BLE Share button (Master) or status (Viewer) */}
          {isMaster ? (
            <button
              onClick={handleShareBle}
              className={`p-1 rounded-md transition-colors ${
                ble.status === "connected"
                  ? "bg-primary text-primary-foreground"
                  : ble.status === "advertising"
                  ? "bg-secondary text-secondary-foreground animate-pulse"
                  : "bg-secondary text-secondary-foreground"
              }`}
              title={ble.status === "disconnected" ? "Partager via Bluetooth" : "Arrêter le partage"}
            >
              {ble.status === "disconnected" ? (
                <Bluetooth className="w-3.5 h-3.5" />
              ) : (
                <BluetoothOff className="w-3.5 h-3.5" />
              )}
            </button>
          ) : null}

          <BleStatusBadge status={ble.status} />

          <Badge
            variant={isMaster ? "default" : "secondary"}
            className="text-[10px] px-2 py-0.5 select-none"
          >
            {isMaster ? "Master" : "Viewer"}
          </Badge>

          {isMaster && (
            <button onClick={handleSaveScreenshot} className="p-1 rounded-md bg-secondary text-secondary-foreground" title="Capture d'écran">
              <Save className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* BLE error banner */}
      {ble.error && (
        <div className="px-3 py-1 bg-destructive/10 text-destructive text-[10px] text-center shrink-0">
          {ble.error}
        </div>
      )}

      {/* Selected button info bar */}
      <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 border-b border-border shrink-0 min-h-[28px]">
        {selectedIndex !== null && selectedInfo ? (
          <>
            <span className="text-[10px] font-bold text-foreground">#{selectedLabel}</span>
            <span className="text-[10px] text-muted-foreground">
              Fils: <span className="text-foreground font-medium">{selectedInfo.fils || "—"}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              Bornier: <span className="text-foreground font-medium">{selectedInfo.bornier || "—"}</span>
            </span>
            {selectedInfo.locked && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-state-locked text-muted-foreground">
                <Lock className="w-2.5 h-2.5 mr-0.5" /> Non Testé
              </Badge>
            )}
            {isMaster && (
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={handleEditOpen} className="p-1 rounded bg-primary text-primary-foreground" title="Modifier">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={handleToggleLock} className="p-1 rounded bg-secondary text-secondary-foreground" title={selectedInfo.locked ? "Débloquer" : "Non Testé"}>
                  {selectedInfo.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </button>
              </div>
            )}
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">Appuyez sur un bouton pour voir ses infos</span>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-3 py-0.5 text-[9px] items-center justify-center bg-muted/30 shrink-0">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-idle inline-block" /> En attente</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-warning inline-block" /> En cours</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-active inline-block" /> Validé</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-alert inline-block" /> Défaut</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-locked inline-block" /> Non Testé</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-1">
        <ButtonGrid
          isMaster={isMaster}
          states={states}
          buttonInfos={buttonInfos}
          selectedIndex={selectedIndex}
          onToggle={handleToggle}
          onSelect={handleSelect}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Modifier Bouton #{selectedLabel}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fils</label>
              <Input value={editFils} onChange={(e) => setEditFils(e.target.value)} className="h-8 text-sm" placeholder="Entrer fils..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bornier</label>
              <Input value={editBornier} onChange={(e) => setEditBornier(e.target.value)} className="h-8 text-sm" placeholder="Entrer bornier..." />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleEditSave}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
