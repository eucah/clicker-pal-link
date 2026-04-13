import { ButtonInfo, BUTTON_COUNT, createDefaultInfos, getButtonLabel, normalizeButtonInfo } from "@/types/project";

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

const extractSingleBorneNumber = (value: string): number | null => {
  const normalized = normalizeText(value);
  const matches = normalized.match(/\b(\d{1,3})\b/g) ?? [];

  if (matches.length !== 1) {
    return null;
  }

  const parsed = Number.parseInt(matches[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const countBorneNumbers = (value: string): number =>
  (normalizeText(value).match(/\b\d{1,3}\b/g) ?? []).length;

const createLabelToIndexMap = (): Map<number, number> => {
  const map = new Map<number, number>();
  for (let index = 0; index < BUTTON_COUNT; index += 1) {
    map.set(getButtonLabel(index), index);
  }
  return map;
};

export const resolvePontVisualStates = (buttonInfos: ButtonInfo[]): PontVisualState[] => {
  const isDev = import.meta.env.DEV;
  const fallbackInfo = createDefaultInfos()[0];
  const safeButtonInfos = (Array.isArray(buttonInfos) ? buttonInfos : [])
    .slice(0, BUTTON_COUNT)
    .map((info) => normalizeButtonInfo(info));

  while (safeButtonInfos.length < BUTTON_COUNT) {
    safeButtonInfos.push({ ...fallbackInfo });
  }

  const labelToIndex = createLabelToIndexMap();
  const pontSources = new Set<number>();
  const pontLinkedTargets = new Set<number>();

  safeButtonInfos.forEach((info, index) => {
    if (!containsPontKeyword(info.fils ?? "")) {
      return;
    }

    pontSources.add(index);

    const rawBorne = info.borne ?? "";
    const borneNumber = extractSingleBorneNumber(rawBorne);
    if (borneNumber === null) {
      if (isDev && countBorneNumbers(rawBorne) > 1) {
        console.debug("[pont-utils] Pont ambigu ignoré", {
          sourceIndex: index,
          sourceLabel: getButtonLabel(index),
          borneRaw: rawBorne,
        });
      }
      return;
    }

    const linkedIndex = labelToIndex.get(borneNumber);
    if (linkedIndex === undefined || linkedIndex === index) {
      return;
    }

    pontLinkedTargets.add(linkedIndex);

    if (isDev) {
      console.debug("[pont-utils] Pont visuel retenu", {
        sourceIndex: index,
        sourceLabel: getButtonLabel(index),
        borneRaw: rawBorne,
        borneResolved: borneNumber,
        targetIndex: linkedIndex,
        targetLabel: getButtonLabel(linkedIndex),
      });
    }
  });

  return safeButtonInfos.map((_, index) => {
    const isPontSource = pontSources.has(index);
    const isPontLinked = pontLinkedTargets.has(index);
    return {
      isPontSource,
      isPontLinked,
      hasPontStyleInWaitingState: isPontSource || isPontLinked,
    };
  });
};
