export type DetectionResult = { matched: boolean; question?: string };

const CONFIRM_EN = /\b(confirm|proceed|shall I|should I|do you want|ok to|approve|go ahead|ready to)\b/i;
const CONFIRM_VI = /(xác nhận|có muốn|tiếp tục|đồng ý|được không|có nên|bạn muốn|có cần)/i;
const CHOICE_MARKER = /(^|\n)\s*(\d+[.)]|[A-D][.)]|[-*]\s)/gm;

const stripFences = (text: string): string =>
  text.replace(/```[\s\S]*?```/g, " ").replace(/`{1,2}[^`\n]+`{1,2}/g, " ");

const stripTrailingPunctuation = (text: string): string =>
  text.replace(/[\s"'’”)\]]+$/u, "");

export const detectConfirmationQuestion = (text: string): DetectionResult => {
  if (!text || !text.trim()) return { matched: false };

  const cleaned = stripFences(text).trim();
  if (!cleaned) return { matched: false };

  let paragraphs = cleaned.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) {
    paragraphs = cleaned.split(/\n/).map((p) => p.trim()).filter(Boolean);
  }
  const lastParagraph = paragraphs[paragraphs.length - 1];
  if (!lastParagraph) return { matched: false };

  // Check conditions against the full text so multi-paragraph messages
  // (question in first paragraph, choices in middle, instruction in last) are caught.
  const question = lastParagraph;

  const trimmedTail = stripTrailingPunctuation(lastParagraph);
  if (trimmedTail.endsWith("?") || trimmedTail.endsWith("？")) {
    return { matched: true, question };
  }

  // Any paragraph ends with "?"
  if (paragraphs.some((p) => stripTrailingPunctuation(p).endsWith("?") || stripTrailingPunctuation(p).endsWith("？"))) {
    return { matched: true, question };
  }

  if (CONFIRM_EN.test(cleaned) || CONFIRM_VI.test(cleaned)) {
    return { matched: true, question };
  }

  const choiceMatches = cleaned.match(CHOICE_MARKER);
  if (choiceMatches && choiceMatches.length >= 2) {
    return { matched: true, question };
  }

  return { matched: false };
};
