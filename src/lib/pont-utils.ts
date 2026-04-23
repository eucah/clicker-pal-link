import { ButtonInfo } from "@/types/project";

const PONT_PATTERN = /\bpont\b/i;
const NUMBER_PATTERN = /\d+/;
export const PONT_BORDER_CLASS = "border-2 border-blue-600";
export const ASSOCIATED_PONT_CONTACT_BORDER_CLASS = "border-2 border-[#22C7C7] animate-pulse-slow";

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
    if (!info || typeof info.bornier !== "string") return;
    if (!PONT_PATTERN.test(info.bornier)) return;
    // Un bouton Pont reste permanent uniquement via bornier = Pont
    pontIndexes.add(index);
  });

  return pontIndexes;
};

export const resolveAssociatedPontContactIndex = (
  buttonInfos: ButtonInfo[] | null | undefined,
  selectedIndex: number | null,
): number | null => {
  if (!Array.isArray(buttonInfos) || selectedIndex === null) return null;
  if (selectedIndex < 0 || selectedIndex >= buttonInfos.length) return null;

  const selectedInfo = buttonInfos[selectedIndex];
  if (!selectedInfo || typeof selectedInfo.bornier !== "string") return null;
  if (!PONT_PATTERN.test(selectedInfo.bornier)) return null;

  const targetLabel = extractBorneLabel(selectedInfo.borne);
  if (targetLabel === null) return null;

  const targetIndex = getButtonIndexFromLabel(targetLabel);
  if (targetIndex === null) return null;
  if (targetIndex < 0 || targetIndex >= buttonInfos.length) return null;
  if (targetIndex === selectedIndex) return null;
  if (buttonInfos[targetIndex]?.locked) return null;

  return targetIndex;
};
