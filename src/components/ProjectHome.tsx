import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, Crown, Eye, Bluetooth, TriangleAlert, MessageCircleQuestion } from "lucide-react";
import { ProjectData } from "@/types/project";
import { parseProjectFile } from "@/lib/file-utils";
import { checkAndRequestPermissions } from "@/lib/permissions";
import { stopScanning } from "@/lib/bt-service";

export type AppRole = "master" | "viewer";

interface ProjectHomeProps {
  onLoadProject: (project: ProjectData, role: AppRole) => void;
  onCreateProject: () => void;
  onViewerScan: () => void;
  onHelp: () => void;
}

const ProjectHome = ({ onLoadProject, onCreateProject, onViewerScan, onHelp }: ProjectHomeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

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
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4 safe-area-all">
      <h1 className="text-xl font-bold text-foreground tracking-tight mb-1">ESSAIS CONTINUITÉ</h1>
      <p className="text-sm text-muted-foreground text-center mb-4 landscape:mb-2">
        Sélectionnez votre rôle
      </p>

      <div className="w-full max-w-xs landscape:max-w-lg flex flex-col landscape:flex-row landscape:items-start gap-4 landscape:gap-6">
        {/* Master section */}
        <div className="w-full landscape:w-1/2 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-900">
            <Crown className="w-4 h-4 text-purple-700" />
            <span>Master</span>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={onCreateProject} className="w-full gap-2" size="sm">
              <Plus className="w-4 h-4" /> Nouveau projet
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full gap-2" size="sm">
              <FolderOpen className="w-4 h-4" /> Ouvrir un projet
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full landscape:w-px landscape:self-stretch flex landscape:flex-col items-center gap-3">
          <div className="flex-1 border-t landscape:border-t-0 landscape:border-l border-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 border-t landscape:border-t-0 landscape:border-l border-border" />
        </div>

        {/* Viewer section */}
        <div className="w-full landscape:w-1/2 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
            <Eye className="w-4 h-4 text-green-700" />
            <span>Viewer</span>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try { await stopScanning(); } catch {}
              onViewerScan();
            }}
            className="w-full gap-2"
            size="sm"
          >
            <Bluetooth className="w-4 h-4 text-blue-600" /> Connexion projet partagé
          </Button>
            <p className="flex items-center justify-center gap-1 text-[10px] text-red-600 font-semibold text-center">
            <TriangleAlert className="w-6 h-6 text-red-600" />
             Les deux appareils doivent être appairés avant de démarrer
          </p>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json,.txt" className="hidden" onChange={handleFileChange} />

      <button
        onClick={onHelp}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        aria-label="Aide"
      >
        <MessageCircleQuestion className="w-7 h-7" />
      </button>
    </div>
  );
};

export default ProjectHome;
