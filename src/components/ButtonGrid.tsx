import { useMemo } from "react";
import { buildPontIndexSet } from "@/lib/pont-utils";
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
  const pontIndexes = useMemo(() => buildPontIndexSet(buttonInfos), [buttonInfos]);

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
    const isPont = pontIndexes.has(stateIndex);

    return (
      <button
        key={label}
        onClick={() => handleClick(stateIndex)}
        className={`aspect-square rounded-full flex items-center shadow-xl shadow-gray-900/30 justify-center flex-shrink-0 transition-colors duration-150 text-[0.625rem] sm:text-[0.6875rem] landscape:text-[0.5625rem] landscape:scale-[0.94] font-bold !text-black dark:!text-black ${
          isLocked
            ? "bg-state-locked cursor-not-allowed"
            : `${STATE_COLORS[states[stateIndex]]} !text-black dark:!text-black ${isMaster ? "active:scale-90 cursor-pointer" : "cursor-default"} ${states[stateIndex] === 1 ? "animate-pulse-slow" : ""}`
        } ${isPont ? "border-2 border-blue-600" : "border border-transparent"} ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
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
        <div
          key={r}
          className={`grid grid-cols-15 gap-[0.1875rem] landscape:gap-[0.125rem] ${r > 0 ? "mt-[0.1875rem] landscape:mt-[0.125rem]" : ""}`}
        >
          {cols}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="flex flex-col landscape:flex-row items-center landscape:items-stretch gap-3 landscape:gap-1.5 p-2 landscape:py-1 landscape:px-[env(safe-area-inset-left,8px)] landscape:pr-[env(safe-area-inset-right,8px)] w-full h-full max-w-[75rem] mx-auto">
      <div className="flex flex-col gap-[0.1875rem] landscape:gap-[0.125rem] w-full landscape:w-1/2 landscape:justify-evenly">
        <div className="text-xs sm:text-sm landscape:text-[0.6875rem] font-semibold text-muted-foreground text-center leading-tight">GAUCHE</div>
        {renderSide(0, 1, false)}
      </div>
      <div className="w-full landscape:w-px landscape:self-stretch border-t landscape:border-t-0 landscape:border-l border-border" />
      <div className="flex flex-col gap-[0.1875rem] landscape:gap-[0.125rem] w-full landscape:w-1/2 landscape:justify-evenly">
        <div className="text-xs sm:text-sm landscape:text-[0.6875rem] font-semibold text-muted-foreground text-center leading-tight">DROITE</div>
        {renderSide(75, 101, true)}
      </div>
    </div>
  );
};

export { type ButtonInfo };
export default ButtonGrid;
