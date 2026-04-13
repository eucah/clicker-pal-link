import { ButtonInfo, BUTTON_COUNT, getButtonLabel } from "@/types/project";

export interface PontVisualState {
  isPontSource: boolean;
  isPontLinked: boolean;
  hasPontStyleInWaitingState: boolean;
}

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const containsPontKeyword = (value: string): boolean => /\bpont\b/i.test(normalizeText(value));

const extractBorneNumber = (value: string): number | null => {
  const match = normalizeText(value).match(/\b(\d{1,3})\b/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const createLabelToIndexMap = (): Map<number, number> => {
  const map = new Map<number, number>();
  for (let index = 0; index < BUTTON_COUNT; index += 1) {
    map.set(getButtonLabel(index), index);
  }
  return map;
};

export const resolvePontVisualStates = (buttonInfos: ButtonInfo[]): PontVisualState[] => {
  const labelToIndex = createLabelToIndexMap();
  const pontSources = new Set<number>();
  const pontLinkedTargets = new Set<number>();

  buttonInfos.forEach((info, index) => {
    if (!containsPontKeyword(info.fils ?? "")) {
      return;
    }

    pontSources.add(index);

    const borneNumber = extractBorneNumber(info.borne ?? "");
    if (borneNumber === null) {
      return;
    }

    const linkedIndex = labelToIndex.get(borneNumber);
    if (linkedIndex !== undefined) {
      pontLinkedTargets.add(linkedIndex);
    }
  });

  return buttonInfos.map((_, index) => {
    const isPontSource = pontSources.has(index);
    const isPontLinked = pontLinkedTargets.has(index);
    return {
      isPontSource,
      isPontLinked,
      hasPontStyleInWaitingState: isPontSource || isPontLinked,
    };
  });
};
