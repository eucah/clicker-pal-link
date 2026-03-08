import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, Crown, Eye } from "lucide-react";
import { ProjectData } from "@/types/project";

export type AppRole = "master" | "viewer";

interface ProjectHomeProps {
  onLoadProject: (project: ProjectData, role: AppRole) => void;
  onCreateProject: () => void;
}

const ProjectHome = ({ onLoadProject, onCreateProject }: ProjectHomeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRoleRef = useRef<AppRole>("master");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as ProjectData;
        if (data.name && data.states && data.buttonInfos) {
          onLoadProject(data, pendingRoleRef.current);
        }
      } catch {
        console.error("Invalid file format");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const openFileAs = (role: AppRole) => {
    pendingRoleRef.current = role;
    fileInputRef.current?.click();
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-xl font-bold text-foreground tracking-tight">ESSAIS DE CONTINUITÉ</h1>
      <p className="text-sm text-muted-foreground text-center">Sélectionnez votre rôle et chargez un projet</p>

      {/* Master section */}
      <div className="w-full max-w-xs space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Crown className="w-4 h-4 text-primary" />
          <span>Master</span>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={onCreateProject} className="w-full gap-2" size="sm">
            <Plus className="w-4 h-4" /> Nouveau projet
          </Button>
          <Button variant="secondary" onClick={() => openFileAs("master")} className="w-full gap-2" size="sm">
            <FolderOpen className="w-4 h-4" /> Ouvrir en Master
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full max-w-xs flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Viewer section */}
      <div className="w-full max-w-xs space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span>Viewer</span>
        </div>
        <Button variant="outline" onClick={() => openFileAs("viewer")} className="w-full gap-2" size="sm">
          <FolderOpen className="w-4 h-4" /> Ouvrir en Viewer
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          En mode Viewer, la recherche Bluetooth démarre automatiquement
        </p>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default ProjectHome;
