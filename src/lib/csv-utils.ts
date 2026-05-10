import { BUTTON_COUNT, ProjectData, getButtonLabel, normalizeButtonInfo } from "@/types/project";
import { isTwinaxRow, TWINAX_LABEL, TWINAX_STATE } from "@/lib/twinax-utils";

const TABLE_COLUMNS = ["N°", "Fils", "Borne", "Bornier", "Cf/Cm", "État", "Non Testé"] as const;
const LEGACY_COLUMNS = ["Projet", "Date", ...TABLE_COLUMNS] as const;
const TABLE_HEADER = TABLE_COLUMNS.join(";");
const UTF8_BOM = "\uFEFF";

const STATE_TO_LABEL: Record<number, string> = {
  0: "Attente",
  1: "En cours",
  2: "Validé",
  3: "Défaut",
  [TWINAX_STATE]: TWINAX_LABEL,
};

const LABEL_TO_STATE: Record<string, number> = {
  "attente": 0,
  "en cours": 1,
  "validé": 2,
  "defaut": 3,
  "défaut": 3,
  "twinax": TWINAX_STATE,
};

const normalize = (value: string): string => value.trim().toLowerCase();

const parseNonTeste = (value: string): boolean => {
  const v = normalize(value);
  return ["oui", "true", "1"].includes(v);
};

export const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const parseCsvRows = (text: string): string[][] => {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ';') {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    if (char === '\r') {
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new Error("CSV invalide : guillemet non fermé.");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
};

export const buildContinuityCsv = ({ projectName, date, states, buttonInfos }: { projectName: string; date: string; states: number[]; buttonInfos: ProjectData["buttonInfos"] }): string => {
  const lines = [
    ["Projet", projectName].map(escapeCsvValue).join(";"),
    ["Date", date].map(escapeCsvValue).join(";"),
    "",
    TABLE_HEADER,
  ];

  for (let i = 0; i < BUTTON_COUNT; i += 1) {
    const info = normalizeButtonInfo(buttonInfos[i]);
    const state = isTwinaxRow(info) ? TWINAX_LABEL : (STATE_TO_LABEL[states[i]] ?? "Attente");
    const line = [
      String(getButtonLabel(i)),
      info.fils || "-",
      info.borne || "-",
      info.bornier || "-",
      info.cfCm || "-",
      state,
      info.locked ? "Oui" : "Non",
    ].map(escapeCsvValue).join(";");
    lines.push(line);
  }

  return `${UTF8_BOM}${lines.join("\r\n")}`;
};

export const parseContinuityCsv = (text: string): ProjectData => {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    throw new Error("Le fichier CSV est vide.");
  }

  const normalizedRows = rows.map((row) => row.map((v) => v.trim()));
  const findRowValue = (label: string): string => {
    const found = normalizedRows.find((row) => normalize(row[0] ?? "") === normalize(label));
    return (found?.[1] ?? "").trim();
  };

  const headerIndex = normalizedRows.findIndex((row) =>
    TABLE_COLUMNS.every((column, idx) => (row[idx] ?? "") === column),
  );

  const isLegacyFlat = headerIndex === 0 && LEGACY_COLUMNS.every((column, idx) => (normalizedRows[0]?.[idx] ?? "") === column);
  if (isLegacyFlat) {
    const index = Object.fromEntries(LEGACY_COLUMNS.map((col) => [col, normalizedRows[0].indexOf(col)])) as Record<(typeof LEGACY_COLUMNS)[number], number>;
    const states: number[] = [];
    const buttonInfos: ProjectData["buttonInfos"] = [];
    let projectName = "";

    for (let i = 1; i < normalizedRows.length; i += 1) {
      const row = normalizedRows[i];
      const get = (col: (typeof LEGACY_COLUMNS)[number]) => (row[index[col]] ?? "").trim();
      if (!projectName) projectName = get("Projet");
      const filsValue = get("Fils") === "-" ? "" : get("Fils");
      const parsedState = LABEL_TO_STATE[normalize(get("État"))] ?? 0;
      states.push(isTwinaxRow({ fils: filsValue, borne: get(2), bornier: get(3), cfCm: get(4) }) ? TWINAX_STATE : parsedState);
      buttonInfos.push({
        fils: filsValue,
        borne: get("Borne") === "-" ? "" : get("Borne"),
        bornier: get("Bornier") === "-" ? "" : get("Bornier"),
        cfCm: get("Cf/Cm") === "-" ? "" : get("Cf/Cm"),
        locked: parseNonTeste(get("Non Testé")),
      });
    }

    if (!projectName) throw new Error("Colonne Projet invalide : nom de projet manquant.");
    if (states.length !== BUTTON_COUNT) throw new Error(`Le fichier CSV doit contenir ${BUTTON_COUNT} lignes d'essais.`);
    return { name: projectName, states, buttonInfos };
  }

  const projectName = findRowValue("Projet");
  const projectDate = findRowValue("Date");
  if (!projectName) throw new Error("CSV invalide : ligne Projet manquante ou vide.");
  if (!projectDate) throw new Error("CSV invalide : ligne Date manquante ou vide.");

  if (headerIndex === -1) {
    throw new Error(`En-tête CSV introuvable. Colonnes attendues : ${TABLE_COLUMNS.join(", ")}.`);
  }

  const states: number[] = [];
  const buttonInfos: ProjectData["buttonInfos"] = [];

  for (let i = headerIndex + 1; i < normalizedRows.length; i += 1) {
    const row = normalizedRows[i];
    if (row.every((value) => value === "")) continue;

    const get = (colIndex: number) => (row[colIndex] ?? "").trim();
    const filsValue = get(1) === "-" ? "" : get(1);
    const parsedState = LABEL_TO_STATE[normalize(get(5))] ?? 0;
    states.push(isTwinaxRow({ fils: filsValue, borne: get(2), bornier: get(3), cfCm: get(4) }) ? TWINAX_STATE : parsedState);
    buttonInfos.push({
      fils: filsValue,
      borne: get(2) === "-" ? "" : get(2),
      bornier: get(3) === "-" ? "" : get(3),
      cfCm: get(4) === "-" ? "" : get(4),
      locked: parseNonTeste(get(6)),
    });
  }

  if (states.length !== BUTTON_COUNT) {
    throw new Error(`Le fichier CSV doit contenir ${BUTTON_COUNT} lignes d'essais.`);
  }

  return { name: projectName, states, buttonInfos };
};
