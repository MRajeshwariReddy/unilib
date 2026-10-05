"use client";

import React, { useState } from "react";
import { AnswerCard, AnswerData } from "./AnswerCard";

export interface AskPanelProps {
  documentId: string;
  charCount: number;
  isAuthenticated: boolean;
  selectedBlockId?: string | null;
  selectedBlockPosition?: number | null;
  onCitationClick?: (blockId: string, position: number) => void;
  onAskApi?: (payload: {
    documentId: string;
    question?: string;
    preset?: "summarize";
    focusBlockId?: string;
  }) => Promise<Record<string, unknown>>;
}

export const AskPanel: React.FC<AskPanelProps> = ({
  documentId,
  charCount,
  isAuthenticated,
  selectedBlockId,
  selectedBlockPosition,
  onCitationClick,
  onAskApi,
}) => {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<AnswerData[]>([]);

  const isLargeDocument = charCount > 100000;

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-600">Sign in to use UniLib AI.</p>
        <a
          href={`/login?next=/documents/${documentId}`}
          className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Sign In
        </a>
      </div>
    );
  }

  const submitAsk = async (
    payload: {
      documentId: string;
      question?: string;
      preset?: "summarize";
      focusBlockId?: string;
    },
    questionLabel: string
  ) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      let resData: Record<string, unknown>;
      if (onAskApi) {
        resData = await onAskApi(payload);
      } else {
        const response = await fetch("/api/ai/ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        resData = (await response.json()) as Record<string, unknown>;
      }

      const answerId = `ans-${Date.now()}`;

      if (resData.error) {
        setAnswers((prev) => [
          {
            id: answerId,
            questionText: questionLabel,
            status: "error",
            error: resData.error as AnswerData["error"],
          },
          ...prev,
        ]);
      } else {
        setAnswers((prev) => [
          {
            id: answerId,
            questionText: questionLabel,
            status: resData.status as AnswerData["status"],
            segments: resData.segments as AnswerData["segments"],
            refusal: resData.refusal as AnswerData["refusal"],
            meta: resData.meta as AnswerData["meta"],
          },
          ...prev,
        ]);
      }
    } catch {
      setAnswers((prev) => [
        {
          id: `ans-err-${Date.now()}`,
          questionText: questionLabel,
          status: "error",
          error: {
            code: "internal",
            message: "Something went wrong. Please try again.",
          },
        },
        ...prev,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    const qText = question.trim();
    setQuestion("");
    submitAsk({ documentId, question: qText }, qText);
  };

  const handleSummarize = () => {
    if (isLargeDocument || isLoading) return;
    submitAsk({ documentId, preset: "summarize" }, "Summarize this document");
  };

  const handleExplainParagraph = () => {
    if (!selectedBlockId || isLoading) return;
    const posLabel = selectedBlockPosition ? ` [${selectedBlockPosition}]` : "";
    submitAsk(
      {
        documentId,
        question: "Explain this paragraph in simple terms.",
        focusBlockId: selectedBlockId,
      },
      `Explain paragraph${posLabel}`
    );
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={isLargeDocument || isLoading}
          title={
            isLargeDocument
              ? "Summaries are available for shorter documents. Ask a specific question instead."
              : "Summarize the key points of this document"
          }
          className="w-full rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200"
        >
          {isLargeDocument
            ? "Summaries unavailable for large docs"
            : "Summarize this document"}
        </button>

        {selectedBlockId && (
          <button
            type="button"
            onClick={handleExplainParagraph}
            disabled={isLoading}
            className="w-full rounded-md bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-200"
          >
            Explain paragraph {selectedBlockPosition ? `[${selectedBlockPosition}]` : ""}
          </button>
        )}
      </div>

      <form onSubmit={handleAskQuestion} className="space-y-2">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <label htmlFor="ai-question-input" className="font-medium text-gray-700">
            Ask UniLib AI
          </label>
          <span>{question.length}/500</span>
        </div>
        <textarea
          id="ai-question-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
          placeholder="Ask a question about this document..."
          rows={3}
          disabled={isLoading}
          className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          className="w-full rounded-md bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Thinking..." : "Ask Question"}
        </button>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center space-x-2 py-4 text-xs text-gray-500" aria-live="polite">
          <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>UniLib AI is searching the document...</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3" aria-live="polite">
        {answers.map((ans) => (
          <AnswerCard key={ans.id} answer={ans} onCitationClick={onCitationClick} />
        ))}
      </div>
    </div>
  );
};
