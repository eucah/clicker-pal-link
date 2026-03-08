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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card shrink-0">
        <h1 className="text-sm font-bold text-foreground tracking-tight">Grid Controller</h1>
        <div className="flex items-center gap-2">
          <Badge
            variant={isMaster ? "default" : "secondary"}
            className="cursor-pointer select-none text-[10px] px-2 py-0.5"
            onClick={() => setIsMaster(!isMaster)}
          >
            {isMaster ? "Master" : "Viewer"}
          </Badge>
          {isMaster && (
            <button
              onClick={handleReset}
              className="text-[10px] px-2 py-0.5 rounded-md bg-destructive text-destructive-foreground font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* Legend */}
      <div className="flex gap-3 px-3 py-1 text-[10px] items-center justify-center bg-muted/50 shrink-0">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-idle inline-block" /> Idle</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-warning inline-block" /> Warning</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-active inline-block" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-state-alert inline-block" /> Alert</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-1">
        <ButtonGrid isMaster={isMaster} states={states} onToggle={handleToggle} />
      </div>
    </div>
  );
};

export default Index;
