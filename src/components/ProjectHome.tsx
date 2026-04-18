import Image from "@/lib/next-image-compat";
import { useRef, useEffect, useState, type ChangeEvent } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, Plus, Crown, Eye, Bluetooth, TriangleAlert, MessageCircleQuestion, Moon, Sun } from "lucide-react";
import { ProjectData } from "@/types/project";
import { parseProjectFile } from "@/lib/file-utils";
import { checkAndRequestPermissions } from "@/lib/permissions";
import { stopScanning } from "@/lib/bt-service";
import titleLight from "../../assets/title-continuity-light.png";
import titleDark from "../../assets/title-continuity-dark.png";

export type AppRole = "master" | "viewer";

interface ProjectHomeProps {
  onLoadProject: (project: ProjectData, role: AppRole) => void;
  onCreateProject: () => void;
  onViewerScan: () => void;
  onHelp: () => void;
}

const ProjectHome = ({ onLoadProject, onCreateProject, onViewerScan, onHelp }: ProjectHomeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        await checkAndRequestPermissions();
      } catch (error) {
        console.error("Erreur lors de la demande de permissions", error);
      }
    };

    void requestPermissions();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  const handleOpenFilePicker = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      e.target.value = "";
      return;
    }

    const lowerName = file.name.toLowerCase();
    const allowedMimeTypes = ["application/json", "text/plain"];
    const hasSupportedMimeType = file.type ? allowedMimeTypes.includes(file.type) : false;
    const hasSupportedExtension = lowerName.endsWith(".json") || lowerName.endsWith(".txt");

    if (!hasSupportedMimeType && !hasSupportedExtension) {
      alert("Type de fichier non supporté");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== "string") {
        alert("Erreur lors de la lecture du fichier");
        e.target.value = "";
        return;
      }

      try {
        const data = parseProjectFile(result);
        if (data) {
          onLoadProject(data, "master");
        } else {
          alert("Format de fichier invalide");
        }
      } catch {
        alert("Format de fichier invalide");
      } finally {
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("Erreur lors de la lecture du fichier");
      e.target.value = "";
    };

    reader.readAsText(file);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-6 md:py-8 safe-area-all">
      <div className="absolute left-4 top-4 md:left-8 md:top-10 mt-6 flex items-center gap-2 rounded-full shadow-xl shadow-gray-900/30 border border-border bg-card/90 px-3 py-2 backdrop-blur-sm">
        {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
        <Switch
          aria-label="Activer le mode sombre"
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>

      <div className="w-full flex justify-center mb-1">
        <Image
          src={isDark ? titleDark : titleLight}
          alt="Essais Continuité"
          width={300}
          height={75}
          className="w-[min(18.75rem,82vw)] sm:w-[18.75rem] max-w-full h-auto object-contain select-none"
          draggable={false}
          priority
        />
      </div>

      <p className="text-sm text-muted-foreground text-center mb-4 landscape:mb-2">
        Sélectionnez votre rôle
      </p>

      <div className="w-full max-w-xs landscape:max-w-lg md:max-w-2xl flex flex-col landscape:flex-row landscape:items-start gap-4 landscape:gap-6 md:gap-8">
        <div className="w-full landscape:w-1/2 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
            <Crown className="w-5 h-5 text-purple-700 dark:text-purple-300" />
            <span>Contrôleur</span>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={onCreateProject} className="w-full gap-2 rounded-full shadow-xl shadow-gray-900/30 transition-all active:scale-95" size="lg">
              <Plus className="w-8 h-8" /> Nouveau projet
            </Button>
            <Button
              variant="secondary"
              onClick={handleOpenFilePicker}
              className="w-full shadow-xl shadow-gray-900/30 rounded-full gap-2 active:scale-95"
              size="lg"
            >
              <FolderOpen className="w-8 h-8" /> Ouvrir un projet
            </Button>
          </div>
        </div>

        <div className="w-full landscape:w-px landscape:self-stretch flex landscape:flex-col items-center gap-3">
          <div className="flex-1 border-t landscape:border-t-0 landscape:border-l border-border" />
          <span className="text-sm text-muted-foreground">ou</span>
          <div className="flex-1 border-t landscape:border-t-0 landscape:border-l border-border" />
        </div>

        <div className="w-full landscape:w-1/2 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
            <Eye className="w-5 h-5 text-green-700 dark:text-green-300" />
            <span>Observateur</span>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await stopScanning();
              } catch (error) {
                console.warn("stopScanning a échoué", error);
              }
              onViewerScan();
            }}
            className="w-full shadow-xl shadow-gray-900/30 rounded-full gap-2 active:scale-95"
            size="lg"
          >
            <Bluetooth className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Connexion projet partagé
          </Button>
          <p className="flex items-center justify-center gap-1 text-sm md:text-sm text-red-600 dark:text-red-400 font-semibold text-center">
            <TriangleAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
            Les deux appareils doivent être appairés avant de démarrer
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={onHelp}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-card text-blue-600 dark:text-blue-400 border border-border shadow-xl shadow-gray-900/30 flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
        aria-label="Aide"
      >
        <MessageCircleQuestion className="w-6 h-6" />
      </button>
    </div>
  );
};

export default ProjectHome;
