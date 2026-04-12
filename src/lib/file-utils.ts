import {
  ButtonInfo,
  ProjectData,
  BUTTON_COUNT,
  getButtonLabel,
  normalizeButtonInfos,
} from "@/types/project";

const STATE_NAMES = ["Attente", "En cours", "Validé", "Défaut"] as const;

const PROJECT_COLUMN_WIDTHS = {
  index: 6,
  fils: 20,
  borne: 14,
  bornier: 20,
  cfCm: 14,
  etat: 12,
  nonTeste: 10,
} as const;

const REPORT_COLUMN_WIDTHS = {
  ...PROJECT_COLUMN_WIDTHS,
  rapport: 12,
} as const;

const toValidatedStatus = (state: number): "validé" | "défaut" => (state === 2 ? "validé" : "défaut");

const parseCell = (value: string): string => (value === "-" ? "" : value);

const buildProjectTableLine = (label: string, info: ButtonInfo, stateLabel: string, nonTeste: string): string =>
  padRight(label, PROJECT_COLUMN_WIDTHS.index) +
  padRight(info.fils || "-", PROJECT_COLUMN_WIDTHS.fils) +
  padRight(info.borne || "-", PROJECT_COLUMN_WIDTHS.borne) +
  padRight(info.bornier || "-", PROJECT_COLUMN_WIDTHS.bornier) +
  padRight(info.cfCm || "-", PROJECT_COLUMN_WIDTHS.cfCm) +
  padRight(stateLabel, PROJECT_COLUMN_WIDTHS.etat) +
  padRight(nonTeste, PROJECT_COLUMN_WIDTHS.nonTeste);

const buildReportTableLine = (
  label: string,
  info: ButtonInfo,
  stateLabel: string,
  nonTeste: string,
  reportStatus: string,
): string =>
  buildProjectTableLine(label, info, stateLabel, nonTeste) +
  padRight(reportStatus, REPORT_COLUMN_WIDTHS.rapport);

const PROJECT_TABLE_WIDTH = Object.values(PROJECT_COLUMN_WIDTHS).reduce((acc, width) => acc + width, 0);
const REPORT_TABLE_WIDTH = Object.values(REPORT_COLUMN_WIDTHS).reduce((acc, width) => acc + width, 0);

// Format project data as a readable table in text format (no JSON)
export const formatProjectAsTable = (project: ProjectData): string => {
  const lines: string[] = [];
  lines.push(`Projet: ${project.name}`);
  lines.push(`Date: ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")}`);
  lines.push("");
  lines.push("=".repeat(PROJECT_TABLE_WIDTH));
  lines.push(
    padRight("N°", PROJECT_COLUMN_WIDTHS.index) +
    padRight("Fils", PROJECT_COLUMN_WIDTHS.fils) +
    padRight("Borne", PROJECT_COLUMN_WIDTHS.borne) +
    padRight("Bornier", PROJECT_COLUMN_WIDTHS.bornier) +
    padRight("Cf/Cm", PROJECT_COLUMN_WIDTHS.cfCm) +
    padRight("État", PROJECT_COLUMN_WIDTHS.etat) +
    padRight("Non Testé", PROJECT_COLUMN_WIDTHS.nonTeste),
  );
  lines.push("-".repeat(PROJECT_TABLE_WIDTH));

  for (let i = 0; i < BUTTON_COUNT; i++) {
    const label = String(getButtonLabel(i));
    const info = project.buttonInfos[i];
    const state = STATE_NAMES[project.states[i]] || "Attente";
    const locked = info.locked ? "Oui" : "Non";

    lines.push(buildProjectTableLine(label, info, state, locked));
  }

  lines.push("=".repeat(PROJECT_TABLE_WIDTH));
  return lines.join("\n");
};

export const formatReportAsTable = (project: ProjectData): string => {
  const lines: string[] = [];
  lines.push(`Rapport: ${project.name}`);
  lines.push(`Date: ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")}`);
  lines.push("");
  lines.push("=".repeat(REPORT_TABLE_WIDTH));
  lines.push(
    padRight("N°", REPORT_COLUMN_WIDTHS.index) +
    padRight("Fils", REPORT_COLUMN_WIDTHS.fils) +
    padRight("Borne", REPORT_COLUMN_WIDTHS.borne) +
    padRight("Bornier", REPORT_COLUMN_WIDTHS.bornier) +
    padRight("Cf/Cm", REPORT_COLUMN_WIDTHS.cfCm) +
    padRight("État", REPORT_COLUMN_WIDTHS.etat) +
    padRight("Non Testé", REPORT_COLUMN_WIDTHS.nonTeste) +
    padRight("Rapport", REPORT_COLUMN_WIDTHS.rapport),
  );
  lines.push("-".repeat(REPORT_TABLE_WIDTH));

  for (let i = 0; i < BUTTON_COUNT; i++) {
    const label = String(getButtonLabel(i));
    const info = project.buttonInfos[i];
    const stateIndex = project.states[i] ?? 0;
    const state = STATE_NAMES[stateIndex] || "Attente";
    const locked = info.locked ? "Oui" : "Non";

    lines.push(buildReportTableLine(label, info, state, locked, toValidatedStatus(stateIndex)));
  }

  lines.push("=".repeat(REPORT_TABLE_WIDTH));
  return lines.join("\n");
};

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
}

