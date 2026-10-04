import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseDocument } from "@/lib/documents/parsers/index";
import { normalizeBlocks } from "@/lib/documents/parsers/normalize";
import { sniffFormat } from "@/lib/documents/sniff";
import type { ParsedBlock } from "@/lib/documents/parsers/types";

describe("T04 Parsing Core & Normalization", () => {
  it("normalizes unicode, control chars, whitespace and assigns positions 1..N", () => {
    const rawBlocks: ParsedBlock[] = [
      { type: "heading", text: "  \uFEFFHeader \u00A0 Title\u200B  ", headingLevel: 1 },
      { type: "paragraph", text: "  Some \t text  with\n extra   spaces.  " },
      { type: "paragraph", text: "   " }, // Empty, should be dropped
      { type: "code", text: "def foo():\n    return 42\n" },
    ];

    const normalized = normalizeBlocks(rawBlocks);

    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toEqual({
      position: 1,
      type: "heading",
      text: "Header Title",
      headingLevel: 1,
    });
    expect(normalized[1]).toEqual({
      position: 2,
      type: "paragraph",
      text: "Some text with extra spaces.",
      headingLevel: undefined,
    });
    expect(normalized[2]).toEqual({
      position: 3,
      type: "code",
      text: "def foo():\n    return 42",
      headingLevel: undefined,
    });
  });

  it("splits blocks longer than 8,000 characters at sentence boundaries", () => {
    const longSentence = "This is a long sentence in an academic text. ";
    const repeated = longSentence.repeat(250); // ~7500 chars

    const rawBlocks: ParsedBlock[] = [
      { type: "paragraph", text: repeated + " " + repeated } // ~15,000 chars
    ];

    const normalized = normalizeBlocks(rawBlocks);

    expect(normalized.length).toBeGreaterThan(1);
    for (const b of normalized) {
      expect(b.text.length).toBeLessThanOrEqual(8000);
      expect(b.position).toBeGreaterThanOrEqual(1);
    }
  });

  it("parses Markdown fixture file with frontmatter, headings, lists, quote, code, and table", async () => {
    const filePath = path.resolve(process.cwd(), "fixtures/documents/sample.md");
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "md");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].type).toBe("heading");
      expect(result.blocks[0].text).toBe("Introduction to Algorithms");

      const blockTypes = result.blocks.map((b) => b.type);
      expect(blockTypes).toContain("heading");
      expect(blockTypes).toContain("paragraph");
      expect(blockTypes).toContain("list_item");
      expect(blockTypes).toContain("quote");
      expect(blockTypes).toContain("code");
      expect(blockTypes).toContain("table_row");
    }
  });

  it("parses TXT fixture file splitting on blank lines", async () => {
    const filePath = path.resolve(process.cwd(), "fixtures/documents/sample.txt");
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "txt");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].text).toBe("Introduction to Operating Systems");
      expect(result.blocks[1].text).toBe(
        "An operating system acts as an intermediary between user and hardware."
      );
    }
  });

  it("handles empty document fixtures with no_text_extracted error", async () => {
    const filePath = path.resolve(process.cwd(), "fixtures/documents/empty.md");
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "md");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("no_text_extracted");
    }
  });

  it("sniffs binary/corrupt content with NUL bytes as unsupported_format for MD/TXT", () => {
    const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);
    const sniffResult = sniffFormat(binaryBuffer, "md");

    expect(sniffResult.valid).toBe(false);
    expect(sniffResult.errorCode).toBe("unsupported_format");
  });
});
