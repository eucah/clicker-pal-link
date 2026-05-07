import { BUTTON_COUNT, ProjectData, getButtonLabel, normalizeButtonInfo } from "@/types/project";

const CSV_COLUMNS = ["Projet", "Date", "N°", "Fils", "Borne", "Bornier", "Cf/Cm", "État", "Non Testé"] as const;
const CSV_HEADER = CSV_COLUMNS.join(";");
const UTF8_BOM = "\uFEFF";

const STATE_TO_LABEL: Record<number, string> = {
  0: "Attente",
  1: "En cours",
  2: "Validé",
  3: "Défaut",
};

const LABEL_TO_STATE: Record<string, number> = {
  "attente": 0,
  "en cours": 1,
  "validé": 2,
  "defaut": 3,
  "défaut": 3,
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
  const lines = [CSV_HEADER];
  for (let i = 0; i < BUTTON_COUNT; i += 1) {
    const info = normalizeButtonInfo(buttonInfos[i]);
    const state = STATE_TO_LABEL[states[i]] ?? "Attente";
    const line = [
      projectName,
      date,
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

  const header = rows[0].map((v) => v.trim());
  const required = [...CSV_COLUMNS];
  const missing = required.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    throw new Error(`Colonnes CSV manquantes : ${missing.join(", ")}.`);
  }

  const index = Object.fromEntries(required.map((col) => [col, header.indexOf(col)])) as Record<(typeof CSV_COLUMNS)[number], number>;

  const states: number[] = [];
  const buttonInfos: ProjectData["buttonInfos"] = [];
  let projectName = "";

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const get = (col: (typeof CSV_COLUMNS)[number]) => (row[index[col]] ?? "").trim();

    if (!projectName) {
      projectName = get("Projet");
    }

    const stateLabel = normalize(get("État"));
    states.push(LABEL_TO_STATE[stateLabel] ?? 0);
    buttonInfos.push({
      fils: get("Fils") === "-" ? "" : get("Fils"),
      borne: get("Borne") === "-" ? "" : get("Borne"),
      bornier: get("Bornier") === "-" ? "" : get("Bornier"),
      cfCm: get("Cf/Cm") === "-" ? "" : get("Cf/Cm"),
      locked: parseNonTeste(get("Non Testé")),
    });
  }

  if (!projectName) {
    throw new Error("Colonne Projet invalide : nom de projet manquant.");
  }

  if (states.length !== BUTTON_COUNT) {
    throw new Error(`Le fichier CSV doit contenir ${BUTTON_COUNT} lignes d'essais.`);
  }

  return { name: projectName, states, buttonInfos };
};
