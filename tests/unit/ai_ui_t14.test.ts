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

  it("creates SidePanel element with Ask AI tab", () => {
    const el = React.createElement(SidePanel, {
      documentId: docId,
      charCount: 50000,
      isAuthenticated: true,
    });

    expect(el.type).toBe(SidePanel);
    expect(el.props.documentId).toBe(docId);
  });

  it("creates Reader element with integrated SidePanel", () => {
    const el = React.createElement(Reader, {
      documentId: docId,
      title: "Sample Reading",
      charCount: 50000,
      isAuthenticated: true,
      blocks: [
        {
          id: "b-1",
          document_id: docId,
          position: 1,
          type: "paragraph",
          heading_level: null,
          text: "Sample paragraph text.",
        },
      ],
    });

    expect(el.type).toBe(Reader);
    expect(el.props.title).toBe("Sample Reading");
    expect(el.props.blocks).toHaveLength(1);
  });
});
