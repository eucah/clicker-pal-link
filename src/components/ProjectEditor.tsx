import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Play } from "lucide-react";
import { ButtonInfo, ProjectData, BUTTON_COUNT, createDefaultInfos, getButtonLabel } from "@/types/project";
import { saveProjectFile } from "@/lib/file-utils";

interface ProjectEditorProps {
  onSave: (project: ProjectData) => void;
  onAccess: (project: ProjectData) => void;
  onCancel: () => void;
}

const ProjectEditor = ({ onSave, onAccess, onCancel }: ProjectEditorProps) => {
  const [projectName, setProjectName] = useState("");
  const [buttonInfos, setButtonInfos] = useState<ButtonInfo[]>(createDefaultInfos());

  const updateButton = useCallback((index: number, field: keyof ButtonInfo, value: string | boolean) => {
    setButtonInfos((prev) => {
      const currentValue = prev[index]?.[field];
      if (currentValue === value) {
        return prev;
      }

      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const buildProject = (): ProjectData | null => {
    if (!projectName.trim()) return null;
    const states = buttonInfos.map(() => 0);
    return { name: projectName.trim(), states, buttonInfos };
  };

  const handleSave = async () => {
    const project = buildProject();
    if (!project) return;
    const saved = await saveProjectFile(project);
    if (saved) {
      onSave(project);
    }
  };

  const handleAccess = () => {
    const project = buildProject();
    if (!project) return;
    onAccess(project);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden safe-area-all">
      <header className="flex items-center gap-2 px-4 py-1.5 landscape:py-1 border-b border-border bg-card shrink-0">
        <button onClick={onCancel} className="p-1 rounded-md bg-secondary text-secondary-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-l font-bold text-foreground">Nouveau projet</h1>
        <div className="flex ml-auto gap-2">
          <Button onClick={handleAccess} disabled={!projectName.trim()} variant="outline" className="gap-2" size="sm">
            <Play className="w-3.5 h-3.5" /> Accéder
          </Button>
          <Button onClick={handleSave} disabled={!projectName.trim()} className="gap-2" size="sm">
            <Save className="w-3.5 h-3.5" /> Enregistrer
          </Button>
        </div>
      </header>

      <div className="px-4 py-1.5 landscape:py-1 border-b border-border shrink-0">
        <label className="text-sm font-medium text-slate-800">Nom du projet</label>
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Entrer le nom du projet..."
          className="h-7 text-sm mt-1 font-mono"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-1 text-left w-10">#</th>
                <th className="py-1 text-left text-blue-600">Fils</th>
                <th className="py-1 text-left text-green-600">Borne</th>
                <th className="py-1 text-left text-red-600">Bornier</th>
                <th className="py-1 text-left text-amber-700 w-28">Cf/Cm</th>
                <th className="py-1 text-center w-16 text-primary">Non Testé</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: BUTTON_COUNT }, (_, i) => (
                <tr key={i} className="border-b border-border/80">
                  <td className="py-0.5 font-bold text-foreground">{getButtonLabel(i)}</td>
                  <td className="py-0.5 pr-1">
                    <Input
                      value={buttonInfos[i].fils}
                      onChange={(e) => updateButton(i, "fils", e.target.value)}
                      className="h-6 text-xs font-mono"
                      placeholder="Fils..."
                    />
                  </td>
                  <td className="py-0.5 pr-1">
                    <Input
                      value={buttonInfos[i].borne}
                      onChange={(e) => updateButton(i, "borne", e.target.value)}
                      className="h-6 text-xs font-mono"
                      placeholder="Borne..."
                    />
                  </td>
                  <td className="py-0.5 pr-1">
                    <Input
                      value={buttonInfos[i].bornier}
                      onChange={(e) => updateButton(i, "bornier", e.target.value)}
                      className="h-6 text-xs font-mono"
                      placeholder="Bornier..."
                    />
                  </td>
                  <td className="py-0.5 pr-1">
                    <Input
                      value={buttonInfos[i].cfCm}
                      onChange={(e) => updateButton(i, "cfCm", e.target.value)}
                      className="h-6 text-xs font-mono"
                      placeholder="Cf/Cm..."
                    />
                  </td>
                  <td className="py-0.5 text-center">
                    <Checkbox
                      checked={buttonInfos[i].locked}
                      onCheckedChange={(checked) => updateButton(i, "locked", !!checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectEditor;
