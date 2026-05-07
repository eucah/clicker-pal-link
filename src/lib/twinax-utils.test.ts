import { describe, expect, it } from "vitest";
import { isTwinaxWire } from "@/lib/twinax-utils";

describe("isTwinaxWire", () => {
  it("detects # at beginning after left trim", () => {
    expect(isTwinaxWire("#ABC")).toBe(true);
    expect(isTwinaxWire(" #ABC")).toBe(true);
  });

  it("returns false when # is not at start", () => {
    expect(isTwinaxWire("ABC#")).toBe(false);
    expect(isTwinaxWire("-")).toBe(false);
  });
});
