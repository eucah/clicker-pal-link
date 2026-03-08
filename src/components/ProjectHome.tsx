import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus } from "lucide-react";
import { ProjectData } from "@/types/project";

interface ProjectHomeProps {
  onLoadProject: (project: ProjectData) => void;
  onCreateProject: () => void;
}

const ProjectHome = ({ onLoadProject, onCreateProject }: ProjectHomeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as ProjectData;
        if (data.name && data.states && data.buttonInfos) {
          onLoadProject(data);
        }
      } catch {
        console.error("Invalid file format");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center gap-6">
      <h1 className="text-xl font-bold text-foreground tracking-tight">Grid Controller</h1>
      <p className="text-sm text-muted-foreground">Charger un projet ou en créer un nouveau</p>
      <div className="flex gap-3">
        <Button onClick={onCreateProject} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau projet
        </Button>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="gap-2">
          <FolderOpen className="w-4 h-4" /> Ouvrir un fichier
        </Button>
      </div>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default ProjectHome;
