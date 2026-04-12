export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (!isPlainObject(value)) return false;
  for (const entry of Object.values(value)) {
    if (typeof entry !== "string") return false;
  }
  return true;
};

export const isStringArray = (value: unknown): value is string[] => {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => typeof entry === "string");
};

export const safeObjectEntries = (value: unknown): [string, unknown][] => {
  if (!isPlainObject(value)) return [];
  return Object.entries(value);
};
