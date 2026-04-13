import { describe, expect, it } from "vitest";
import {
  BUTTON_COUNT,
  createDefaultInfos,
  normalizeProjectData,
  normalizeButtonInfo,
  normalizeStates,
} from "@/types/project";

describe("normalizeStates", () => {
  it("returns a 150-length array of zeros for empty input", () => {
    const result = normalizeStates([]);
    expect(result).toHaveLength(BUTTON_COUNT);
    expect(result.every((value) => value === 0)).toBe(true);
  });

  it("pads short arrays with zeros", () => {
    const result = normalizeStates([1, 2, 3]);
    expect(result).toHaveLength(BUTTON_COUNT);
    expect(result.slice(0, 3)).toEqual([1, 2, 3]);
    expect(result.slice(3).every((value) => value === 0)).toBe(true);
  });

  it("truncates long arrays", () => {
    const result = normalizeStates(Array.from({ length: BUTTON_COUNT + 5 }, () => 2));
    expect(result).toHaveLength(BUTTON_COUNT);
    expect(result.every((value) => value === 2)).toBe(true);
  });

  it("converts invalid values to zero", () => {
    const result = normalizeStates([0, -1, 1.4, 1.6, 4, Number.NaN, "2", null]);
    expect(result.slice(0, 8)).toEqual([0, 0, 1, 2, 0, 0, 0, 0]);
  });

  it("keeps valid values from 0 to 3", () => {
    const result = normalizeStates([0, 1, 2, 3]);
    expect(result.slice(0, 4)).toEqual([0, 1, 2, 3]);
  });
});

describe("normalizeProjectData", () => {
  it("creates a complete valid project from incomplete input", () => {
    const result = normalizeProjectData({ states: [1] });
    expect(result.name).toBe("Projet sans nom");
    expect(result.states).toHaveLength(BUTTON_COUNT);
    expect(result.buttonInfos).toHaveLength(BUTTON_COUNT);
    expect(result.states[0]).toBe(1);
  });

  it("pads incomplete buttonInfos", () => {
    const result = normalizeProjectData({
      name: "Demo",
      states: [],
      buttonInfos: [{ fils: "A", borne: "1", bornier: "B", cfCm: "C", locked: true }],
    });
    expect(result.buttonInfos).toHaveLength(BUTTON_COUNT);
    expect(result.buttonInfos[0]).toMatchObject({ fils: "A", locked: true });
    expect(result.buttonInfos[1]).toEqual(createDefaultInfos()[0]);
  });

  it("uses fallback for empty name", () => {
    const result = normalizeProjectData({ name: "   ", states: [], buttonInfos: [] });
    expect(result.name).toBe("Projet sans nom");
  });

  it("never throws on invalid input", () => {
    expect(() => normalizeProjectData(undefined)).not.toThrow();
    expect(() => normalizeProjectData(null)).not.toThrow();
    expect(() =>
      normalizeProjectData({
        // @ts-expect-error intentional invalid shape for runtime normalization test
        states: "invalid",
        // @ts-expect-error intentional invalid shape for runtime normalization test
        buttonInfos: "invalid",
      }),
    ).not.toThrow();
  });
});

describe("normalizeButtonInfo", () => {
  it("returns defaults for non-object values", () => {
    expect(normalizeButtonInfo("invalid")).toEqual(createDefaultInfos()[0]);
    expect(normalizeButtonInfo(null)).toEqual(createDefaultInfos()[0]);
  });
});
