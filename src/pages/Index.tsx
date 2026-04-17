import { useState, useEffect, useCallback, useRef } from "react";
import ButtonGrid from "@/components/ButtonGrid";
import ProjectHome, { type AppRole } from "@/components/ProjectHome";
import ProjectEditor from "@/components/ProjectEditor";
import ViewerSessionList from "@/components/ViewerSessionList";
import BleStatusBadge from "@/components/BleStatusBadge";
import HelpPage from "@/components/HelpPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Bluetooth, BluetoothOff, Crown, Eye, FileChartColumn, List, Lock } from "lucide-react";
import {
  ProjectData,
  BUTTON_COUNT,
  getButtonLabel,
  createDefaultInfos,
  normalizeButtonInfo,
} from "@/types/project";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { saveReportFile } from "@/lib/file-utils";
import { useSessionKeepAwake } from "@/hooks/use-session-keep-awake";

type Screen = "home" | "editor" | "grid" | "viewer-scan" | "help";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [role, setRole] = useState<AppRole>("master");
  const [states, setStates] = useState<number[]>(Array(BUTTON_COUNT).fill(0));
  const [buttonInfos, setButtonInfos] = useState(createDefaultInfos());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  const isMaster = role === "master";
  const ble = useBluetooth(role);
  const { hardStopSession } = ble;
  const gridRef = useRef<HTMLDivElement>(null);
  const isSharingActive = ble.status === "advertising" || ble.status === "connected";

  const controllerOnGrid = isMaster && screen === "grid";
  const masterSharingWithViewerConnected = isMaster && Boolean(project) && ble.status === "connected";
  const viewerConnectedToProject = !isMaster && screen === "grid" && Boolean(project) && ble.status === "connected";

  useSessionKeepAwake({
    controllerOnGrid,
    masterSharingWithViewerConnected,
    viewerConnectedToProject,
  });

  // Issue #1 & #2: Viewer now receives BOTH states AND buttonInfos from master
  useEffect(() => {
    if (ble.receivedData && role === "viewer") {
      setStates(ble.receivedData.states);
      if (ble.receivedData.buttonInfos.length > 0) {
        setButtonInfos(ble.receivedData.buttonInfos.map((info) => normalizeButtonInfo(info)));
      }
    }
  }, [ble.receivedData, role]);

  const sendBleUpdate = useCallback(
    (newStates: number[]) => {
      if (isMaster && ble.status !== "disconnected") {
        void ble.sendUpdate(newStates, buttonInfos);
      }
    },
    [isMaster, ble, buttonInfos],
  );

  const loadProject = (loadedProject: ProjectData, selectedRole?: AppRole) => {
    setProject(loadedProject);
    setStates(loadedProject.states);
    setButtonInfos(loadedProject.buttonInfos.map((info) => normalizeButtonInfo(info)));
    setSelectedIndex(null);

    if (selectedRole) {
      setRole(selectedRole);
    }

    setScreen("grid");
  };

  const handleViewerScan = () => {
    setRole("viewer");
    setScreen("viewer-scan");
  };

  const handleViewerConnected = () => {
    setProject({
      name: "Session Observateur",
      states: Array(BUTTON_COUNT).fill(0),
      buttonInfos: createDefaultInfos(),
    });
    setStates(Array(BUTTON_COUNT).fill(0));
    setButtonInfos(createDefaultInfos());
    setSelectedIndex(null);
    setScreen("grid");
  };

  const handleToggle = (index: number) => {
    setStates((previousStates) => {
      const nextStates = [...previousStates];
      const newState = (nextStates[index] + 1) % 4;

      if (newState === 1) {
        for (let stateIndex = 0; stateIndex < nextStates.length; stateIndex += 1) {
          if (nextStates[stateIndex] === 1) {
            nextStates[stateIndex] = 0;
          }
        }
      }

      nextStates[index] = newState;
      sendBleUpdate(nextStates);
      return nextStates;
    });
  };

  const handleSelect = (index: number) => {
    setSelectedIndex((previousIndex) => (previousIndex === index ? null : index));
  };

  // Issue #5: Stop button must fully stop BT
  const handleShareBle = async () => {
    try {
      if (isSharingActive) {
        console.log("MASTER CLICK OK - Arrêter");
        await ble.stopSharing();
        return;
      }

      console.log("MASTER CLICK OK - Partager projet");
      await ble.share(states, buttonInfos);
    } catch (error) {
      console.error("Bluetooth action failed:", error);
    }
  };

  // Issue #3 & #4: Both master and viewer fully disconnect BT on exit
  const handleGoHome = useCallback(async () => {
    try {
      await hardStopSession(isMaster ? "master go home" : "viewer go home");
    } catch (error) {
      console.error("Error stopping Bluetooth on exit:", error);
    }

    setProject(null);
    setStates(Array(BUTTON_COUNT).fill(0));
    setButtonInfos(createDefaultInfos());
    setSelectedIndex(null);
    setScreen("home");
  }, [hardStopSession, isMaster]);

  useEffect(() => {
    if (screen === "home") {
      return;
    }

    window.history.pushState({ clickerPalScreen: screen }, "");
    const onPopState = () => {
      void handleGoHome();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [screen, handleGoHome]);

  useEffect(() => {
    return () => {
      void hardStopSession("index unmount cleanup");
    };
  }, [hardStopSession]);

  if (screen === "home") {
    return (
      <ProjectHome
        onLoadProject={loadProject}
        onCreateProject={() => {
          setRole("master");
          setScreen("editor");
        }}
        onViewerScan={handleViewerScan}
        onHelp={() => setScreen("help")}
      />
    );
  }

  if (screen === "editor") {
    return (
      <ProjectEditor
        onSave={(savedProject) => loadProject(savedProject, "master")}
        onAccess={(savedProject) => loadProject(savedProject, "master")}
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

  if (screen === "help") {
    return <HelpPage onBack={() => setScreen("home")} />;
  }

  const selectedInfo = selectedIndex !== null ? buttonInfos[selectedIndex] : null;
  const selectedLabel = selectedIndex !== null ? getButtonLabel(selectedIndex) : null;
  const handleExportReport = async () => {
    if (!project) {
      return;
    }

    const enteredName = window.prompt("Nom du rapport (.txt ajouté si nécessaire)", `${project.name}-rapport`);
    if (enteredName === null) {
      return;
    }

    const trimmed = enteredName.trim();
    if (!trimmed) {
      alert("Veuillez saisir un nom de fichier.");
      return;
    }

    const success = await saveReportFile(
      { name: project.name, states, buttonInfos },
      trimmed.endsWith(".txt") ? trimmed : `${trimmed}.txt`,
    );

    if (!success) {
      alert("Export du rapport annulé.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden safe-area-top safe-area-bottom">
      <header className="flex items-center justify-between px-4 safe-area-x py-1 border-b border-border bg-card shrink-0">
        <div className="flex items-center px-2 gap-1.5 min-w-0 flex-1">
          <button
            onClick={handleGoHome}
            className="p-1.5 px-2 rounded-md bg-secondary text-secondary-foreground shadow-xl shadow-gray-900/30 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-foreground tracking-tight truncate">
            {project?.name}
          </h1>
        </div>

        <div className="flex items-center px-4 gap-1.5 shrink-0">
          {isMaster && (
            <button
              onClick={handleShareBle}
              className={`flex items-center gap-1 px-2 py-1 shadow-xl shadow-gray-900/30 active:scale-95 rounded-md text-[11px] font-semibold transition-colors ${
                isSharingActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {isSharingActive ? (
                <>
                  <BluetoothOff className="w-5 h-5" text-sm />
                  Arrêter
                </>
              ) : (
                <>
                  <Bluetooth className="w-5 h-5 text-sm text-blue-700" />
                  Partager
                </>
              )}
            </button>
          )}

          <BleStatusBadge status={ble.status} />

       {isMaster ? (
        <Crown className="w-4 h-4 text-purple-700 dark:text-purple-300" />
        ) : (
        <Eye className="w-4 h-4 text-green-700 dark:text-green-300" />
        )}
        </div>
      </header>

      {ble.error && (
        <div className="px-2 py-1 bg-destructive/10 text-destructive text-[10px] text-center shrink-0">
          {ble.error}
        </div>
      )}

      <div className="flex items-center gap-2 px-2 safe-area-x justify-between py-1 bg-muted/50 border-b border-border bg-card shrink-0 min-h-[28px]">
        {selectedIndex !== null && selectedInfo ? (
          <>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 min-w-0 flex-1">
              <span className="px-4 text-[11px] font-bold text-foreground">#{selectedLabel}</span>
              <span className="text-[11px] text-field-fils font-semibold">
                Fils: <span className="font-medium">{selectedInfo.fils || "—"}</span>
              </span>
              <span className="text-[11px] text-field-borne font-semibold">
                Borne: <span className="font-medium">{selectedInfo.borne || "—"}</span>
              </span>
              <span className="text-[11px] text-field-bornier font-semibold">
                Bornier: <span className="font-medium">{selectedInfo.bornier || "—"}</span>
              </span>
              <span className="text-[11px] text-amber-700 font-semibold">
                Cf/Cm: <span className="font-medium">{selectedInfo.cfCm || "—"}</span>
              </span>
              {selectedInfo.locked && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 border-state-locked text-muted-foreground"
                >
                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                  Non Testé
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <Button
                onClick={handleExportReport}
                variant="outline"
                size="sm"
                className="h-6 px-1 text-sm gap-1"
              >
                <FileChartColumn className="w-4 h-4" />
                Rapport
              </Button>
              <Button
                onClick={() => setIsLegendOpen(true)}
                variant="outline"
                size="sm"
                className="h-6 px-1 text-sm gap-1"
              >
                <List className="w-4 h-4" />
                Légende
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="px-4 text-sm text-muted-foreground mr-1 min-w-0 flex-1">
              Appuyez sur un bouton pour voir ses infos
            </span>
            <div className="flex items-center px-4 gap-1.5 ml-auto shrink-0">
              <Button
                onClick={handleExportReport}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1 shadow-xl shadow-gray-900/30 active:scale-95"
              >
                <FileChartColumn className="w-3 h-3" />
                Rapport
              </Button>
              <Button
                onClick={() => setIsLegendOpen(true)}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1 shadow-xl shadow-gray-900/20 active:scale-95"
              >
                <List className="w-3 h-3" />
                Légende
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 px-2 sm:px-3 py-1 overflow-auto" ref={gridRef}>
        <ButtonGrid
          isMaster={isMaster}
          states={states}
          buttonInfos={buttonInfos}
          selectedIndex={selectedIndex}
          onToggle={handleToggle}
          onSelect={handleSelect}
        />
      </div>

      <Dialog open={isLegendOpen} onOpenChange={setIsLegendOpen}>
        <DialogContent
          overlayClassName="bg-black/20 backdrop-blur-sm"
          className="max-w-sm bg-background/90 backdrop-blur-md"
        >
          <DialogHeader>
            <DialogTitle>Légende</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-idle inline-block" />
              <strong>Attente</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-warning inline-block" />
              <strong>En cours</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-active inline-block" />
              <strong>Validé</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-alert inline-block" />
              <strong>Défaut</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-locked inline-block" />
              <strong>Non testé</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-blue-600 inline-block" />
              <strong>Pont</strong>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
