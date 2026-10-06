import type { SourceFormat } from "@/lib/types/database";
import type { NormalizedBlock } from "./types";
import { sniffFormat } from "../sniff";
import { parseText } from "./text";
import { parseMarkdown } from "./markdown";
import { parseDocx } from "./docx";
import { normalizeBlocks } from "./normalize";
import { LIMITS } from "@/lib/config/limits";

export interface ParseResultSuccess {
  success: true;
  blocks: NormalizedBlock[];
  blockCount: number;
  charCount: number;
}

export interface ParseResultFailure {
  success: false;
  errorCode: string;
  errorMessage: string;
}

export type ParseResult = ParseResultSuccess | ParseResultFailure;

export async function parseDocument(
  buffer: Buffer,
  format: SourceFormat
): Promise<ParseResult> {
  // 1. Check size limit
  if (buffer.length > LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      errorCode: "file_too_large",
      errorMessage: "The file is larger than 10 MB.",
    };
  }

  // 2. Sniff real file format
  const sniff = sniffFormat(buffer, format);
  if (!sniff.valid) {
    return {
      success: false,
      errorCode: sniff.errorCode || "unsupported_format",
      errorMessage:
        sniff.errorCode === "no_text_extracted"
          ? "No readable text was found in this file."
          : "This file type isn't supported. Upload DOCX, Markdown or TXT (convert PDFs first).",
    };
  }

  // 3. Extract raw blocks based on format
  let rawBlocks;
  try {
    if (format === "md") {
      rawBlocks = parseMarkdown(buffer);
    } else if (format === "txt") {
      rawBlocks = parseText(buffer);
    } else if (format === "docx") {
      rawBlocks = await parseDocx(buffer);
    } else {
      return {
        success: false,
        errorCode: "unsupported_format",
        errorMessage: "This file type isn't supported. Upload DOCX, Markdown or TXT (convert PDFs first).",
      };
    }
  } catch {
    return {
      success: false,
      errorCode: "corrupt_file",
      errorMessage: "We couldn't open this file. It may be damaged.",
    };
  }

  if (rawBlocks.length === 0) {
    return {
      success: false,
      errorCode: "no_text_extracted",
      errorMessage: "No readable text was found in this file.",
    };
  }

  // 4. Normalize blocks
  const normalized = normalizeBlocks(rawBlocks);

  if (normalized.length === 0) {
    return {
      success: false,
      errorCode: "no_text_extracted",
      errorMessage: "No readable text was found in this file.",
    };
  }

  // 5. Enforce document limits
  if (normalized.length > LIMITS.MAX_BLOCKS) {
    return {
      success: false,
      errorCode: "too_many_blocks",
      errorMessage: "This document has too many paragraphs for the MVP (limit: 3,000).",
    };
  }

  const charCount = normalized.reduce((sum, b) => sum + b.text.length, 0);

  if (charCount > LIMITS.MAX_EXTRACTED_CHARS) {
    return {
      success: false,
      errorCode: "too_long",
      errorMessage: "This document is too long for the MVP (limit: about 1.2M characters).",
    };
  }

  return {
    success: true,
    blocks: normalized,
    blockCount: normalized.length,
    charCount,
  };
}
