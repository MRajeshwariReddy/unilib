import "server-only";
import { ContextBlock } from "./types";

export const AI_FULL_CONTEXT_MAX_CHARS = 100000;
export const AI_RETRIEVAL_TOP_K = 8;
export const AI_MAX_CONTEXT_CHARS = 24000;

export class PresetUnavailableError extends Error {
  code = "preset_unavailable";
  constructor(
    message = "Summaries are available for shorter documents. Ask a specific question instead."
  ) {
    super(message);
    this.name = "PresetUnavailableError";
  }
}

export interface RetrievalResult {
  retrievalMode: "full" | "fts";
  blocks: ContextBlock[];
  hasGapMarkers: boolean;
  blocksWithGaps: Array<ContextBlock & { isGap?: boolean }>;
  noContextHit: boolean;
}

export interface FtsHit {
  id: string;
  position: number;
  rank: number;
}

export interface AssembleFtsParams {
  documentId: string;
  ftsHits: FtsHit[];
  allBlocksMap: Map<number, ContextBlock>;
  focusBlockId?: string | null;
  maxContextChars?: number;
}

/**
 * Pure function to assemble FTS context given search hits, full block map, and optional focus block.
 */
export function assembleFtsContext(params: AssembleFtsParams): RetrievalResult {
  const {
    documentId,
    ftsHits,
    allBlocksMap,
    focusBlockId,
    maxContextChars = AI_MAX_CONTEXT_CHARS,
  } = params;

  // 1. Find focus block position and its neighborhood (pos ± 3)
  const focusNeighborhoodPositions = new Set<number>();
  let focusBlockPos: number | null = null;

  if (focusBlockId) {
    for (const block of allBlocksMap.values()) {
      if (block.id === focusBlockId && block.document_id === documentId) {
        focusBlockPos = block.position;
        break;
      }
    }
    if (focusBlockPos !== null) {
      for (let p = focusBlockPos - 3; p <= focusBlockPos + 3; p++) {
        if (allBlocksMap.has(p) && allBlocksMap.get(p)!.document_id === documentId) {
          focusNeighborhoodPositions.add(p);
        }
      }
    }
  }

  // If no FTS hits and no focus block -> no context hit
  if (ftsHits.length === 0 && focusNeighborhoodPositions.size === 0) {
    return {
      retrievalMode: "fts",
      blocks: [],
      hasGapMarkers: false,
      blocksWithGaps: [],
      noContextHit: true,
    };
  }

  // 2. Build hit neighborhoods ordered by rank (lowest rank last)
  // ftsHits should be sorted by rank descending (top hits first)
  const hitNeighborhoods: Array<{ hit: FtsHit; positions: number[] }> = [];

  for (const hit of ftsHits) {
    const neighborhood: number[] = [];
    for (let p = hit.position - 1; p <= hit.position + 1; p++) {
      if (allBlocksMap.has(p) && allBlocksMap.get(p)!.document_id === documentId) {
        neighborhood.push(p);
      }
    }
    if (neighborhood.length > 0) {
      hitNeighborhoods.push({ hit, positions: neighborhood });
    }
  }

  // Function to calculate total char length for a set of positions
  const calculateTotalChars = (positions: Set<number>): number => {
    let total = 0;
    for (const pos of positions) {
      const block = allBlocksMap.get(pos);
      if (block) total += block.text.length;
    }
    return total;
  };

  // Start with focus neighborhood + all hit neighborhoods
  let activeHitCount = hitNeighborhoods.length;

  while (activeHitCount >= 0) {
    const candidatePositions = new Set<number>(focusNeighborhoodPositions);
    for (let i = 0; i < activeHitCount; i++) {
      for (const pos of hitNeighborhoods[i].positions) {
        candidatePositions.add(pos);
      }
    }

    const totalChars = calculateTotalChars(candidatePositions);
    if (totalChars <= maxContextChars || activeHitCount === 0) {
      // Selected candidate positions fit within cap
      const sortedPositions = Array.from(candidatePositions).sort((a, b) => a - b);
      const selectedBlocks = sortedPositions.map((p) => allBlocksMap.get(p)!);

      // Build blocksWithGaps inserting gap markers between non-contiguous blocks
      const blocksWithGaps: Array<ContextBlock & { isGap?: boolean }> = [];
      let hasGap = false;

      for (let i = 0; i < selectedBlocks.length; i++) {
        const curr = selectedBlocks[i];
        if (i > 0) {
          const prev = selectedBlocks[i - 1];
          if (curr.position !== prev.position + 1) {
            hasGap = true;
            blocksWithGaps.push({
              id: `gap-${prev.position}-${curr.position}`,
              document_id: documentId,
              position: -1,
              type: "gap",
              heading_level: null,
              text: "[…]",
              isGap: true,
            });
          }
        }
        blocksWithGaps.push(curr);
      }

      return {
        retrievalMode: "fts",
        blocks: selectedBlocks,
        hasGapMarkers: hasGap,
        blocksWithGaps,
        noContextHit: selectedBlocks.length === 0,
      };
    }

    // Trim lowest-ranked hit neighborhood
    activeHitCount--;
  }

  // Fallback empty
  return {
    retrievalMode: "fts",
    blocks: [],
    hasGapMarkers: false,
    blocksWithGaps: [],
    noContextHit: true,
  };
}

export interface GetRetrievalContextOptions {
  documentId: string;
  charCount: number;
  question?: string | null;
  preset?: "summarize" | null;
  focusBlockId?: string | null;
  fetchAllBlocks: (docId: string) => Promise<ContextBlock[]>;
  searchFtsBlocks?: (docId: string, query: string, topK: number) => Promise<FtsHit[]>;
}

export async function getRetrievalContext(
  options: GetRetrievalContextOptions
): Promise<RetrievalResult> {
  const {
    documentId,
    charCount,
    question,
    preset,
    focusBlockId,
    fetchAllBlocks,
    searchFtsBlocks,
  } = options;

  // 1. Full-document mode
  if (charCount <= AI_FULL_CONTEXT_MAX_CHARS) {
    const blocks = await fetchAllBlocks(documentId);
    const sortedBlocks = blocks
      .filter((b) => b.document_id === documentId)
      .sort((a, b) => a.position - b.position);

    return {
      retrievalMode: "full",
      blocks: sortedBlocks,
      hasGapMarkers: false,
      blocksWithGaps: sortedBlocks,
      noContextHit: sortedBlocks.length === 0,
    };
  }

  // 2. Large document / FTS mode
  if (preset === "summarize") {
    throw new PresetUnavailableError();
  }

  const queryText = question?.trim() || "";
  let ftsHits: FtsHit[] = [];

  if (queryText && searchFtsBlocks) {
    ftsHits = await searchFtsBlocks(documentId, queryText, AI_RETRIEVAL_TOP_K);
  }

  const allBlocks = await fetchAllBlocks(documentId);
  const allBlocksMap = new Map<number, ContextBlock>();
  for (const block of allBlocks) {
    if (block.document_id === documentId) {
      allBlocksMap.set(block.position, block);
    }
  }

  return assembleFtsContext({
    documentId,
    ftsHits,
    allBlocksMap,
    focusBlockId,
  });
}
