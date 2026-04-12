import type { ConnectionErrorCategory } from "../../shared/types";

export type NormalizedError = {
  category: NonNullable<ConnectionErrorCategory>;
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
  retryable?: boolean;
};

const hasString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const includesAny = (value: string, needles: string[]): boolean =>
  needles.some((needle) => value.includes(needle));

export const normalizeError = (error: unknown): NormalizedError => {
  if (error && typeof error === "object") {
    const anyError = error as {
      category?: ConnectionErrorCategory;
      message?: string;
      status?: number;
      code?: string;
      details?: unknown;
      errorCategory?: ConnectionErrorCategory;
    };

    const category = anyError.category ?? anyError.errorCategory;
    if (category) {
      return {
        category,
        message: anyError.message ?? "Unknown error",
        code: anyError.code,
        status: anyError.status,
        details: anyError.details,
        retryable: category === "transport" || category === "companion",
      };
    }
  }

  const message =
    (error instanceof Error && error.message) ||
    (hasString(error) ? error : "Unknown error");

  const lowered = message.toLowerCase();
  if (includesAny(lowered, ["permission", "host permission", "not allowed"])) {
    return { category: "permission", message, retryable: false };
  }
  if (includesAny(lowered, ["unauthorized", "forbidden", "auth", "401", "403"])) {
    return { category: "auth", message, retryable: false };
  }
  if (includesAny(lowered, ["native messaging", "companion", "connectnative"])) {
    return { category: "companion", message, retryable: true };
  }
  if (includesAny(lowered, ["tool", "schema", "validation"])) {
    return { category: "tool", message, retryable: false };
  }
  if (includesAny(lowered, ["network", "failed to fetch", "timeout"])) {
    return { category: "transport", message, retryable: true };
  }

  return { category: "transport", message, retryable: true };
};
