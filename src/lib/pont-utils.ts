import { ButtonInfo } from "@/types/project";

const PONT_PATTERN = /\bpont\b/i;
const NUMBER_PATTERN = /\d+/;

const getButtonIndexFromLabel = (label: number): number | null => {
  if (label >= 1 && label <= 75) {
    return label - 1;
  }

  if (label >= 101 && label <= 175) {
    const relative = label - 101;
    const row = Math.floor(relative / 15);
    const col = relative % 15;
    return 75 + row * 15 + (14 - col);
  }

  return null;
};

const extractBorneLabel = (borne: string | null | undefined): number | null => {
  if (typeof borne !== "string") return null;
  const match = borne.match(NUMBER_PATTERN);
  if (!match) return null;

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildPontIndexSet = (buttonInfos: ButtonInfo[] | null | undefined): Set<number> => {
  const pontIndexes = new Set<number>();
  if (!Array.isArray(buttonInfos)) return pontIndexes;

  buttonInfos.forEach((info, index) => {
    if (!info || typeof info.fils !== "string") return;
    if (!PONT_PATTERN.test(info.fils)) return;

    pontIndexes.add(index);

    const targetLabel = extractBorneLabel(info.borne);
    if (targetLabel === null) return;

    const targetIndex = getButtonIndexFromLabel(targetLabel);
    if (targetIndex === null) return;
    pontIndexes.add(targetIndex);
  });

  return pontIndexes;
};

