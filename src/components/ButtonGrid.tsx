import { useState } from "react";

const STATE_COLORS = [
  "bg-state-idle",
  "bg-state-warning",
  "bg-state-active",
  "bg-state-alert",
] as const;

const BUTTON_COUNT = 150;

interface ButtonGridProps {
  isMaster: boolean;
  states: number[];
  onToggle: (index: number) => void;
}

const ButtonGrid = ({ isMaster, states, onToggle }: ButtonGridProps) => {
  return (
    <div className="grid grid-cols-10 gap-1.5 p-3 max-w-lg mx-auto">
      {states.map((state, i) => (
        <button
          key={i}
          onClick={() => isMaster && onToggle(i)}
          className={`aspect-square rounded-md ${STATE_COLORS[state]} transition-colors duration-150 text-[10px] font-bold text-foreground/70 ${
            isMaster ? "active:scale-90 cursor-pointer" : "cursor-default"
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
};

export default ButtonGrid;
