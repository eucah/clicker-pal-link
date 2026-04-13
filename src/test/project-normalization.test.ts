import { describe, expect, it } from "vitest";
import {
  BUTTON_COUNT,
  createDefaultInfos,
  normalizeProjectData,
  normalizeStates,
} from "@/types/project";

describe("normalizeStates", () => {
  it("returns 150 zeros for empty input", () => {
    const result = normalizeStates([]);
    expect(result).toHaveLength(BUTTON_COUNT);
    expect(result.every((value) => value === 0)).toBe(true);
  });

  it("pads short arrays and truncates long arrays", () => {
    const short = normalizeStates([1, 2]);
    expect(short).toHaveLength(BUTTON_COUNT);
    expect(short[0]).toBe(1);
    expect(short[1]).toBe(2);
    expect(short[2]).toBe(0);

    const long = normalizeStates(Array.from({ length: BUTTON_COUNT + 12 }, (_, i) => (i % 4)));
    expect(long).toHaveLength(BUTTON_COUNT);
    expect(long[BUTTON_COUNT - 1]).toBe((BUTTON_COUNT - 1) % 4);
  });

  it("converts invalid values to safe integers", () => {
    const result = normalizeStates([-1, "foo", 2.6, 0.4, 8, 3]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(3);
    expect(result[3]).toBe(0);
    expect(result[4]).toBe(3);
    expect(result[5]).toBe(3);
  });

  it("preserves valid values 0..3", () => {
    const result = normalizeStates([0, 1, 2, 3]);
    expect(result.slice(0, 4)).toEqual([0, 1, 2, 3]);
  });
});

describe("normalizeProjectData", () => {
  it("builds a complete valid structure from partial data", () => {
    const project = normalizeProjectData({ states: [1], buttonInfos: [{ fils: "A" }] });
    expect(project.name).toBe("Projet sans nom");
    expect(project.states).toHaveLength(BUTTON_COUNT);
    expect(project.buttonInfos).toHaveLength(BUTTON_COUNT);
    expect(project.buttonInfos[0].fils).toBe("A");
    expect(project.buttonInfos[1]).toEqual(createDefaultInfos()[0]);
  });

  it("falls back name when empty", () => {
    const project = normalizeProjectData({ name: "   ", states: [2] });
    expect(project.name).toBe("Projet sans nom");
  });

  it("never throws", () => {
    expect(() => normalizeProjectData(undefined)).not.toThrow();
    expect(() => normalizeProjectData(null)).not.toThrow();
    expect(() => normalizeProjectData({ buttonInfos: null as unknown as [] })).not.toThrow();
  });
});
