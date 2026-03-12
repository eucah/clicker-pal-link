import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save } from "lucide-react";
import { ButtonInfo, ProjectData, BUTTON_COUNT, createDefaultInfos, getButtonLabel } from "@/types/project";

interface ProjectEditorProps {
  onSave: (project: ProjectData) => void;
  onCancel: () => void;
}

const ProjectEditor = ({ onSave, onCancel }: ProjectEditorProps) => {
  const [projectName, setProjectName] = useState("");
  const [buttonInfos, setButtonInfos] = useState<ButtonInfo[]>(createDefaultInfos());

  const updateButton = (index: number, field: keyof ButtonInfo, value: string | boolean) => {
    setButtonInfos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = () => {
    if (!projectName.trim()) return;
    const states = buttonInfos.map(() => 0);
    const project: ProjectData = { name: projectName.trim(), states, buttonInfos };

    // Save as .txt file with JSON content
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.trim()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    onSave(project);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden safe-area-all">
      <header className="flex items-center gap-2 px-3 py-1.5 landscape:py-1 border-b border-border bg-card shrink-0">
        <button onClick={onCancel} className="p-1 rounded-md bg-secondary text-secondary-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-bold text-foreground">Nouveau projet</h1>
        <div className="hidden landscape:flex ml-auto">
          <Button onClick={handleSave} disabled={!projectName.trim()} className="gap-2" size="sm">
            <Save className="w-3.5 h-3.5" /> Enregistrer
          </Button>
        </div>
      </header>

      <div className="px-3 py-1.5 landscape:py-1 border-b border-border shrink-0">
        <label className="text-xs font-medium text-muted-foreground">Nom du projet</label>
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Entrer le nom du projet..."
          className="h-7 text-sm mt-1"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-1 text-left w-12">#</th>
                <th className="py-1 text-left">Fils</th>
                <th className="py-1 text-left">Bornier</th>
                <th className="py-1 text-center w-20">Non Testé</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: BUTTON_COUNT }, (_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-0.5 font-bold text-foreground">{getButtonLabel(i)}</td>
                  <td className="py-0.5 pr-1">
                    <Input
                      value={buttonInfos[i].fils}
                      onChange={(e) => updateButton(i, "fils", e.target.value)}
                      className="h-6 text-xs"
                      placeholder="Fils..."
                    />
                  </td>
                  <td className="py-0.5 pr-1">
                    <Input
                      value={buttonInfos[i].bornier}
                      onChange={(e) => updateButton(i, "bornier", e.target.value)}
                      className="h-6 text-xs"
                      placeholder="Bornier..."
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

      <div className="px-3 py-2 border-t border-border shrink-0 landscape:hidden">
        <Button onClick={handleSave} disabled={!projectName.trim()} className="w-full gap-2" size="sm">
          <Save className="w-3.5 h-3.5" /> Enregistrer le projet
        </Button>
      </div>
    </div>
  );
};

export default ProjectEditor;
