import "server-only";
import { AIOutputRaw } from "./schema";
import { ContextBlock, ValidatedSegment, ValidationResult } from "./types";

/**
 * Normalizes text for substring checking:
 * Unescapes HTML entities, applies NFKC normalization, converts to lowercase,
 * replaces non-alphanumeric unicode runs with a single space, and trims.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  const unescaped = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return unescaped
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export interface ValidateCitationsOptions {
  documentId: string;
  contextBlocks: ContextBlock[];
}

export function validateCitationsAndEvidence(
  aiOutput: AIOutputRaw,
  options: ValidateCitationsOptions
): ValidationResult {
  if (!aiOutput.answerable) {
    return {
      status: "refused",
      refusalReason: aiOutput.refusal_reason ?? "not_in_document",
      segmentsDropped: 0,
    };
  }

  const { documentId, contextBlocks } = options;

  // Map position -> ContextBlock (must belong to current document)
  const blockMap = new Map<number, ContextBlock>();
  for (const block of contextBlocks) {
    if (block.document_id === documentId) {
      blockMap.set(block.position, block);
    }
  }

  const originalCount = aiOutput.segments.length;
  const validatedSegments: ValidatedSegment[] = [];

  for (const seg of aiOutput.segments) {
    // A. Filter citations to valid existing block positions in current document
    const validPositions = seg.citations.filter((pos) => blockMap.has(pos));

    // B. At least one citation must remain
    if (validPositions.length === 0) {
      continue;
    }

    // C. Evidence Quote Check
    const normQuote = normalizeText(seg.evidence_quote);
    const quoteWords = normQuote ? normQuote.split(/\s+/).filter(Boolean) : [];

    // Quote must be at least 4 words
    if (quoteWords.length < 4) {
      continue;
    }

    // Must be a substring of at least one remaining cited block's text
    let evidenceMatches = false;
    for (const pos of validPositions) {
      const block = blockMap.get(pos);
      if (block) {
        const normBlockText = normalizeText(block.text);
        if (normBlockText.includes(normQuote)) {
          evidenceMatches = true;
          break;
        }
      }
    }

    if (!evidenceMatches) {
      continue;
    }

    // D. Strip [n] patterns from segment text
    const cleanedText = seg.text
      .replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanedText) {
      continue;
    }

    // Deduplicate valid positions and sort
    const uniquePositions = Array.from(new Set(validPositions)).sort((a, b) => a - b);

    const resolvedCitations = uniquePositions.map((pos) => {
      const block = blockMap.get(pos)!;
      return {
        blockId: block.id,
        position: block.position,
      };
    });

    validatedSegments.push({
      text: cleanedText,
      citations: resolvedCitations,
    });
  }

  if (validatedSegments.length === 0) {
    return {
      status: "refused",
      refusalReason: "unverifiable",
      segmentsDropped: originalCount,
    };
  }

  return {
    status: "answered",
    segments: validatedSegments,
    segmentsDropped: originalCount - validatedSegments.length,
  };
}
