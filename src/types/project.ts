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

const containsPontKeyword = (fils: string): boolean => {
  const normalized = fils.replace(/\s+/g, " ").trim();
  return /\bpont\b/i.test(normalized);
};

const extractGridIndexFromBorne = (borne: string, labelToIndex: Map<number, number>): number | null => {
  const matches = borne.match(/\d+/g);
  if (!matches) return null;

  for (const token of matches) {
    const label = Number(token);
    const index = labelToIndex.get(label);
    if (index !== undefined) {
      return index;
    }
  }

  return null;
};

export const buildPontStyleInfo = (buttonInfos: ButtonInfo[]): PontStyleInfo[] => {
  const safeInfos = Array.from({ length: BUTTON_COUNT }, (_, index) => normalizeButtonInfo(buttonInfos[index]));
  const labelToIndex = new Map<number, number>();
  for (let i = 0; i < BUTTON_COUNT; i += 1) {
    labelToIndex.set(getButtonLabel(i), i);
  }

  const directPont = Array(BUTTON_COUNT).fill(false) as boolean[];
  const linkedTargets = new Set<number>();
  const linkedBySource = Array(BUTTON_COUNT).fill(null) as Array<number | null>;

  safeInfos.forEach((info, index) => {
    if (!containsPontKeyword(info.fils)) return;

    directPont[index] = true;
    const targetIndex = extractGridIndexFromBorne(info.borne, labelToIndex);
    linkedBySource[index] = targetIndex;
    if (targetIndex !== null) {
      linkedTargets.add(targetIndex);
    }
  });

  return safeInfos.map((_, index) => ({
    isPont: directPont[index],
    linkedPontTarget: linkedBySource[index],
    hasPontStyleInWaitingState: directPont[index] || linkedTargets.has(index),
  }));
};
