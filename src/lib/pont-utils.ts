import { BUTTON_COUNT, type ButtonInfo, getButtonLabel, normalizeButtonInfo } from "@/types/project";

export interface PontVisualState {
  isPontSource: boolean;
  isPontLinked: boolean;
  hasPontStyleInWaitingState: boolean;
}

const containsPontKeyword = (value: string): boolean => /\bpont\b/i.test(value.replace(/\s+/g, " ").trim());

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

const extractSingleBorneNumber = (value: string): number | null => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const matches = normalized.match(/\b\d+\b/g) ?? [];
  if (matches.length !== 1) {
    return null;
  }

  const parsed = Number(matches[0]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.debug("[pont-utils]", ...args);
  }
};

export const resolvePontVisualStates = (buttonInfos: ButtonInfo[]): PontVisualState[] => {
  try {
    const safeInfos = Array.from({ length: BUTTON_COUNT }, (_, index) => normalizeButtonInfo(buttonInfos[index]));
    const labelToIndex = new Map<number, number>();

    for (let i = 0; i < BUTTON_COUNT; i += 1) {
      labelToIndex.set(getButtonLabel(i), i);
    }

    const isPontSource = Array(BUTTON_COUNT).fill(false) as boolean[];
    const linkedIndexes = new Set<number>();

    safeInfos.forEach((info, index) => {
      const sourceLabel = getButtonLabel(index);
      const fils = toText(info.fils);

      if (!containsPontKeyword(fils)) {
        return;
      }

      isPontSource[index] = true;

      const borne = toText(info.borne);
      const extractedLabel = extractSingleBorneNumber(borne);
      if (extractedLabel === null) {
        const rawMatches = borne.match(/\b\d+\b/g) ?? [];
        if (rawMatches.length > 1) {
          devLog("ambiguous borne ignored", {
            sourceIndex: index,
            sourceLabel,
            borneRaw: borne,
            matchedNumbers: rawMatches,
          });
        }
        return;
      }

      const linkedIndex = labelToIndex.get(extractedLabel);
      if (linkedIndex === undefined) {
        return;
      }

      if (linkedIndex === index) {
        return;
      }

      linkedIndexes.add(linkedIndex);
      devLog("pont retained", {
        sourceIndex: index,
        sourceLabel,
        borneRaw: borne,
        borneResolved: extractedLabel,
        targetIndex: linkedIndex,
        targetLabel: getButtonLabel(linkedIndex),
      });
    });

    return Array.from({ length: BUTTON_COUNT }, (_, index) => ({
      isPontSource: isPontSource[index],
      isPontLinked: linkedIndexes.has(index),
      hasPontStyleInWaitingState: isPontSource[index] || linkedIndexes.has(index),
    }));
  } catch {
    return Array.from({ length: BUTTON_COUNT }, () => ({
      isPontSource: false,
      isPontLinked: false,
      hasPontStyleInWaitingState: false,
    }));
  }
};

export { extractSingleBorneNumber };
