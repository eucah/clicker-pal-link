import { ButtonInfo, ProjectData, BUTTON_COUNT, getButtonLabel } from "@/types/project";

// Format project data as a readable table in text format
export const formatProjectAsTable = (project: ProjectData): string => {
  const lines: string[] = [];
  lines.push(`Projet: ${project.name}`);
  lines.push(`Date: ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")}`);
  lines.push("");
  lines.push("=".repeat(70));
  lines.push(
    padRight("N°", 6) +
    padRight("Fils", 20) +
    padRight("Bornier", 20) +
    padRight("État", 12) +
    padRight("Non Testé", 10)
  );
  lines.push("-".repeat(70));

  const stateNames = ["Attente", "En cours", "Validé", "Défaut"];

  for (let i = 0; i < BUTTON_COUNT; i++) {
    const label = String(getButtonLabel(i));
    const info = project.buttonInfos[i];
    const state = stateNames[project.states[i]] || "Attente";
    const locked = info.locked ? "Oui" : "Non";
    lines.push(
      padRight(label, 6) +
      padRight(info.fils || "-", 20) +
      padRight(info.bornier || "-", 20) +
      padRight(state, 12) +
      padRight(locked, 10)
    );
  }

  lines.push("=".repeat(70));
  lines.push("");
  lines.push("--- JSON (ne pas modifier ci-dessous) ---");
  lines.push(JSON.stringify(project));

  return lines.join("\n");
};

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
}

// Parse a project file - supports both table format and plain JSON
export const parseProjectFile = (content: string): ProjectData | null => {
  try {
    // Try to find JSON after the marker
    const jsonMarker = "--- JSON (ne pas modifier ci-dessous) ---";
    const markerIndex = content.indexOf(jsonMarker);
    if (markerIndex !== -1) {
      const jsonStr = content.substring(markerIndex + jsonMarker.length).trim();
      const data = JSON.parse(jsonStr) as ProjectData;
      if (data.name && data.states && data.buttonInfos) return data;
    }

    // Fallback: try parsing the whole content as JSON
    const data = JSON.parse(content) as ProjectData;
    if (data.name && data.states && data.buttonInfos) return data;
  } catch {
    // ignore
  }
  return null;
};

// Save file - triggers download with file picker on supported browsers
export const saveProjectFile = (project: ProjectData) => {
  const content = formatProjectAsTable(project);
  const blob = new Blob([content], { type: "text/plain" });

  // Try File System Access API (shows "Save As" dialog)
  if ("showSaveFilePicker" in window) {
    (window as any).showSaveFilePicker({
      suggestedName: `${project.name}.txt`,
      types: [{
        description: "Fichier texte",
        accept: { "text/plain": [".txt"] },
      }],
    }).then(async (handle: any) => {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    }).catch((e: any) => {
      // User cancelled or API not fully supported - fallback
      if (e.name !== "AbortError") {
        downloadFallback(blob, `${project.name}.txt`);
      }
    });
  } else {
    downloadFallback(blob, `${project.name}.txt`);
  }
};

const downloadFallback = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
