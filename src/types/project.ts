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

export const createDefaultInfo = (): ButtonInfo => ({
  fils: "",
  borne: "",
  bornier: "",
  cfCm: "",
  locked: false,
});

export const createDefaultInfos = (): ButtonInfo[] =>
  Array.from({ length: BUTTON_COUNT }, createDefaultInfo);

export const normalizeButtonInfo = (info?: Partial<ButtonInfo> | null): ButtonInfo => ({
  ...createDefaultInfo(),
  ...info,
});

export const normalizeButtonInfos = (infos?: Partial<ButtonInfo>[]): ButtonInfo[] =>
  Array.from({ length: BUTTON_COUNT }, (_, index) => normalizeButtonInfo(infos?.[index]));

export const getButtonLabel = (index: number): number =>
  index < 75 ? index + 1 : index - 75 + 101;
