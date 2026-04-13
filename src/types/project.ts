export interface ButtonInfo {
  fils: string;
  borne: string;
  bornier: string;
  cfCm: string;
  locked: boolean;
}

export interface ProjectData {
  name: string;
  states: number[];
  buttonInfos: ButtonInfo[];
}

export const BUTTON_COUNT = 150;

export const STATE_LABELS = [
  "En attente",
  "En cours",
  "Validé",
  "Défaut",
] as const;

export const createDefaultInfos = (): ButtonInfo[] =>
  Array.from({ length: BUTTON_COUNT }, () => ({ fils: "", borne: "", bornier: "", cfCm: "", locked: false }));

const asSafeString = (value: unknown): string => (typeof value === "string" ? value : "");

export const normalizeButtonInfo = (value: unknown): ButtonInfo => {
  const source = value && typeof value === "object" ? (value as Partial<ButtonInfo>) : undefined;
  return {
    fils: asSafeString(source?.fils),
    borne: asSafeString(source?.borne),
    bornier: asSafeString(source?.bornier),
    cfCm: asSafeString(source?.cfCm),
    locked: Boolean(source?.locked),
  };
};

const normalizeStateValue = (value: unknown): 0 | 1 | 2 | 3 => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  const normalized = Math.round(value);
  if (normalized < 0 || normalized > 3) {
    return 0;
  }

  return normalized as 0 | 1 | 2 | 3;
};

export const normalizeStates = (value: unknown): number[] => {
  const source = Array.isArray(value) ? value : [];
  const normalized = source.slice(0, BUTTON_COUNT).map((state) => normalizeStateValue(state));

  while (normalized.length < BUTTON_COUNT) {
    normalized.push(0);
  }

  return normalized;
};

export const normalizeProjectData = (value: Partial<ProjectData> | null | undefined): ProjectData => {
  const normalizedName = typeof value?.name === "string" ? value.name.trim() : "";
  const sourceInfos = Array.isArray(value?.buttonInfos) ? value.buttonInfos : [];
  const normalizedInfos = sourceInfos.slice(0, BUTTON_COUNT).map((info) => normalizeButtonInfo(info));

  while (normalizedInfos.length < BUTTON_COUNT) {
    normalizedInfos.push(normalizeButtonInfo(undefined));
  }

  return {
    name: normalizedName || "Projet sans nom",
    states: normalizeStates(value?.states),
    buttonInfos: normalizedInfos,
  };
};

export const getButtonLabel = (index: number): number =>
  index < 75 ? index + 1 : index - 75 + 101;
