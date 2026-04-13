import { describe, expect, it } from "vitest";
import { createDefaultInfos } from "@/types/project";
import { resolvePontVisualStates } from "@/lib/pont-utils";

const baseInfos = () => createDefaultInfos();

describe("resolvePontVisualStates", () => {
  it("detects one valid pont source and one linked target", () => {
    const infos = baseInfos();
    infos[0].fils = "Pont vers autre";
    infos[0].borne = "101";

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result[75].isPontLinked).toBe(true);
    expect(result[0].hasPontStyleInWaitingState).toBe(true);
    expect(result[75].hasPontStyleInWaitingState).toBe(true);
  });

  it("ignores empty borne", () => {
    const infos = baseInfos();
    infos[0].fils = "pont";
    infos[0].borne = "   ";

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result.some((item) => item.isPontLinked)).toBe(false);
  });

  it("ignores ambiguous borne with multiple numbers", () => {
    const infos = baseInfos();
    infos[0].fils = "pont";
    infos[0].borne = "1-101";

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result.some((item) => item.isPontLinked)).toBe(false);
  });

  it("ignores self reference", () => {
    const infos = baseInfos();
    infos[0].fils = "pont";
    infos[0].borne = "1";

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(true);
    expect(result[0].isPontLinked).toBe(false);
  });

  it("does not mark pont style when fils has no pont keyword", () => {
    const infos = baseInfos();
    infos[0].fils = "phase";
    infos[0].borne = "101";

    const result = resolvePontVisualStates(infos);
    expect(result[0].isPontSource).toBe(false);
    expect(result[75].isPontLinked).toBe(false);
    expect(result[0].hasPontStyleInWaitingState).toBe(false);
  });
});
