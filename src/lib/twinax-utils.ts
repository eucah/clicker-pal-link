export const TWINAX_STATE = 4;
export const TWINAX_LABEL = "Twinax";

export const isTwinaxWire = (wire: unknown): boolean => {
  if (wire === null || wire === undefined) return false;
  return String(wire).trimStart().startsWith("#");
};
