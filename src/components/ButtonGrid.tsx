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
  // Side 1: indices 0-74 (labels 1-75), 5 rows x 15 cols
  // Side 2: indices 75-149 (labels 101-175), 5 rows x 15 cols, mirrored (reversed per row)
  const side1 = states.slice(0, 75);
  const side2 = states.slice(75, 150);

  const renderButton = (stateIndex: number, label: number) => (
    <button
      key={label}
      onClick={() => isMaster && onToggle(stateIndex)}
      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${STATE_COLORS[states[stateIndex]]} transition-colors duration-150 text-[8px] font-bold text-foreground/70 ${
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
        <div key={r} className="flex gap-1.5 justify-center">
          {cols}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-3 w-full max-w-4xl mx-auto">
      {/* Side 1: 1-75 */}
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs font-semibold text-muted-foreground text-center mb-1">Side A (1–75)</div>
        {renderSide(0, 1, false)}
      </div>

      <div className="w-full border-t border-border" />

      {/* Side 2: 101-175, mirrored */}
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs font-semibold text-muted-foreground text-center mb-1">Side B (101–175) — Mirror</div>
        {renderSide(75, 101, true)}
      </div>
    </div>
  );
};

export default ButtonGrid;
