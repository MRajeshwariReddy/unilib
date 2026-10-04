import type { ParsedBlock } from "./types";

export function parseText(buffer: Buffer): ParsedBlock[] {
  const content = buffer.toString("utf-8");
  if (!content.trim()) {
    return [];
  }

  // Split on two or more newlines (blank lines)
  const rawChunks = content.split(/\r?\n\s*\r?\n/);
  const blocks: ParsedBlock[] = [];

  for (const chunk of rawChunks) {
    // Replace single newlines inside a chunk with spaces
    const text = chunk.replace(/\r?\n/g, " ").trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
      });
    }
  }

  return blocks;
}
