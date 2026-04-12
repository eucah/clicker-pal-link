import { ButtonInfo, ProjectData, BUTTON_COUNT, getButtonLabel, normalizeButtonInfo } from "@/types/project";

const STATE_NAMES = ["Attente", "En cours", "Validé", "Défaut"] as const;

// Format project data as a readable table in text format (no JSON)
export const formatProjectAsTable = (project: ProjectData): string => {
  const lines: string[] = [];
  lines.push(`Projet: ${project.name}`);
  lines.push(`Date: ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")}`);
  lines.push("");
  lines.push("=".repeat(102));
  lines.push(
    padRight("N°", 6) +
    padRight("Fils", 20) +
    padRight("Borne", 14) +
    padRight("Bornier", 20) +
    padRight("Cf/Cm", 12) +
    padRight("État", 12) +
    padRight("Non Testé", 10)
  );
  lines.push("-".repeat(102));

  for (let i = 0; i < BUTTON_COUNT; i++) {
    const label = String(getButtonLabel(i));
    const info = normalizeButtonInfo(project.buttonInfos[i]);
    const state = STATE_NAMES[project.states[i]] || "Attente";
    const locked = info.locked ? "Oui" : "Non";
    lines.push(
      padRight(label, 6) +
      padRight(info.fils || "-", 20) +
      padRight(info.borne || "-", 14) +
      padRight(info.bornier || "-", 20) +
      padRight(info.cfCm || "-", 12) +
      padRight(state, 12) +
      padRight(locked, 10)
    );
  }

  lines.push("=".repeat(102));
  return lines.join("\n");
};

export const formatReportAsTable = (project: ProjectData): string => {
  const lines: string[] = [];
  lines.push(`Rapport: ${project.name}`);
  lines.push(`Date: ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")}`);
  lines.push("");
  lines.push("=".repeat(114));
  lines.push(
    padRight("N°", 6) +
    padRight("Fils", 20) +
    padRight("Borne", 14) +
    padRight("Bornier", 20) +
    padRight("Cf/Cm", 12) +
    padRight("État", 12) +
    padRight("Non Testé", 10) +
    padRight("Rapport", 12)
  );
  lines.push("-".repeat(114));

  for (let i = 0; i < BUTTON_COUNT; i += 1) {
    const label = String(getButtonLabel(i));
    const info = normalizeButtonInfo(project.buttonInfos[i]);
    const state = STATE_NAMES[project.states[i]] || "Attente";
    const locked = info.locked ? "Oui" : "Non";
    const reportState = project.states[i] === 2 ? "validé" : "défaut";
    lines.push(
      padRight(label, 6) +
      padRight(info.fils || "-", 20) +
      padRight(info.borne || "-", 14) +
      padRight(info.bornier || "-", 20) +
      padRight(info.cfCm || "-", 12) +
      padRight(state, 12) +
      padRight(locked, 10) +
      padRight(reportState, 12)
    );
  }

  lines.push("=".repeat(114));
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
          buttonInfos: data.buttonInfos.map((info) => normalizeButtonInfo(info)),
        };
      }
    }

    // Try parsing as plain JSON (backward compat)
    try {
      const data = JSON.parse(content) as ProjectData;
      if (data.name && data.states && data.buttonInfos) {
        return {
          ...data,
          buttonInfos: data.buttonInfos.map((info) => normalizeButtonInfo(info)),
        };
      }
    } catch { /* not JSON, parse table */ }

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
      "Attente": 0,
      "En cours": 1,
      "Validé": 2,
      "Défaut": 3,
    };

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
      const etat = isLatestFormat
        ? line.substring(72, 84).trim()
        : isNewFormat
          ? line.substring(60, 72).trim()
          : line.substring(46, 58).trim();
      const nonTeste = isLatestFormat
        ? line.substring(84).trim()
        : isNewFormat
          ? line.substring(72).trim()
          : line.substring(58).trim();

      states.push(stateMap[etat] ?? 0);
      buttonInfos.push({
        fils: fils === "-" ? "" : fils,
        borne: borne === "-" ? "" : borne,
        bornier: bornier === "-" ? "" : bornier,
        cfCm: cfCm === "-" ? "" : cfCm,
        locked: nonTeste === "Oui",
      });
    }

    if (states.length !== BUTTON_COUNT) return null;

    return { name, states, buttonInfos };
  } catch {
    return null;
  }
};

// Save file - uses Capacitor Filesystem on native, File System Access API on web
const saveTextFile = async (content: string, suggestedName: string, alertSuccessMessage?: string): Promise<boolean> => {

  // Try Capacitor Filesystem (native Android/iOS)
  if ((window as any).Capacitor?.isNativePlatform()) {
    try {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");

      try {
        await Filesystem.requestPermissions();
      } catch (e) {
        console.warn("Filesystem permissions:", e);
      }

      const fileName = suggestedName.endsWith(".txt") ? suggestedName : `${suggestedName}.txt`;
      await Filesystem.writeFile({
        path: `EssaisContinuite/${fileName}`,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      if (alertSuccessMessage) {
        alert(`${alertSuccessMessage} Documents/EssaisContinuite/${fileName}`);
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
        suggestedName: suggestedName.endsWith(".txt") ? suggestedName : `${suggestedName}.txt`,
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
  a.download = suggestedName.endsWith(".txt") ? suggestedName : `${suggestedName}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

export const saveProjectFile = async (project: ProjectData): Promise<boolean> => {
  const content = formatProjectAsTable(project);
  return saveTextFile(content, project.name, "Projet enregistré dans");
};

export const saveReportFile = async (project: ProjectData, fileName: string): Promise<boolean> => {
  const content = formatReportAsTable(project);
  return saveTextFile(content, fileName);
};
