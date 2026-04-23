import { describe, expect, it } from "vitest";
import {
  ASSOCIATED_PONT_CONTACT_BORDER_CLASS,
  buildPontIndexSet,
  resolveAssociatedPontContactIndex,
} from "@/lib/pont-utils";
import { createDefaultInfos } from "@/types/project";

describe("buildPontIndexSet", () => {
  it("détecte un pont depuis le champ bornier uniquement", () => {
    const infos = createDefaultInfos();
    infos[0].bornier = "Pont A";

    const indexes = buildPontIndexSet(infos);

    expect(indexes.has(0)).toBe(true);
    expect(indexes.size).toBe(1);
  });

  it("ignore le mot pont présent dans fils", () => {
    const infos = createDefaultInfos();
    infos[0].fils = "pont";
    infos[0].borne = "2";

    const indexes = buildPontIndexSet(infos);

    expect(indexes.size).toBe(0);
  });

  it("reste basé uniquement sur le bornier pour détecter les ponts", () => {
    const infos = createDefaultInfos();
    infos[0].bornier = "PONT";
    infos[0].borne = "101";

    const indexes = buildPontIndexSet(infos);

    expect(indexes.has(0)).toBe(true);
    expect(indexes.has(89)).toBe(false);
  });
});

describe("resolveAssociatedPontContactIndex", () => {
  it("ne retourne jamais un contact associé si la cible est Non Testé", () => {
    const infos = createDefaultInfos();
    infos[10].bornier = "Pont";
    infos[10].borne = "2";
    infos[1].locked = true;

    const associated = resolveAssociatedPontContactIndex(infos, 10);

    expect(associated).toBeNull();
  });
});

describe("ASSOCIATED_PONT_CONTACT_BORDER_CLASS", () => {
  it("utilise une couleur bleu turquoise", () => {
    expect(ASSOCIATED_PONT_CONTACT_BORDER_CLASS).toContain("border-[#22C7C7]");
  });
});
