import { describe, expect, it } from "vitest";
import {
  assembleFtsContext,
  getRetrievalContext,
  PresetUnavailableError,
} from "@/lib/ai/retrieval";
import { ContextBlock } from "@/lib/ai/types";

describe("T12: Retrieval Threshold & Mode Selection", () => {
  const docId = "doc-small-1";

  const sampleBlocks: ContextBlock[] = [
    { id: "b1", document_id: docId, position: 1, type: "heading", heading_level: 1, text: "Intro" },
    { id: "b2", document_id: docId, position: 2, type: "paragraph", heading_level: null, text: "Content 1" },
    { id: "b3", document_id: docId, position: 3, type: "paragraph", heading_level: null, text: "Content 2" },
  ];

  it("selects full-document mode for char_count <= 100,000", async () => {
    const res = await getRetrievalContext({
      documentId: docId,
      charCount: 50000,
      question: "What is the content?",
      fetchAllBlocks: async () => sampleBlocks,
    });

    expect(res.retrievalMode).toBe("full");
    expect(res.blocks).toHaveLength(3);
    expect(res.hasGapMarkers).toBe(false);
  });

  it("allows summarize preset in full-document mode", async () => {
    const res = await getRetrievalContext({
      documentId: docId,
      charCount: 80000,
      preset: "summarize",
      fetchAllBlocks: async () => sampleBlocks,
    });

    expect(res.retrievalMode).toBe("full");
    expect(res.blocks).toHaveLength(3);
  });

  it("throws PresetUnavailableError for summarize preset in large document (>100k chars)", async () => {
    await expect(
      getRetrievalContext({
        documentId: docId,
        charCount: 150000,
        preset: "summarize",
        fetchAllBlocks: async () => sampleBlocks,
      })
    ).rejects.toThrow(PresetUnavailableError);
  });
});

describe("T12: FTS Retrieval & Neighborhood Expansion", () => {
  const docId = "doc-large-1";

  // Create 20 blocks
  const blocksMap = new Map<number, ContextBlock>();
  const blocksList: ContextBlock[] = [];

  for (let i = 1; i <= 20; i++) {
    const b: ContextBlock = {
      id: `b-${i}`,
      document_id: docId,
      position: i,
      type: "paragraph",
      heading_level: null,
      text: `Paragraph position ${i} with detailed text about academic research.`,
    };
    blocksMap.set(i, b);
    blocksList.push(b);
  }

  it("expands FTS hits with neighbors pos ± 1 and inserts gap markers", () => {
    // Hits at position 5 and position 15
    const ftsHits = [
      { id: "b-5", position: 5, rank: 0.9 },
      { id: "b-15", position: 15, rank: 0.8 },
    ];

    const res = assembleFtsContext({
      documentId: docId,
      ftsHits,
      allBlocksMap: blocksMap,
    });

    expect(res.retrievalMode).toBe("fts");
    expect(res.noContextHit).toBe(false);
    // Position 5 neighborhood: 4, 5, 6
    // Position 15 neighborhood: 14, 15, 16
    expect(res.blocks.map((b) => b.position)).toEqual([4, 5, 6, 14, 15, 16]);
    expect(res.hasGapMarkers).toBe(true);

    const gapItem = res.blocksWithGaps.find((b) => b.isGap);
    expect(gapItem).toBeDefined();
    expect(gapItem?.text).toBe("[…]");
  });

  it("includes focus block neighborhood pos ± 3", () => {
    // No FTS hits, but focus block at position 10
    const res = assembleFtsContext({
      documentId: docId,
      ftsHits: [],
      allBlocksMap: blocksMap,
      focusBlockId: "b-10",
    });

    expect(res.noContextHit).toBe(false);
    // Focus 10 neighborhood: 7, 8, 9, 10, 11, 12, 13
    expect(res.blocks.map((b) => b.position)).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it("enforces document isolation (ignores blocks from another doc)", () => {
    const mixedMap = new Map<number, ContextBlock>(blocksMap);
    mixedMap.set(5, {
      id: "b-5-other",
      document_id: "other-doc",
      position: 5,
      type: "paragraph",
      heading_level: null,
      text: "Other document text",
    });

    const res = assembleFtsContext({
      documentId: docId,
      ftsHits: [{ id: "b-5-other", position: 5, rank: 0.9 }],
      allBlocksMap: mixedMap,
    });

    // Block 5 is excluded because document_id !== docId, but neighbors 4 and 6 (which belong to docId) remain
    expect(res.blocks.map((b) => b.id)).not.toContain("b-5-other");
  });

  it("trims context at 24k chars by dropping lowest-ranked hit neighborhood", () => {
    const largeBlocksMap = new Map<number, ContextBlock>();

    // 10 large blocks, each 5000 chars
    for (let i = 1; i <= 10; i++) {
      largeBlocksMap.set(i, {
        id: `large-b-${i}`,
        document_id: docId,
        position: i,
        type: "paragraph",
        heading_level: null,
        text: "x".repeat(5000),
      });
    }

    // Hit 1 at pos 2 (rank 0.9), Hit 2 at pos 8 (rank 0.3)
    const res = assembleFtsContext({
      documentId: docId,
      ftsHits: [
        { id: "large-b-2", position: 2, rank: 0.9 },
        { id: "large-b-8", position: 8, rank: 0.3 },
      ],
      allBlocksMap: largeBlocksMap,
      maxContextChars: 12000, // force capping
    });

    // Neighborhood 2: 1, 2, 3 (15,000 chars -> capped). So lowest rank 8 (7,8,9) dropped first.
    const posList = res.blocks.map((b) => b.position);
    expect(posList).not.toContain(8);
    const totalChars = res.blocks.reduce((acc, b) => acc + b.text.length, 0);
    expect(totalChars).toBeLessThanOrEqual(12000);
  });

  it("returns noContextHit = true when no FTS hits and no focus block", () => {
    const res = assembleFtsContext({
      documentId: docId,
      ftsHits: [],
      allBlocksMap: blocksMap,
    });

    expect(res.noContextHit).toBe(true);
    expect(res.blocks).toHaveLength(0);
  });
});
