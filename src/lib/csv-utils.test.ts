import { describe, expect, it } from "vitest";
import { buildContinuityCsv, parseContinuityCsv } from "@/lib/csv-utils";
import { BUTTON_COUNT } from "@/types/project";

const makeStates = () => Array.from({ length: BUTTON_COUNT }, (_, i) => i % 4);
const makeInfos = () =>
  Array.from({ length: BUTTON_COUNT }, (_, i) => ({
    fils: i === 0 ? 'N44DE;"M44DE"' : i === 1 ? "01 Pin19/20" : "",
    borne: i === 0 ? "6" : i === 1 ? "01" : "",
    bornier: i === 0 ? "02" : i === 1 ? "05 Pin 1" : "",
    cfCm: i === 0 ? "CF/CM-03-Twin" : "",
    locked: i % 2 === 0,
  }));

describe("csv-utils continuity format", () => {
  it("builds metadata-first csv with BOM and header without Projet/Date columns", () => {
    const csv = buildContinuityCsv({
      projectName: "Duplex Ertms",
      date: "07/05/2026 07:23:41",
      states: makeStates(),
      buttonInfos: makeInfos(),
    });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Projet;Duplex Ertms\r\nDate;07/05/2026 07:23:41\r\n\r\nN°;Fils;Borne;Bornier;Cf/Cm;État;Non Testé\r\n");
    expect(csv).not.toContain("Projet;Date;N°;Fils;Borne;Bornier;Cf/Cm;État;Non Testé");
  });

  it("parses the new format and keeps textual values", () => {
    const csv = buildContinuityCsv({
      projectName: "Duplex Ertms",
      date: "07/05/2026 07:23:41",
      states: makeStates(),
      buttonInfos: makeInfos(),
    });

    const parsed = parseContinuityCsv(csv);
    expect(parsed.name).toBe("Duplex Ertms");
    expect(parsed.buttonInfos[0].fils).toBe('N44DE;"M44DE"');
    expect(parsed.buttonInfos[1].fils).toBe("01 Pin19/20");
    expect(parsed.buttonInfos[0].cfCm).toBe("CF/CM-03-Twin");
    expect(parsed.buttonInfos[0].bornier).toBe("02");
    expect(parsed.buttonInfos[1].borne).toBe("01");
  });

  it("forces Twinax state on import and export when twin appears in any tracked field", () => {
    const states = makeStates();
    states[0] = 0;
    const infos = makeInfos();
    infos[0].fils = "LA118DX";
    infos[0].bornier = "CF/CM-03-Twin";
    const csv = buildContinuityCsv({
      projectName: "Duplex Ertms",
      date: "07/05/2026 07:23:41",
      states,
      buttonInfos: infos,
    });

    expect(csv).toContain(";Twinax;");

    const imported = csv.replace(";Twinax;", ";Attente;");
    const parsed = parseContinuityCsv(imported);
    expect(parsed.states[0]).toBe(4);
  });
});
