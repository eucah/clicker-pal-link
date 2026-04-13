import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ButtonGrid from "@/components/ButtonGrid";
import { createDefaultInfos } from "@/types/project";
import type { PontVisualState } from "@/lib/pont-utils";

const createPontDefaults = (): PontVisualState[] =>
  Array.from({ length: 150 }, () => ({
    isPontSource: false,
    isPontLinked: false,
    hasPontStyleInWaitingState: false,
  }));

describe("ButtonGrid defensive rendering", () => {
  it("renders without crashing with incomplete arrays", () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <ButtonGrid
        isMaster
        states={[99, -1]}
        buttonInfos={[]}
        pontVisualStates={[]}
        selectedIndex={null}
        onToggle={onToggle}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(onToggle).toHaveBeenCalledWith(0);
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("does not toggle locked button when info exists", () => {
    const infos = createDefaultInfos();
    infos[0].locked = true;
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    render(
      <ButtonGrid
        isMaster
        states={[0]}
        buttonInfos={infos}
        pontVisualStates={createPontDefaults()}
        selectedIndex={null}
        onToggle={onToggle}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
