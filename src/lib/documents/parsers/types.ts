import type { BlockType } from "@/lib/types/database";

export interface ParsedBlock {
  type: BlockType;
  text: string;
  headingLevel?: number;
}

export interface NormalizedBlock {
  position: number;
  type: BlockType;
  text: string;
  headingLevel?: number;
}

export interface ParserResult {
  blocks: ParsedBlock[];
  errorCode?: string;
  errorMessage?: string;
}
