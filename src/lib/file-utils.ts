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

// Save file - uses Capacitor Filesystem on native, File System Access API on web
export const saveProjectFile = async (project: ProjectData): Promise<boolean> => {
  const content = formatProjectAsTable(project);

  // Try Capacitor Filesystem (native Android/iOS)
  if ((window as any).Capacitor?.isNativePlatform()) {
    try {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");

      // Request permissions
      try {
        await Filesystem.requestPermissions();
      } catch (e) {
        console.warn("Filesystem permissions:", e);
      }

      // Save to Documents folder
      const fileName = `${project.name}.txt`;
      await Filesystem.writeFile({
        path: `EssaisContinuite/${fileName}`,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      alert(`Projet enregistré dans Documents/EssaisContinuite/${fileName}`);
      return true;
    } catch (e: any) {
      console.error("Native save error:", e);
      // Fall through to web fallback
    }
  }

  // Web: Try File System Access API (shows "Save As" dialog)
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${project.name}.txt`,
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
  a.download = `${project.name}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};
