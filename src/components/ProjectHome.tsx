import { useRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, Plus, Crown, Eye, Bluetooth, TriangleAlert, MessageCircleQuestion, Moon } from "lucide-react";
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
    checkAndRequestPermissions();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const data = parseProjectFile(raw);
        if (data) {
          onLoadProject(data, "master");
        } else {
          alert("Format de fichier invalide");
        }
      } catch {
        alert("Erreur lors de la lecture du fichier");
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="relative h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 safe-area-all">
      <div className="absolute left-8 top-8 z-10 flex items-center gap-2 rounded-full shadow-xl shadow-foreground/10 border border-border bg-card/90 px-2 py-2 backdrop-blur-sm">
        <Moon className="h-4 w-4 text-muted-foreground" />
        <Switch
          aria-label="Activer le mode sombre"
          checked={mounted ? isDark : false}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>

      <div className="w-full flex justify-center mb-1">
        <img
          src={isDark ? titleDark : titleLight}
          alt="Essais Continuité"
          className="w-[300px] max-w-full h-auto object-contain select-none"
          draggable={false}
        />
      </div>

      <p className="text-sm text-muted-foreground text-center mb-4 landscape:mb-2">
        Sélectionnez votre rôle
      </p>

      <div className="w-full max-w-xs landscape:max-w-lg flex flex-col landscape:flex-row landscape:items-start gap-4 landscape:gap-6">
        <div className="w-full landscape:w-1/2 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
            <Crown className="w-4 h-4 text-purple-700 dark:text-purple-300" />
            <span>Contrôleur</span>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={onCreateProject} className="w-full gap-2 rounded-full shadow-xl shadow-foreground/10 transition-all active:scale-95" size="sm">
              <Plus className="w-4 h-4" /> Nouveau projet
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="w-full shadow-xl shadow-foreground/10 rounded-full gap-2"
              size="sm"
            >
              <FolderOpen className="w-4 h-4" /> Ouvrir un projet
            </Button>
          </div>
        </div>

        <div className="w-full landscape:w-px landscape:self-stretch flex landscape:flex-col items-center gap-3">
          <div className="flex-1 border-t landscape:border-t-0 landscape:border-l border-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 border-t landscape:border-t-0 landscape:border-l border-border" />
        </div>

        <div className="w-full landscape:w-1/2 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
            <Eye className="w-4 h-4 text-green-700 dark:text-green-300" />
            <span>Observateur</span>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try { await stopScanning(); } catch {}
              onViewerScan();
            }}
            className="w-full shadow-xl shadow-foreground/10 rounded-full gap-2"
            size="sm"
          >
            <Bluetooth className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Connexion projet partagé
          </Button>
          <p className="flex items-center justify-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-semibold text-center">
            <TriangleAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
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
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-card text-blue-600 dark:text-blue-400 border border-border shadow-xl shadow-foreground/30 flex items-center justify-center hover:bg-accent transition-colors"
        aria-label="Aide"
      >
        <MessageCircleQuestion className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ProjectHome;
