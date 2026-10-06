export const ERROR_MESSAGES: Record<string, string> = {
  unsupported_format:
    "This file type isn't supported. Upload DOCX, Markdown or TXT (convert PDFs first).",
  file_too_large: "The file is larger than 10 MB.",
  corrupt_file: "We couldn't open this file. It may be damaged.",
  no_text_extracted: "No readable text was found in this file.",
  too_long:
    "This document is too long for the MVP (limit: about 1.2M characters).",
  too_many_blocks:
    "This document has too many paragraphs for the MVP (limit: 3,000).",
  storage_error: "We couldn't read the uploaded file. Please try again.",
  timeout: "Processing took too long. Try a smaller file.",
  internal: "Something went wrong while processing. Please retry.",
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.internal;
}
