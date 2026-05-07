import { ButtonInfo } from "@/types/project";

export const TWINAX_STATE = 4;
export const TWINAX_LABEL = "Twinax";

export const TWINAX_PAIR_COLOR_CLASSES = [
  "bg-yellow-200 text-yellow-950 border-yellow-300 dark:bg-yellow-300 dark:text-yellow-950 dark:border-yellow-400",
  "bg-green-200 text-green-950 border-green-300 dark:bg-green-300 dark:text-green-950 dark:border-green-400",
  "bg-red-200 text-red-950 border-red-300 dark:bg-red-300 dark:text-red-950 dark:border-red-400",
  "bg-blue-200 text-blue-950 border-blue-300 dark:bg-blue-300 dark:text-blue-950 dark:border-blue-400",
] as const;

export const containsTwinKeyword = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes("twin");
};

export const isTwinaxRow = (row: Partial<ButtonInfo>): boolean =>
  containsTwinKeyword(row.fils) || containsTwinKeyword(row.borne) || containsTwinKeyword(row.bornier) || containsTwinKeyword(row.cfCm);

export const getTwinaxPairKey = (row: Partial<ButtonInfo>, rowIndex: number): string => {
  const filsKey = String(row.fils ?? "").trim().toLowerCase();
  if (filsKey && filsKey !== "-") return filsKey;
  return `row-${rowIndex}`;
};

export const buildTwinaxPairColorMap = (rows: ButtonInfo[]): Map<string, (typeof TWINAX_PAIR_COLOR_CLASSES)[number]> => {
  const map = new Map<string, (typeof TWINAX_PAIR_COLOR_CLASSES)[number]>();
  let pairIndex = 0;

  rows.forEach((row, rowIndex) => {
    if (!isTwinaxRow(row)) return;
    const key = getTwinaxPairKey(row, rowIndex);
    if (!map.has(key)) {
      map.set(key, TWINAX_PAIR_COLOR_CLASSES[pairIndex % TWINAX_PAIR_COLOR_CLASSES.length]);
      pairIndex += 1;
    }
  });

  return map;
};

export const getTwinaxColorForRow = (row: Partial<ButtonInfo>, rowIndex: number, colorMap: Map<string, (typeof TWINAX_PAIR_COLOR_CLASSES)[number]>): string => {
  if (!isTwinaxRow(row)) return "";
  return colorMap.get(getTwinaxPairKey(row, rowIndex)) ?? TWINAX_PAIR_COLOR_CLASSES[0];
};
