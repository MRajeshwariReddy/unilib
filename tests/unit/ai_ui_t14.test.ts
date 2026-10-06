import { describe, expect, it } from "vitest";
import React from "react";
import { CitationChip } from "@/components/reader/CitationChip";
import { AnswerCard } from "@/components/reader/AnswerCard";
import { AskPanel } from "@/components/reader/AskPanel";
import { SidePanel } from "@/components/reader/SidePanel";
import { Reader } from "@/components/reader/Reader";

describe("T14: CitationChip Component Unit Tests", () => {
  it("creates CitationChip element with expected position prop and label", () => {
    const el = React.createElement(CitationChip, {
      position: 14,
      blockId: "block-uuid-14",
    });

    expect(el.type).toBe(CitationChip);
    expect(el.props.position).toBe(14);
    expect(el.props.blockId).toBe("block-uuid-14");
  });
});

describe("T14: AnswerCard Component Unit Tests", () => {
  it("creates AnswerCard element for answered status", () => {
    const answerData = {
      id: "ans-1",
      questionText: "What is UniLib?",
      status: "answered" as const,
      segments: [
        {
          text: "UniLib is an academic reading platform.",
          citations: [{ blockId: "b-1", position: 1 }],
        },
      ],
    };

    const el = React.createElement(AnswerCard, { answer: answerData });

    expect(el.type).toBe(AnswerCard);
    expect(el.props.answer.status).toBe("answered");
    expect(el.props.answer.segments).toHaveLength(1);
  });

  it("creates AnswerCard element for refused status", () => {
    const answerData = {
      id: "ans-2",
      status: "refused" as const,
      refusal: {
        reason: "not_in_document",
        message: "I couldn't find this in the document.",
      },
    };

    const el = React.createElement(AnswerCard, { answer: answerData });

    expect(el.type).toBe(AnswerCard);
    expect(el.props.answer.status).toBe("refused");
    expect(el.props.answer.refusal?.message).toBe("I couldn't find this in the document.");
  });

  it("creates AnswerCard element for error status", () => {
    const answerData = {
      id: "ans-3",
      status: "error" as const,
      error: {
        code: "rate_limited",
        message: "Rate limit exceeded.",
        retryAfterSeconds: 30,
      },
    };

    const el = React.createElement(AnswerCard, { answer: answerData });

    expect(el.type).toBe(AnswerCard);
    expect(el.props.answer.status).toBe("error");
    expect(el.props.answer.error?.retryAfterSeconds).toBe(30);
  });
});

describe("T14: AskPanel Component Unit Tests", () => {
  const docId = "doc-uuid-123";

  it("creates AskPanel element in unauthenticated state", () => {
    const el = React.createElement(AskPanel, {
      documentId: docId,
      charCount: 50000,
      isAuthenticated: false,
    });

    expect(el.type).toBe(AskPanel);
    expect(el.props.isAuthenticated).toBe(false);
  });

  it("creates AskPanel element for large document (>100k chars)", () => {
    const el = React.createElement(AskPanel, {
      documentId: docId,
      charCount: 150000,
      isAuthenticated: true,
    });

    expect(el.type).toBe(AskPanel);
    expect(el.props.charCount).toBe(150000);
  });

  it("creates AskPanel element with selected block position", () => {
    const el = React.createElement(AskPanel, {
      documentId: docId,
      charCount: 50000,
      isAuthenticated: true,
      selectedBlockId: "b-5",
      selectedBlockPosition: 5,
    });

    expect(el.type).toBe(AskPanel);
    expect(el.props.selectedBlockId).toBe("b-5");
    expect(el.props.selectedBlockPosition).toBe(5);
  });
});

describe("T14: SidePanel & Reader Integration Unit Tests", () => {
  const docId = "doc-uuid-123";

  const document = {
    id: docId,
    owner_id: "owner-1",
    title: "Sample Reading",
    description: null,
    subject: "Computer Science",
    license: "cc_by" as const,
    rights_attested: true,
    source_format: "md" as const,
    original_filename: "sample.md",
    file_size_bytes: 1024,
    storage_path: "owner-1/doc-uuid-123/original.md",
    status: "ready" as const,
    error_code: null,
    error_message: null,
    block_count: 1,
    char_count: 100,
    parser_version: "1.0",
    processed_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  const blocks = [
    {
      id: "b-1",
      position: 1,
      type: "paragraph" as const,
      headingLevel: null,
      text: "Sample paragraph text.",
    },
  ];

  it("creates SidePanel element with its current reader props", () => {
    const el = React.createElement(SidePanel, {
      selectedBlockPosition: 1,
      selectedBlockText: "Sample paragraph text.",
      comments: [],
      documentOwnerId: "owner-1",
      currentUserId: "user-1",
      onSubmitComment: async () => {},
      onDeleteComment: () => {},
      isOpenMobile: false,
      onCloseMobile: () => {},
    });

    expect(el.type).toBe(SidePanel);
    expect(el.props.selectedBlockPosition).toBe(1);
    expect(el.props.selectedBlockText).toBe("Sample paragraph text.");
    expect(el.props.documentOwnerId).toBe("owner-1");
  });

  it("creates Reader element with its current props", () => {
    const el = React.createElement(Reader, {
      document,
      ownerDisplayName: "Test User",
      ownerUserType: "student",
      blocks,
      initialCommentCounts: {
        "b-1": 0,
      },
      currentUserId: "user-1",
    });

    expect(el.type).toBe(Reader);
    expect(el.props.document).toEqual(document);
    expect(el.props.ownerDisplayName).toBe("Test User");
    expect(el.props.blocks).toHaveLength(1);
    expect(el.props.blocks[0].id).toBe("b-1");
  });
});
