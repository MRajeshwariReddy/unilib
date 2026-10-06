import type { ParsedBlock, NormalizedBlock } from "./types";
import { LIMITS } from "@/lib/config/limits";

/**
 * Normalizes an array of raw extracted ParsedBlocks according to Section 8.5:
 * 1. Unicode NFC
 * 2. Replace NBSP/zero-width/BOM and control characters
 * 3. Collapse whitespace runs to one space (not in code); trim
 * 4. Drop blocks with no letters or digits
 * 5. Split any block > 8,000 chars at sentence boundaries into paragraph blocks
 * 6. Assign position 1..N
 */
export function normalizeBlocks(rawBlocks: ParsedBlock[]): NormalizedBlock[] {
  const processedBlocks: ParsedBlock[] = [];

  for (const block of rawBlocks) {
    let text = block.text.normalize("NFC");

    // Remove BOM, zero-width spaces/joiners, NBSP
    text = text
      .replace(/[\uFEFF\u200B\u200C\u200D]/g, "")
      .replace(/\u00A0/g, " ");

    if (block.type === "code") {
      // Retain newlines for code blocks, remove other control chars
      text = text.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
    } else {
      // Remove all control characters
      text = text.replace(/[\x00-\x1F\x7F]/g, " ");
      // Collapse whitespace runs
      text = text.replace(/\s+/g, " ").trim();
    }

    // Drop blocks with no letters or digits
    if (!/\p{L}|\p{N}/u.test(text)) {
      continue;
    }

    // Split blocks > 8,000 characters
    if (text.length > LIMITS.MAX_CHARS_PER_BLOCK) {
      const chunks = splitLongText(text, LIMITS.MAX_CHARS_PER_BLOCK);
      for (const chunk of chunks) {
        processedBlocks.push({
          type: "paragraph",
          text: chunk,
        });
      }
    } else {
      processedBlocks.push({
        type: block.type,
        text,
        headingLevel: block.headingLevel,
      });
    }
  }

  // Assign position 1..N
  return processedBlocks.map((b, index) => ({
    position: index + 1,
    type: b.type,
    text: b.text,
    headingLevel: b.headingLevel,
  }));
}

/**
 * Splits text exceeding maxChars into smaller sentence-aligned chunks <= maxChars.
 */
function splitLongText(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    // Look for sentence boundary before maxChars
    const targetSlice = remaining.slice(0, maxChars);
    let splitIdx = -1;

    // Search for last sentence end (. ! ?) followed by whitespace
    const match = targetSlice.match(/.*[.!?](\s+|$)/s);
    if (match && match[0].length > maxChars * 0.2) {
      splitIdx = match[0].length;
    }

    if (splitIdx <= 0) {
      // Fallback: search for last space before maxChars
      splitIdx = targetSlice.lastIndexOf(" ");
    }

    if (splitIdx <= 0) {
      // Fallback: hard split at maxChars
      splitIdx = maxChars;
    }

    const chunk = remaining.slice(0, splitIdx).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(splitIdx).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}
