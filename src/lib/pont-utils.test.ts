import { describe, expect, it } from "vitest";
import { buildPontIndexSet } from "@/lib/pont-utils";
import { createDefaultInfos } from "@/types/project";

describe("buildPontIndexSet", () => {
  it("détecte un pont depuis le champ bornier uniquement", () => {
    const infos = createDefaultInfos();
    infos[0].bornier = "Pont A";
    infos[0].borne = "2";

    const indexes = buildPontIndexSet(infos);

    expect(indexes.has(0)).toBe(true);
    expect(indexes.has(1)).toBe(true);
  });

  it("ignore le mot pont présent dans fils", () => {
    const infos = createDefaultInfos();
    infos[0].fils = "pont";
    infos[0].borne = "2";

    const indexes = buildPontIndexSet(infos);

    expect(indexes.size).toBe(0);
  });

  it("détecte correctement la borne miroir côté droit", () => {
    const infos = createDefaultInfos();
    infos[0].bornier = "PONT";
    infos[0].borne = "101";

    const indexes = buildPontIndexSet(infos);

    expect(indexes.has(0)).toBe(true);
    expect(indexes.has(89)).toBe(true);
  });
});
