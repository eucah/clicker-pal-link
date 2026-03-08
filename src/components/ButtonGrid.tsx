const STATE_COLORS = [
  "bg-state-idle",
  "bg-state-warning",
  "bg-state-active",
  "bg-state-alert",
] as const;

interface ButtonGridProps {
  isMaster: boolean;
  states: number[];
  onToggle: (index: number) => void;
}

const ButtonGrid = ({ isMaster, states, onToggle }: ButtonGridProps) => {
  const renderButton = (stateIndex: number, label: number) => (
    <button
      key={label}
      onClick={() => isMaster && onToggle(stateIndex)}
      className={`aspect-square rounded-full flex items-center justify-center flex-shrink-0 ${STATE_COLORS[states[stateIndex]]} transition-colors duration-150 text-[7px] font-bold text-foreground/70 ${
        isMaster ? "active:scale-90 cursor-pointer" : "cursor-default"
      }`}
    >
      {label}
    </button>
  );

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
        <div key={r} className="grid grid-cols-15 gap-[2px]">
          {cols}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="flex flex-col landscape:flex-row items-center landscape:items-start gap-2 p-1 w-full h-full">
      {/* Side 1: 1-75 */}
      <div className="flex flex-col gap-[2px] w-full landscape:w-1/2">
        <div className="text-[10px] font-semibold text-muted-foreground text-center">Side A (1–75)</div>
        {renderSide(0, 1, false)}
      </div>

      <div className="w-full landscape:w-px landscape:h-full border-t landscape:border-t-0 landscape:border-l border-border" />

      {/* Side 2: 101-175, mirrored */}
      <div className="flex flex-col gap-[2px] w-full landscape:w-1/2">
        <div className="text-[10px] font-semibold text-muted-foreground text-center">Side B (101–175) — Mirror</div>
        {renderSide(75, 101, true)}
      </div>
    </div>
  );
};

export default ButtonGrid;
