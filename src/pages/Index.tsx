import { useState, useRef } from "react";
import ButtonGrid, { ButtonInfo } from "@/components/ButtonGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock, Unlock, Save, FolderOpen, Pencil } from "lucide-react";

const BUTTON_COUNT = 150;

const createDefaultInfos = (): ButtonInfo[] =>
  Array.from({ length: BUTTON_COUNT }, () => ({ fils: "", bornier: "", locked: false }));

const Index = () => {
  const [isMaster, setIsMaster] = useState(true);
  const [states, setStates] = useState<number[]>(Array(BUTTON_COUNT).fill(0));
  const [buttonInfos, setButtonInfos] = useState<ButtonInfo[]>(createDefaultInfos());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFils, setEditFils] = useState("");
  const [editBornier, setEditBornier] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = (index: number) => {
    setStates((prev) => {
      const next = [...prev];
      next[index] = (next[index] + 1) % 4;
      return next;
    });
  };

  const handleSelect = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const handleReset = () => {
    setStates(Array(BUTTON_COUNT).fill(0));
    setButtonInfos(createDefaultInfos());
    setSelectedIndex(null);
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

  const handleSaveFile = () => {
    const data = JSON.stringify({ states, buttonInfos }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grid-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.states && data.buttonInfos) {
          setStates(data.states);
          setButtonInfos(data.buttonInfos);
          setSelectedIndex(null);
        }
      } catch {
        console.error("Invalid file format");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const selectedInfo = selectedIndex !== null ? buttonInfos[selectedIndex] : null;
  const selectedLabel = selectedIndex !== null
    ? selectedIndex < 75
      ? selectedIndex + 1
      : selectedIndex - 75 + 101
    : null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-1 border-b border-border bg-card shrink-0">
        <h1 className="text-sm font-bold text-foreground tracking-tight">Grid Controller</h1>
        <div className="flex items-center gap-1.5">
          <Badge
            variant={isMaster ? "default" : "secondary"}
            className="cursor-pointer select-none text-[10px] px-2 py-0.5"
            onClick={() => setIsMaster(!isMaster)}
          >
            {isMaster ? "Master" : "Viewer"}
          </Badge>
          {isMaster && (
            <>
              <button onClick={handleReset} className="text-[10px] px-2 py-0.5 rounded-md bg-destructive text-destructive-foreground font-medium">
                Reset
              </button>
              <button onClick={handleSaveFile} className="p-1 rounded-md bg-secondary text-secondary-foreground" title="Save to file">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleOpenFile} className="p-1 rounded-md bg-secondary text-secondary-foreground" title="Open file">
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Selected button info bar + master actions */}
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
                <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
              </Badge>
            )}
            {isMaster && (
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={handleEditOpen} className="p-1 rounded bg-primary text-primary-foreground" title="Edit info">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={handleToggleLock} className="p-1 rounded bg-secondary text-secondary-foreground" title={selectedInfo.locked ? "Unlock" : "Lock"}>
                  {selectedInfo.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </button>
              </div>
            )}
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">Tap a button to see its info</span>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-3 py-0.5 text-[9px] items-center justify-center bg-muted/30 shrink-0">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-idle inline-block" /> Idle</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-warning inline-block" /> Warning</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-active inline-block" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-alert inline-block" /> Alert</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-state-locked inline-block" /> Locked</span>
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
            <DialogTitle className="text-sm">Edit Button #{selectedLabel}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fils</label>
              <Input value={editFils} onChange={(e) => setEditFils(e.target.value)} className="h-8 text-sm" placeholder="Enter fils..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bornier</label>
              <Input value={editBornier} onChange={(e) => setEditBornier(e.target.value)} className="h-8 text-sm" placeholder="Enter bornier..." />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default Index;
