import mammoth from "mammoth";
import { parse as parseHtml, HTMLElement } from "node-html-parser";
import type { ParsedBlock } from "./types";

export async function parseDocx(buffer: Buffer): Promise<ParsedBlock[]> {
  // Convert DOCX to HTML via Mammoth
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  if (!html.trim()) {
    return [];
  }

  const root = parseHtml(html);
  const blocks: ParsedBlock[] = [];

  for (const child of root.childNodes) {
    if (child instanceof HTMLElement) {
      extractHtmlNodeBlocks(child, blocks);
    }
  }

  return blocks;
}

function extractHtmlNodeBlocks(element: HTMLElement, blocks: ParsedBlock[]) {
  const tagName = element.tagName ? element.tagName.toLowerCase() : "";

  // Headings h1..h6
  if (/^h[1-6]$/.test(tagName)) {
    const level = parseInt(tagName.charAt(1), 10);
    const text = element.textContent.trim();
    if (text) {
      blocks.push({
        type: "heading",
        text,
        headingLevel: level,
      });
    }
    return;
  }

  // Paragraphs
  if (tagName === "p") {
    const text = element.textContent.trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
      });
    }
    return;
  }

  // Lists (ul, ol) -> items li
  if (tagName === "ul" || tagName === "ol") {
    const listItems = element.querySelectorAll("li");
    for (const li of listItems) {
      const text = li.textContent.trim();
      if (text) {
        blocks.push({
          type: "list_item",
          text,
        });
      }
    }
    return;
  }

  // List item (standalone)
  if (tagName === "li") {
    const text = element.textContent.trim();
    if (text) {
      blocks.push({
        type: "list_item",
        text,
      });
    }
    return;
  }

  // Blockquote
  if (tagName === "blockquote") {
    const text = element.textContent.trim();
    if (text) {
      blocks.push({
        type: "quote",
        text,
      });
    }
    return;
  }

  // Pre / Code
  if (tagName === "pre" || tagName === "code") {
    const text = element.textContent.trim();
    if (text) {
      blocks.push({
        type: "code",
        text,
      });
    }
    return;
  }

  // Table
  if (tagName === "table") {
    const rows = element.querySelectorAll("tr");
    for (const tr of rows) {
      const cells = tr.querySelectorAll("th, td");
      const cellTexts: string[] = [];
      for (const cell of cells) {
        cellTexts.push(cell.textContent.trim());
      }
      const rowText = cellTexts.join(" | ").trim();
      if (rowText) {
        blocks.push({
          type: "table_row",
          text: rowText,
        });
      }
    }
    return;
  }

  // Default fallback for container elements (div, section, body, etc.)
  for (const child of element.childNodes) {
    if (child instanceof HTMLElement) {
      extractHtmlNodeBlocks(child, blocks);
    }
  }
}
