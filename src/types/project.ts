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

export const normalizeButtonInfo = (value: Partial<ButtonInfo> | null | undefined): ButtonInfo => ({
  fils: value?.fils ?? "",
  borne: value?.borne ?? "",
  bornier: value?.bornier ?? "",
  cfCm: value?.cfCm ?? "",
  locked: Boolean(value?.locked),
});

export const getButtonLabel = (index: number): number =>
  index < 75 ? index + 1 : index - 75 + 101;
