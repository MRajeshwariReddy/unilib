"use client";

import React from "react";
import { CitationChip } from "./CitationChip";

export interface ResolvedCitation {
  blockId: string;
  position: number;
}

export interface ValidatedSegmentUI {
  text: string;
  citations: ResolvedCitation[];
}

export interface AnswerData {
  id: string;
  questionText?: string;
  status: "answered" | "refused" | "error";
  segments?: ValidatedSegmentUI[];
  refusal?: {
    reason: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    retryAfterSeconds?: number;
  };
  meta?: {
    retrievalMode: string;
    contextBlocks: number;
    segmentsDropped: number;
  };
}

export interface AnswerCardProps {
  answer: AnswerData;
  onCitationClick?: (blockId: string, position: number) => void;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({ answer, onCitationClick }) => {
  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {answer.questionText && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Q: {answer.questionText}
        </div>
      )}

      {answer.status === "answered" && answer.segments && (
        <div className="space-y-3">
          {answer.segments.map((segment, idx) => (
            <p key={idx} className="text-sm leading-relaxed text-gray-800">
              {segment.text}
              {segment.citations.map((cit) => (
                <CitationChip
                  key={cit.blockId}
                  position={cit.position}
                  blockId={cit.blockId}
                  onCitationClick={onCitationClick}
                />
              ))}
            </p>
          ))}

          {answer.meta && answer.meta.segmentsDropped > 0 && (
            <p className="mt-2 text-xs text-amber-700 italic">
              Note: Some statements couldn&apos;t be verified against the document and were removed.
            </p>
          )}

          <div className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
            Answers are generated strictly from this document. Check cited paragraphs.
          </div>
        </div>
      )}

      {answer.status === "refused" && answer.refusal && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
          <p className="font-medium">Notice</p>
          <p className="mt-1">{answer.refusal.message}</p>
        </div>
      )}

      {answer.status === "error" && answer.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          <p className="font-semibold">Unable to complete request</p>
          <p className="mt-1">{answer.error.message}</p>
          {answer.error.retryAfterSeconds && (
            <p className="mt-1 text-xs text-red-600 font-mono">
              Retry after {answer.error.retryAfterSeconds} seconds.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
