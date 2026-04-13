import { describe, expect, it } from "vitest";
import { BUTTON_COUNT, createDefaultInfos } from "@/types/project";
import { resolvePontVisualStates } from "@/lib/pont-utils";

describe("resolvePontVisualStates", () => {
  it("detects one valid pont source and target", () => {
    const infos = createDefaultInfos();
    infos[0] = { ...infos[0], fils: "pont", borne: "101" };

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result[75].isPontLinked).toBe(true);
    expect(result[0].hasPontStyleInWaitingState).toBe(true);
    expect(result[75].hasPontStyleInWaitingState).toBe(true);
  });

  it("ignores empty borne for links", () => {
    const infos = createDefaultInfos();
    infos[0] = { ...infos[0], fils: "pont", borne: "" };

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result.some((state) => state.isPontLinked)).toBe(false);
  });

  it("ignores ambiguous borne with multiple numbers", () => {
    const infos = createDefaultInfos();
    infos[0] = { ...infos[0], fils: "pont", borne: "101 / 102" };

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result.some((state) => state.isPontLinked)).toBe(false);
  });

  it("ignores self-reference links", () => {
    const infos = createDefaultInfos();
    infos[0] = { ...infos[0], fils: "pont", borne: "1" };

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result[0].isPontLinked).toBe(false);
  });

  it("applies no pont styles without pont keyword", () => {
    const infos = createDefaultInfos();
    infos[0] = { ...infos[0], fils: "cable", borne: "101" };

    const result = resolvePontVisualStates(infos);
    expect(result.some((state) => state.hasPontStyleInWaitingState)).toBe(false);
  });

  it("returns a full-length safe array even with sparse/corrupted infos", () => {
    const infos = Array.from({ length: 3 }, (_, index) =>
      index === 0 ? { fils: "pont", borne: "101", bornier: "", cfCm: "", locked: false } : undefined,
    );

    const result = resolvePontVisualStates(infos as never);
    expect(result).toHaveLength(BUTTON_COUNT);
    expect(result[0].isPontSource).toBe(true);
    expect(result[75].isPontLinked).toBe(true);
  });
});
