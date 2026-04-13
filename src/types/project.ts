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

export interface PontStyleInfo {
  isPont: boolean;
  linkedPontTarget: number | null;
  hasPontStyleInWaitingState: boolean;
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

export const normalizeButtonInfo = (value: Partial<ButtonInfo> | null | undefined): ButtonInfo => ({
  fils: value?.fils ?? "",
  borne: value?.borne ?? "",
  bornier: value?.bornier ?? "",
  cfCm: value?.cfCm ?? "",
  locked: Boolean(value?.locked),
});

export const getButtonLabel = (index: number): number =>
  index < 75 ? index + 1 : index - 75 + 101;

const normalizeStateValue = (value: unknown): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const rounded = Math.round(numeric);
  if (rounded < 0) return 0;
  if (rounded > 3) return 3;
  return rounded;
};

export const normalizeStates = (value: unknown): number[] => {
  const inputStates = Array.isArray(value) ? value : [];
  const normalized = Array.from({ length: BUTTON_COUNT }, (_, index) => normalizeStateValue(inputStates[index]));
  return normalized;
};

export const normalizeProjectData = (value: Partial<ProjectData> | null | undefined): ProjectData => {
  const safeName = typeof value?.name === "string" && value.name.trim() ? value.name.trim() : "Projet sans nom";
  const normalizedStates = normalizeStates(value?.states);
  const sourceInfos = Array.isArray(value?.buttonInfos) ? value.buttonInfos : [];
  const normalizedInfos = Array.from({ length: BUTTON_COUNT }, (_, index) => normalizeButtonInfo(sourceInfos[index]));

  return {
    name: safeName,
    states: normalizedStates,
    buttonInfos: normalizedInfos,
  };
};
