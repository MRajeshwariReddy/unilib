import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import type { ParsedBlock } from "./types";
import type { Root, Node, Parent, Heading, Table, TableRow } from "mdast";

export function parseMarkdown(buffer: Buffer): ParsedBlock[] {
  const content = buffer.toString("utf-8");
  if (!content.trim()) {
    return [];
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"]);

  const tree = processor.parse(content) as Root;
  const blocks: ParsedBlock[] = [];

  for (const node of tree.children) {
    extractNodeBlocks(node, blocks);
  }

  return blocks;
}

function extractNodeBlocks(node: Node, blocks: ParsedBlock[]) {
  if (node.type === "yaml" || node.type === "html" || node.type === "thematicBreak") {
    // Ignore frontmatter, raw HTML, thematic breaks
    return;
  }

  if (node.type === "heading") {
    const heading = node as Heading;
    const text = extractTextContent(heading).trim();
    if (text) {
      blocks.push({
        type: "heading",
        text,
        headingLevel: Math.min(Math.max(heading.depth, 1), 6),
      });
    }
    return;
  }

  if (node.type === "paragraph") {
    const text = extractTextContent(node).trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
      });
    }
    return;
  }

  if (node.type === "blockquote") {
    const parent = node as Parent;
    for (const child of parent.children) {
      const text = extractTextContent(child).trim();
      if (text) {
        blocks.push({
          type: "quote",
          text,
        });
      }
    }
    return;
  }

  if (node.type === "code") {
    const codeNode = node as { value?: string };
    const text = codeNode.value || "";
    if (text.trim()) {
      blocks.push({
        type: "code",
        text,
      });
    }
    return;
  }

  if (node.type === "list") {
    const parent = node as Parent;
    for (const listItem of parent.children) {
      extractListItemBlocks(listItem, blocks);
    }
    return;
  }

  if (node.type === "table") {
    const table = node as Table;
    for (const row of table.children) {
      const rowText = extractTableRowText(row);
      if (rowText.trim()) {
        blocks.push({
          type: "table_row",
          text: rowText,
        });
      }
    }
    return;
  }
}

function extractListItemBlocks(node: Node, blocks: ParsedBlock[]) {
  if (node.type === "listItem") {
    const parent = node as Parent;
    for (const child of parent.children) {
      if (child.type === "paragraph") {
        const text = extractTextContent(child).trim();
        if (text) {
          blocks.push({
            type: "list_item",
            text,
          });
        }
      } else if (child.type === "list") {
        const listParent = child as Parent;
        for (const subItem of listParent.children) {
          extractListItemBlocks(subItem, blocks);
        }
      } else {
        const text = extractTextContent(child).trim();
        if (text) {
          blocks.push({
            type: "list_item",
            text,
          });
        }
      }
    }
  }
}

function extractTableRowText(row: TableRow): string {
  const cells: string[] = [];
  for (const cell of row.children) {
    cells.push(extractTextContent(cell).trim());
  }
  return cells.join(" | ");
}

function extractTextContent(node: Node): string {
  if ("value" in node && typeof (node as { value: string }).value === "string") {
    return (node as { value: string }).value;
  }

  if ("children" in node && Array.isArray((node as Parent).children)) {
    return (node as Parent).children.map(extractTextContent).join("");
  }

  return "";
}
