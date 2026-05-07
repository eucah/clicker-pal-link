import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import ButtonGrid from "@/components/ButtonGrid";
import ProjectHome, { type AppRole } from "@/components/ProjectHome";
import ProjectEditor from "@/components/ProjectEditor";
import ViewerSessionList from "@/components/ViewerSessionList";
import BleStatusBadge from "@/components/BleStatusBadge";
import HelpPage from "@/components/HelpPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Bluetooth, BluetoothOff, Crown, Eye, FileChartColumn, List, Lock, Moon, Pause, Sun } from "lucide-react";
import {
  ProjectData,
  BUTTON_COUNT,
  getButtonLabel,
  createDefaultInfos,
  normalizeButtonInfo,
} from "@/types/project";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { saveReportFile } from "@/lib/file-utils";
import { normalizeTwinaxProjectData } from "@/lib/file-utils";
import { isTwinaxWire, TWINAX_STATE } from "@/lib/twinax-utils";
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
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);
  const [editorProject, setEditorProject] = useState<ProjectData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

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
    if (ble.receivedData?.paused !== undefined) {
      setIsPaused(ble.receivedData.paused);
    }
    if (ble.receivedData && role === "viewer" && ble.receivedData.states.length > 0) {
      const normalized = normalizeTwinaxProjectData({
        name: project?.name ?? "Session Observateur",
        states: ble.receivedData.states,
        buttonInfos: ble.receivedData.buttonInfos,
      });
      setStates(normalized.states);
      if (normalized.buttonInfos.length > 0) {
        setButtonInfos(normalized.buttonInfos.map((info) => normalizeButtonInfo(info)));
      }
    }
  }, [ble.receivedData, role, project?.name]);

  const sendBleUpdate = useCallback(
    (newStates: number[]) => {
      if (isMaster && ble.status !== "disconnected") {
        void ble.sendUpdate(newStates, buttonInfos);
      }
    },
    [isMaster, ble, buttonInfos],
  );

  const loadProject = (loadedProject: ProjectData, selectedRole?: AppRole) => {
    const normalized = normalizeTwinaxProjectData(loadedProject);
    setProject(normalized);
    setStates(normalized.states);
    setButtonInfos(normalized.buttonInfos.map((info) => normalizeButtonInfo(info)));
    setSelectedIndex(null);
    setIsPaused(false);

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
      if (selectedIndex !== index) {
        // Premier appui = sélection uniquement
        return previousStates;
      }

      // Changement d'état autorisé uniquement sur un bouton déjà sélectionné
      if (isTwinaxWire(buttonInfos[index]?.fils) || previousStates[index] === TWINAX_STATE) {
        return previousStates;
      }
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
    setSelectedIndex(index);
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
  const leaveGridAndGoHome = useCallback(async () => {
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

  const shouldConfirmGridBack = screen === "grid";

  const requestGoHome = useCallback(() => {
    if (shouldConfirmGridBack) {
      setIsBackConfirmOpen(true);
      return;
    }

    void leaveGridAndGoHome();
  }, [leaveGridAndGoHome, shouldConfirmGridBack]);

  useEffect(() => {
    if (screen === "home") {
      return;
    }

    window.history.pushState({ clickerPalScreen: screen }, "");
    const onPopState = () => {
      if (shouldConfirmGridBack) {
        // Keep an internal history entry so Android back can re-open confirmation.
        window.history.pushState({ clickerPalScreen: screen }, "");
        setIsBackConfirmOpen(true);
        return;
      }

      void leaveGridAndGoHome();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [screen, shouldConfirmGridBack, leaveGridAndGoHome]);

  useEffect(() => {
    return () => {
      void hardStopSession("index unmount cleanup");
    };
  }, [hardStopSession]);

  if (screen === "home") {
    return (
      <ProjectHome
        onLoadProject={loadProject}
        onEditProject={(loadedProject) => {
          setRole("master");
          setEditorProject(loadedProject);
          setScreen("editor");
        }}
        onCreateProject={() => {
          setRole("master");
          setEditorProject(null);
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
        initialProject={editorProject}
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

    const enteredName = window.prompt("Nom du rapport (.csv ajouté si nécessaire)", `${project.name}-rapport`);
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
      trimmed.endsWith(".csv") ? trimmed : `${trimmed}.csv`,
    );

    if (!success) {
      alert("Export du rapport annulé.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden safe-area-top safe-area-bottom">
      <header className="flex items-center justify-between px-4 safe-area-x py-1 landscape:py-0.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center px-2 landscape:px-1.5 gap-1.5 landscape:gap-1 min-w-0 flex-1">
          <button
            onClick={requestGoHome}
            className="p-1.5 landscape:p-1 px-2 landscape:px-1.5 rounded-md bg-secondary text-secondary-foreground shadow-xl shadow-gray-900/30 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 landscape:w-3.5 landscape:h-3.5" />
          </button>
          <h1 className="text-sm landscape:text-xs font-bold text-foreground tracking-tight truncate">
            {project?.name}
          </h1>
        </div>

        <div className="flex items-center px-4 landscape:px-2 gap-1.5 landscape:gap-1 shrink-0">
          {isMaster && (
            <button
              onClick={handleShareBle}
              className={`flex items-center gap-1 landscape:gap-0.5 px-2 landscape:px-1.5 py-1 landscape:py-0.5 shadow-xl shadow-gray-900/30 active:scale-95 rounded-md text-sm landscape:text-xs font-semibold transition-colors ${
                isSharingActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {isSharingActive ? (
                <>
                  <BluetoothOff className="w-4 h-4 landscape:w-3.5 landscape:h-3.5" text-sm />
                  Arrêter
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4 landscape:w-3.5 landscape:h-3.5 text-blue-700" />
                  Partager
                </>
              )}
            </button>
          )}

          <BleStatusBadge status={ble.status} />

       {isMaster ? (
        <Crown className="w-4 h-4 landscape:w-3.5 landscape:h-3.5 text-purple-700 dark:text-purple-300" />
        ) : (
        <Eye className="w-4 h-4 landscape:w-3.5 landscape:h-3.5 text-green-700 dark:text-green-300" />
        )}
        </div>
      </header>

      {ble.error && (
        <div className="px-2 py-1 bg-destructive/10 text-destructive text-[0.625rem] text-center shrink-0">
          {ble.error}
        </div>
      )}

      <div className="android-landscape-nav-safe-end flex items-center gap-2 landscape:gap-1.5 pr-3 landscape:pr-2 px-2 safe-area-x py-1 landscape:py-0.5 bg-muted/50 border-b border-border bg-card shrink-0 h-10 landscape:h-8 [@media(orientation:portrait)_and_(max-width:430px)]:h-auto [@media(orientation:portrait)_and_(max-width:430px)]:items-start [@media(orientation:portrait)_and_(max-width:430px)]:py-1.5">
        <div className="min-w-0 flex-1">
          {selectedIndex !== null && selectedInfo ? (
            <div className="flex items-start gap-x-2 landscape:gap-x-1.5">
              <span className="shrink-0 px-4 landscape:px-2 text-[0.6875rem] landscape:text-[0.625rem] font-bold text-foreground">#{selectedLabel}</span>
              <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 landscape:gap-x-1.5">
                <span className="text-[0.6875rem] landscape:text-[0.625rem] text-field-fils font-semibold">
                  Fils: <span className="font-medium">{selectedInfo.fils || "—"}</span>
                </span>
                <span className="text-[0.6875rem] landscape:text-[0.625rem] text-field-borne font-semibold">
                  Borne: <span className="font-medium">{selectedInfo.borne || "—"}</span>
                </span>
                <span className="text-[0.6875rem] landscape:text-[0.625rem] text-field-bornier font-semibold">
                  Bornier: <span className="font-medium">{selectedInfo.bornier || "—"}</span>
                </span>
                <span className="text-[0.6875rem] landscape:text-[0.625rem] text-amber-700 font-semibold">
                  Cf/Cm: <span className="font-medium">{selectedInfo.cfCm || "—"}</span>
                </span>
                {selectedInfo.locked && (
                  <Badge
                    variant="outline"
                    className="text-[0.5625rem] landscape:text-[0.5rem] px-1 py-0 border-state-locked text-muted-foreground"
                  >
                    <Lock className="w-2.5 h-2.5 landscape:w-2 landscape:h-2 mr-0.5" />
                    Non Testé
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <span className="block px-4 landscape:px-2 text-sm landscape:text-xs text-muted-foreground [@media(orientation:portrait)_and_(max-width:430px)]:leading-tight">
              Appuyez sur un bouton pour voir ses infos
            </span>
          )}
        </div>

        {/* En portrait étroit, empiler les actions pour éviter de masquer les infos */}
        <div className="flex items-center px-4 landscape:px-2 gap-1.5 landscape:gap-1 ml-auto shrink-0 [@media(orientation:portrait)_and_(max-width:430px)]:flex-col [@media(orientation:portrait)_and_(max-width:430px)]:items-end">
          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
            className="h-6 landscape:h-5 px-2 landscape:px-1.5 text-[0.6875rem] landscape:text-[0.625rem] gap-1 landscape:gap-0.5 shadow-xl shadow-gray-900/30 active:scale-95"
          >
            <FileChartColumn className="w-3 h-3 landscape:w-2.5 landscape:h-2.5" />
            Rapport
          </Button>
          <Button
            onClick={() => setIsLegendOpen(true)}
            variant="outline"
            size="sm"
            className="h-6 landscape:h-5 px-2 landscape:px-1.5 text-[0.6875rem] landscape:text-[0.625rem] gap-1 landscape:gap-0.5 shadow-xl shadow-gray-900/20 active:scale-95"
          >
            <List className="w-3 h-3 landscape:w-2.5 landscape:h-2.5" />
            Légende
          </Button>
        </div>
      </div>

      <div className="flex-1 px-2 sm:px-3 landscape:px-2 py-1 landscape:py-0.5 overflow-auto" ref={gridRef}>
        <ButtonGrid
          isMaster={isMaster}
          isDark={isDark}
          states={states}
          buttonInfos={buttonInfos}
          selectedIndex={selectedIndex}
          onToggle={handleToggle}
          onSelect={handleSelect}
        />
      </div>

      <div className="fixed left-6 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-50">
        <div className="flex items-center gap-2 rounded-full shadow-xl shadow-gray-900/30 border border-border bg-card/90 px-3 py-2 landscape:px-2.5 landscape:py-1.5 backdrop-blur-sm">
          {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          <Switch
            aria-label="Activer le mode sombre"
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </div>

      <button
        onClick={() => {
          const nextPaused = !isPaused;
          setIsPaused(nextPaused);
          void ble.sendRawMessage(JSON.stringify({ type: "pause-state", paused: nextPaused }));
        }}
        className={`fixed right-6 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-50 w-14 h-14 rounded-full shadow-xl shadow-gray-900/30 flex items-center justify-center active:scale-95 ${isPaused ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-green-600 hover:bg-green-700"}`}
        aria-label={isPaused ? "Désactiver pause" : "Activer pause"}
      >
        <Pause className="w-6 h-6 text-white" />
      </button>

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
              <span className="w-3 h-3 rounded-sm bg-state-twinax inline-block" />
              <strong>Twinax</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-state-locked inline-block" />
              <strong>Non testé</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-foreground inline-block" />
              <strong>Sélectionné</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-blue-600 inline-block" />
              <strong>Pont</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-purple-500 inline-block" />
              <strong>Pont contact associé</strong>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isBackConfirmOpen} onOpenChange={setIsBackConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{isMaster ? "Quitter la grille ?" : "Quitter la grille partagée ?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isMaster
                ? "Attention : revenir à l'accueil arrêtera la session en cours. Voulez-vous continuer ?"
                : "Voulez-vous vraiment quitter la grille partagée ?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsBackConfirmOpen(false);
                void leaveGridAndGoHome();
              }}
            >
              {isMaster ? "Confirmer" : "Quitter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