// Parse a project file from table format
export const parseProjectFile = (content: string): ProjectData | null => {
  try {
    // Try legacy JSON marker first (backward compat)
    const jsonMarker = "--- JSON (ne pas modifier ci-dessous) ---";
    const markerIndex = content.indexOf(jsonMarker);
    if (markerIndex !== -1) {
      const jsonStr = content.substring(markerIndex + jsonMarker.length).trim();
      const data = JSON.parse(jsonStr) as ProjectData;
      if (data.name && data.states && data.buttonInfos) {
        return {
          ...data,
          buttonInfos: normalizeButtonInfos(data.buttonInfos),
        };
      }
    }

    // Try parsing as plain JSON (backward compat)
    try {
      const data = JSON.parse(content) as ProjectData;
      if (data.name && data.states && data.buttonInfos) {
        return {
          ...data,
          buttonInfos: normalizeButtonInfos(data.buttonInfos),
        };
      }
    } catch {
      /* not JSON, parse table */
    }

    // Parse table format
    const lines = content.split("\n").map((l) => l.trimEnd());

    // Extract project name
    const nameLine = lines.find((l) => l.startsWith("Projet:"));
    if (!nameLine) return null;
    const name = nameLine.replace("Projet:", "").trim();
    if (!name) return null;

    // Find the data rows (after the dashed separator)
    const dashIndex = lines.findIndex((l) => /^-{10,}/.test(l));
    if (dashIndex === -1) return null;

    const states: number[] = [];
    const buttonInfos: ButtonInfo[] = [];

    const stateMap: Record<string, number> = {
      Attente: 0,
      "En cours": 1,
      Validé: 2,
      Défaut: 3,
    };

    for (let i = dashIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || /^={10,}/.test(line)) break;

      const num = line.substring(0, 6).trim();
      if (!num || isNaN(Number(num))) continue;

      const hasCfCmColumn = line.length >= PROJECT_TABLE_WIDTH - PROJECT_COLUMN_WIDTHS.nonTeste;
      const hasBorneColumn = line.length >= 70;

      const fils = line.substring(6, 26).trim();
      const borne = hasBorneColumn ? line.substring(26, 40).trim() : "";
      const bornier = hasBorneColumn ? line.substring(40, 60).trim() : line.substring(26, 46).trim();
      const cfCm = hasCfCmColumn ? line.substring(60, 74).trim() : "";
      const etat = hasCfCmColumn
        ? line.substring(74, 86).trim()
        : hasBorneColumn
          ? line.substring(60, 72).trim()
          : line.substring(46, 58).trim();
      const nonTeste = hasCfCmColumn
        ? line.substring(86, 96).trim()
        : hasBorneColumn
          ? line.substring(72).trim()
          : line.substring(58).trim();

      states.push(stateMap[etat] ?? 0);
      buttonInfos.push({
        fils: parseCell(fils),
        borne: parseCell(borne),
        bornier: parseCell(bornier),
        cfCm: parseCell(cfCm),
        locked: nonTeste === "Oui",
      });
    }

    if (states.length !== BUTTON_COUNT) return null;

    return { name, states, buttonInfos: normalizeButtonInfos(buttonInfos) };
  } catch {
    return null;
  }
};

const normalizeTxtExtension = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.toLowerCase().endsWith(".txt") ? trimmed : `${trimmed}.txt`;
};

const saveTextFile = async (content: string, suggestedName: string, successMessage?: string): Promise<boolean> => {
  const fileName = normalizeTxtExtension(suggestedName);
  if (!fileName) return false;

  // Try Capacitor Filesystem (native Android/iOS)
  if ((window as any).Capacitor?.isNativePlatform()) {
    try {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");

      try {
        await Filesystem.requestPermissions();
      } catch (e) {
        console.warn("Filesystem permissions:", e);
      }

      await Filesystem.writeFile({
        path: `EssaisContinuite/${fileName}`,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      if (successMessage) {
        alert(`${successMessage} Documents/EssaisContinuite/${fileName}`);
      }
      return true;
    } catch (e: any) {
      console.error("Native save error:", e);
    }
  }

  // Web: Try File System Access API
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: "Fichier texte",
          accept: { "text/plain": [".txt"] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e: any) {
      if (e.name === "AbortError") return false;
    }
  }

  // Final fallback: download
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

// Save file - uses Capacitor Filesystem on native, File System Access API on web
export const saveProjectFile = async (project: ProjectData): Promise<boolean> => {
  const content = formatProjectAsTable(project);
  return saveTextFile(content, project.name, "Projet enregistré dans");
};

export const saveReportFile = async (project: ProjectData, requestedName?: string): Promise<boolean> => {
  const content = formatReportAsTable(project);
  const fallbackName = `${project.name}-rapport`;
  const fileName = requestedName?.trim() || fallbackName;
  return saveTextFile(content, fileName, "Rapport enregistré dans");
};
