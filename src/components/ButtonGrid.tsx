import { ButtonInfo } from "@/types/project";
import type { PontVisualState } from "@/lib/pont-utils";

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
  pontVisualStates: PontVisualState[];
  selectedIndex: number | null;
  onToggle: (index: number) => void;
  onSelect: (index: number) => void;
}

const ButtonGrid = ({
  isMaster,
  states,
  buttonInfos,
  pontVisualStates,
  selectedIndex,
  onToggle,
  onSelect,
}: ButtonGridProps) => {
  const getSafeState = (index: number): 0 | 1 | 2 | 3 => {
    const value = states[index];
    return Number.isInteger(value) && value >= 0 && value <= 3 ? (value as 0 | 1 | 2 | 3) : 0;
  };

  const getSafeInfo = (index: number): ButtonInfo | undefined => buttonInfos[index];

  const getSafePontState = (index: number): PontVisualState | undefined => pontVisualStates[index];

  if (import.meta.env.DEV) {
    if (states.length !== 150) {
      console.warn("[ButtonGrid] states length mismatch", { expected: 150, received: states.length });
    }
    if (buttonInfos.length !== 150) {
      console.warn("[ButtonGrid] buttonInfos length mismatch", { expected: 150, received: buttonInfos.length });
    }
    if (pontVisualStates.length !== 150) {
      console.warn("[ButtonGrid] pontVisualStates length mismatch", { expected: 150, received: pontVisualStates.length });
    }
  }

  const handleClick = (stateIndex: number) => {
    const info = getSafeInfo(stateIndex);
    if (info?.locked) return;
    if (isMaster) {
      onToggle(stateIndex);
    }
    onSelect(stateIndex);
  };

  const renderButton = (stateIndex: number, label: number) => {
    const safeState = getSafeState(stateIndex);
    const info = getSafeInfo(stateIndex);
    const pontState = getSafePontState(stateIndex);
    const isLocked = info?.locked;
    const isSelected = selectedIndex === stateIndex;
    const usesPontWaitingStyle = !isLocked && safeState === 0 && Boolean(pontState?.hasPontStyleInWaitingState);
    const stateColorClass = usesPontWaitingStyle ? "bg-state-pont-waiting" : STATE_COLORS[safeState] ?? STATE_COLORS[0];

    return (
      <button
        key={label}
        onClick={() => handleClick(stateIndex)}
        className={`aspect-square rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150 text-[10px] landscape:text-[9px] font-bold !text-black dark:!text-black ${
          isLocked
            ? "bg-state-locked cursor-not-allowed"
            : `${stateColorClass} !text-black dark:!text-black ${isMaster ? "active:scale-90 cursor-pointer" : "cursor-default"} ${safeState === 1 ? "animate-pulse-slow" : ""}`
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
    <div className="flex flex-col landscape:flex-row items-center landscape:items-stretch gap-3 landscape:gap-2 p-2 landscape:px-[env(safe-area-inset-left,8px)] landscape:pr-[env(safe-area-inset-right,8px)] w-full h-full">
      <div className="flex flex-col gap-[3px] landscape:gap-[2px] w-full landscape:w-1/2 landscape:justify-evenly">
        <div className="text-xs font-semibold text-muted-foreground text-center">GAUCHE</div>
        {renderSide(0, 1, false)}
      </div>
      <div className="w-full landscape:w-px landscape:self-stretch border-t landscape:border-t-0 landscape:border-l border-border" />
      <div className="flex flex-col gap-[3px] landscape:gap-[2px] w-full landscape:w-1/2 landscape:justify-evenly">
        <div className="text-xs font-semibold text-muted-foreground text-center">DROITE</div>
        {renderSide(75, 101, true)}
      </div>
    </div>
  );
};

export { type ButtonInfo };
export default ButtonGrid;
