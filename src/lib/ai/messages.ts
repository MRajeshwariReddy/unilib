import "server-only";

export const REFUSAL_MESSAGES = {
  not_in_document:
    "I couldn't find this in the document, so I can't answer it. UniLib AI only answers from the text you're reading.",
  no_context:
    "I couldn't find this in the document, so I can't answer it. UniLib AI only answers from the text you're reading.",
  off_topic: "I can only help with questions about this document.",
  unverifiable:
    "I couldn't produce an answer I could back up with the document. Try rephrasing or asking about a specific section.",
} as const;

export type RefusalReason = keyof typeof REFUSAL_MESSAGES;

export function getRefusalMessage(reason: RefusalReason): string {
  return REFUSAL_MESSAGES[reason] || REFUSAL_MESSAGES.not_in_document;
}
