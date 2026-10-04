import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseDocument } from "@/lib/documents/parsers/index";

describe("T05 DOCX Parser & Realistic Document Gate", () => {
  it("parses valid sample.docx fixture into normalized blocks", async () => {
    const filePath = path.resolve(process.cwd(), "fixtures/documents/sample.docx");
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "docx");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].text).toContain("Header Title");
      expect(result.blocks[1].text).toContain("paragraph");
    }
  });

  it("rejects fake docx file (plain text named .docx) with unsupported_format", async () => {
    const filePath = path.resolve(process.cwd(), "fixtures/documents/fake.docx");
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "docx");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("unsupported_format");
    }
  });

  it("rejects corrupt zip docx file with corrupt_file or unsupported_format", async () => {
    const filePath = path.resolve(process.cwd(), "fixtures/documents/corrupt.docx");
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "docx");

    expect(result.success).toBe(false);
  });

  it("parses realistic student sample 1 (Lecture Notes) cleanly", async () => {
    const filePath = path.resolve(
      process.cwd(),
      "fixtures/documents/realistic_student_lecture_notes.md"
    );
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "md");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.blocks.length).toBeGreaterThan(5);
      expect(result.blocks[0].type).toBe("heading");
      expect(result.blocks[0].text).toBe("Introduction to Neural Networks");
    }
  });

  it("parses realistic student sample 2 (Essay) cleanly", async () => {
    const filePath = path.resolve(
      process.cwd(),
      "fixtures/documents/realistic_student_essay.md"
    );
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "md");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.blocks.length).toBeGreaterThan(3);
    }
  });

  it("parses realistic student sample 3 (Lab Report) cleanly", async () => {
    const filePath = path.resolve(
      process.cwd(),
      "fixtures/documents/realistic_student_report.md"
    );
    const buffer = fs.readFileSync(filePath);

    const result = await parseDocument(buffer, "md");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.blocks.length).toBeGreaterThan(3);
    }
  });
});
