import { describe, expect, it } from "vitest";
import { buildTwinaxPairColorMap, containsTwinKeyword, getTwinaxColorForRow, isTwinaxRow, TWINAX_PAIR_COLOR_CLASSES } from "@/lib/twinax-utils";

describe("twinax-utils", () => {
  it("containsTwinKeyword cases", () => {
    expect(containsTwinKeyword("Twin")).toBe(true);
    expect(containsTwinKeyword("TWIN")).toBe(true);
    expect(containsTwinKeyword("twinax")).toBe(true);
    expect(containsTwinKeyword("CF/CM-03-Twin")).toBe(true);
    expect(containsTwinKeyword("05 Twin B-0")).toBe(true);
    expect(containsTwinKeyword("ABCtwinXYZ")).toBe(true);
    expect(containsTwinKeyword("05 Pin 1")).toBe(false);
    expect(containsTwinKeyword("-")).toBe(false);
    expect(containsTwinKeyword(null)).toBe(false);
  });

  it("isTwinaxRow checks all 4 fields", () => {
    expect(isTwinaxRow({ fils: "LA118DX", bornier: "CF/CM-03-Twin", cfCm: "05 Pin 1", borne: "1" })).toBe(true);
    expect(isTwinaxRow({ fils: "LA118DX", bornier: "02", cfCm: "05 Twin B-0", borne: "1" })).toBe(true);
    expect(isTwinaxRow({ fils: "ABCtwinXYZ", bornier: "02", cfCm: "05 Pin 1", borne: "1" })).toBe(true);
    expect(isTwinaxRow({ fils: "N44DE/M44DE", bornier: "02", cfCm: "05 Pin 1", borne: "6" })).toBe(false);
  });

  it("assigns pair colors in row order and cycles", () => {
    const rows: any[] = [
      { fils: "LA118DX", bornier: "Twin" },
      { fils: "LA118DX", bornier: "Twin" },
      { fils: "LA118DY", bornier: "Twin" },
      { fils: "LA118DV", bornier: "Twin" },
      { fils: "LA118DW", bornier: "Twin" },
      { fils: "LA118FX", bornier: "Twin" },
    ];
    const map = buildTwinaxPairColorMap(rows);
    expect(getTwinaxColorForRow(rows[0], 0, map)).toBe(TWINAX_PAIR_COLOR_CLASSES[0]);
    expect(getTwinaxColorForRow(rows[1], 1, map)).toBe(TWINAX_PAIR_COLOR_CLASSES[0]);
    expect(getTwinaxColorForRow(rows[2], 2, map)).toBe(TWINAX_PAIR_COLOR_CLASSES[1]);
    expect(getTwinaxColorForRow(rows[3], 3, map)).toBe(TWINAX_PAIR_COLOR_CLASSES[2]);
    expect(getTwinaxColorForRow(rows[4], 4, map)).toBe(TWINAX_PAIR_COLOR_CLASSES[3]);
    expect(getTwinaxColorForRow(rows[5], 5, map)).toBe(TWINAX_PAIR_COLOR_CLASSES[0]);
  });
});
