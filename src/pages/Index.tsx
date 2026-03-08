import { useState } from "react";
import ButtonGrid from "@/components/ButtonGrid";
import { Badge } from "@/components/ui/badge";

const BUTTON_COUNT = 150;

const Index = () => {
  const [isMaster, setIsMaster] = useState(true);
  const [states, setStates] = useState<number[]>(Array(BUTTON_COUNT).fill(0));

  const handleToggle = (index: number) => {
    setStates((prev) => {
      const next = [...prev];
      next[index] = (next[index] + 1) % 4;
      return next;
    });
  };

  const handleReset = () => setStates(Array(BUTTON_COUNT).fill(0));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold text-foreground tracking-tight">Grid Controller</h1>
        <div className="flex items-center gap-2">
          <Badge
            variant={isMaster ? "default" : "secondary"}
            className="cursor-pointer select-none"
            onClick={() => setIsMaster(!isMaster)}
          >
            {isMaster ? "Master" : "Viewer"}
          </Badge>
          {isMaster && (
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1 rounded-md bg-destructive text-destructive-foreground font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 text-xs items-center justify-center bg-muted/50">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-state-idle inline-block" /> Idle</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-state-warning inline-block" /> Warning</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-state-active inline-block" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-state-alert inline-block" /> Alert</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto py-2">
        <ButtonGrid isMaster={isMaster} states={states} onToggle={handleToggle} />
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-2 border-t border-border">
        {isMaster ? "Tap a button to cycle states" : "View only — waiting for master"}
      </footer>
    </div>
  );
};

export default Index;
