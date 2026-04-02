import { ButtonInfo } from "@/types/project";

const STATE_COLORS = [
  "bg-state-idle",
  "bg-state-warning",
  "bg-state-active",
  "bg-state-alert",
] as const;

interface ButtonGridProps {
  isMaster: boolean;
  states: number[];
  buttonInfos: ButtonInfo[];
  selectedIndex: number | null;
  onToggle: (index: number) => void;
  onSelect: (index: number) => void;
}

const ButtonGrid = ({ isMaster, states, buttonInfos, selectedIndex, onToggle, onSelect }: ButtonGridProps) => {
  const handleClick = (stateIndex: number) => {
    if (buttonInfos[stateIndex]?.locked) return;
    if (isMaster) {
      onToggle(stateIndex);
    }
    onSelect(stateIndex);
  };

  const renderButton = (stateIndex: number, label: number) => {
    const info = buttonInfos[stateIndex];
    const isLocked = info?.locked;
    const isSelected = selectedIndex === stateIndex;

    return (
      <button
        key={label}
        onClick={() => handleClick(stateIndex)}
        className={`aspect-square rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150 text-[10px] landscape:text-[9px] font-bold ${
          isLocked
            ? "bg-state-locked text-foreground/30 cursor-not-allowed"
            : `${STATE_COLORS[states[stateIndex]]} text-foreground/70 ${isMaster ? "active:scale-90 cursor-pointer" : "cursor-default"} ${states[stateIndex] === 1 ? "animate-pulse-slow" : ""}`
        } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
      >
        {label}
      </button>
    );
  };

  const renderSide = (offset: number, labelOffset: number, mirror: boolean) => {
    const rows = [];
    for (let r = 0; r < 5; r++) {
      const cols = [];
      for (let c = 0; c < 15; c++) {
        const col = mirror ? 14 - c : c;
        const idx = offset + r * 15 + col;
        const label = labelOffset + r * 15 + col;
        cols.push(renderButton(idx, label));
      }
      rows.push(
        <div key={r} className="grid grid-cols-15 gap-[3px] landscape:gap-[2px]">
          {cols}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="flex flex-col landscape:flex-row items-center landscape:items-stretch px-4 gap-3 landscape:gap-2 p-2 landscape:px-[env(safe-area-inset-left,8px)] landscape:pr-[env(safe-area-inset-right,8px)] w-full h-full">
      <div className="flex flex-col gap-[3px] landscape:gap-[2px] w-full landscape:w-1/2 landscape:justify-evenly">
        <div className="text-xs font-semibold text-muted-foreground text-center">GAUCHE</div>
        {renderSide(0, 1, false)}
      </div>
      <div className="w-full landscape:w-px landscape:self-stretch border-t landscape:border-t-0 landscape:border-l border-border" />
      <div className="flex flex-col px-4 gap-[3px] landscape:gap-[2px] w-full landscape:w-1/2 landscape:justify-evenly">
        <div className="text-xs font-semibold text-muted-foreground text-center">DROITE</div>
        {renderSide(75, 101, true)}
      </div>
    </div>
  );
};

export { type ButtonInfo };
export default ButtonGrid;
