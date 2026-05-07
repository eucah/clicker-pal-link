import { ButtonInfo, ProjectData, BUTTON_COUNT, normalizeButtonInfo } from "@/types/project";
import { buildContinuityCsv, parseContinuityCsv } from "@/lib/csv-utils";
import { isTwinaxRow, TWINAX_STATE } from "@/lib/twinax-utils";

const STATE_NAMES = ["Attente", "En cours", "Validé", "Défaut"] as const;
const REPORT_STATE_BY_LINE: Record<number, string> = {
  2: "validé",
  3: "défaut",
};

const getNowFrDateTime = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

export const formatProjectAsTable = (project: ProjectData): string =>
  buildContinuityCsv({ projectName: project.name, date: getNowFrDateTime(), states: project.states, buttonInfos: project.buttonInfos });

export const formatReportAsTable = (project: ProjectData): string => {
  const content = buildContinuityCsv({ projectName: project.name, date: getNowFrDateTime(), states: project.states, buttonInfos: project.buttonInfos });
  return content;
};

const mapReportStateByLine = (lineState: number): string => {
  if (lineState in REPORT_STATE_BY_LINE) {
    return REPORT_STATE_BY_LINE[lineState];
  }
  return "";
};

const parseLegacyTxtProjectFile = (content: string): ProjectData | null => {
  const lines = content.split("\n").map((l) => l.trimEnd());
  const nameLine = lines.find((l) => l.startsWith("Projet:"));
  if (!nameLine) return null;
  const name = nameLine.replace("Projet:", "").trim();
  if (!name) return null;

  const dashIndex = lines.findIndex((l) => /^-{10,}/.test(l));
  if (dashIndex === -1) return null;

  const states: number[] = [];
  const buttonInfos: ButtonInfo[] = [];
  const stateMap: Record<string, number> = { "Attente": 0, "En cours": 1, "Validé": 2, "Défaut": 3 };

  for (let i = dashIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || /^={10,}/.test(line)) break;
    const num = line.substring(0, 6).trim();
    if (!num || isNaN(Number(num))) continue;

    const isLatestFormat = line.length >= 84;
    const isNewFormat = line.length >= 70;
    const fils = line.substring(6, 26).trim();
    const borne = isNewFormat ? line.substring(26, 40).trim() : "";
    const bornier = isNewFormat ? line.substring(40, 60).trim() : line.substring(26, 46).trim();
    const cfCm = isLatestFormat ? line.substring(60, 72).trim() : "";
    const etat = isLatestFormat ? line.substring(72, 84).trim() : isNewFormat ? line.substring(60, 72).trim() : line.substring(46, 58).trim();
    const nonTeste = isLatestFormat ? line.substring(84).trim() : isNewFormat ? line.substring(72).trim() : line.substring(58).trim();

    const normalizedFils = fils === "-" ? "" : fils;
    states.push(isTwinaxRow({ fils: normalizedFils, borne, bornier, cfCm }) ? TWINAX_STATE : (stateMap[etat] ?? 0));
    buttonInfos.push({ fils: normalizedFils, borne: borne === "-" ? "" : borne, bornier: bornier === "-" ? "" : bornier, cfCm: cfCm === "-" ? "" : cfCm, locked: nonTeste === "Oui" });
  }

  if (states.length !== BUTTON_COUNT) return null;
  return { name, states, buttonInfos };
};

export const parseProjectFile = (content: string): ProjectData | null => {
  try {
    const jsonMarker = "--- JSON (ne pas modifier ci-dessous) ---";
    const markerIndex = content.indexOf(jsonMarker);
    if (markerIndex !== -1) {
      const jsonStr = content.substring(markerIndex + jsonMarker.length).trim();
      const data = JSON.parse(jsonStr) as ProjectData;
      if (data.name && data.states && data.buttonInfos) {
        return { ...data, buttonInfos: data.buttonInfos.map((info) => normalizeButtonInfo(info)) };
      }
    }

    try {
      const parsedCsv = parseContinuityCsv(content);
      return { ...parsedCsv, buttonInfos: parsedCsv.buttonInfos.map((info) => normalizeButtonInfo(info)) };
    } catch (csvError) {
      const legacy = parseLegacyTxtProjectFile(content);
      if (legacy) return legacy;
      throw csvError;
    }
  } catch {
    return null;
  }
};

export const normalizeTwinaxProjectData = (project: ProjectData): ProjectData => {
  const buttonInfos = project.buttonInfos.map((info) => normalizeButtonInfo(info));
  const states = Array.from({ length: BUTTON_COUNT }, (_, index) => {
    const currentState = project.states[index] ?? 0;
    return isTwinaxRow(buttonInfos[index]) ? TWINAX_STATE : currentState;
  });
  return { ...project, states, buttonInfos };
};

const saveTextFile = async (content: string, suggestedName: string, alertSuccessMessage?: string): Promise<boolean> => {
  if ((window as any).Capacitor?.isNativePlatform()) {
    try {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
      try { await Filesystem.requestPermissions(); } catch (e) { console.warn("Filesystem permissions:", e); }
      const fileName = suggestedName.endsWith(".csv") ? suggestedName : `${suggestedName}.csv`;
      await Filesystem.writeFile({ path: `EssaisContinuite/${fileName}`, data: content, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
      if (alertSuccessMessage) alert(`${alertSuccessMessage} Documents/EssaisContinuite/${fileName}`);
      return true;
    } catch (e: any) { console.error("Native save error:", e); }
  }

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: suggestedName.endsWith(".csv") ? suggestedName : `${suggestedName}.csv`,
        types: [{ description: "Fichier CSV", accept: { "text/csv;charset=utf-8": [".csv"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e: any) { if (e.name === "AbortError") return false; }
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName.endsWith(".csv") ? suggestedName : `${suggestedName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

export const saveProjectFile = async (project: ProjectData): Promise<boolean> => saveTextFile(formatProjectAsTable(project), project.name, "Projet enregistré dans");

export const saveReportFile = async (project: ProjectData, fileName: string): Promise<boolean> => {
  void mapReportStateByLine; // conserve la logique rapport existante sans impact Bluetooth/UI
  return saveTextFile(formatReportAsTable(project), fileName);
};
