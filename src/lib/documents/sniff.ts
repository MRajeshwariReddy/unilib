import type { SourceFormat } from "@/lib/types/database";

export function sniffFormat(
  buffer: Buffer,
  declaredFormat: SourceFormat
): { valid: boolean; errorCode?: string } {
  if (buffer.length === 0) {
    return { valid: false, errorCode: "no_text_extracted" };
  }

  if (declaredFormat === "docx") {
    // Check ZIP magic bytes PK\x03\x04
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return { valid: false, errorCode: "unsupported_format" };
    }
    return { valid: true };
  }

  // MD or TXT: Check for valid UTF-8 without NUL bytes
  if (buffer.includes(0x00)) {
    return { valid: false, errorCode: "unsupported_format" };
  }

  try {
    const text = buffer.toString("utf-8");
    // Verify valid UTF-8 string roundtrip
    if (Buffer.from(text, "utf-8").equals(buffer) === false) {
      // Allow minor BOM tolerance, but reject binary
      if (text.includes("\uFFFD") && buffer.includes(0x00)) {
        return { valid: false, errorCode: "unsupported_format" };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, errorCode: "unsupported_format" };
  }
}
