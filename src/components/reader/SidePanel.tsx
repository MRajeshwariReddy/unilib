"use client";

import React, { useState } from "react";
import { AskPanel } from "./AskPanel";

export interface SidePanelProps {
  documentId: string;
  charCount: number;
  isAuthenticated: boolean;
  selectedBlockId?: string | null;
  selectedBlockPosition?: number | null;
  onCitationClick?: (blockId: string, position: number) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  documentId,
  charCount,
  isAuthenticated,
  selectedBlockId,
  selectedBlockPosition,
  onCitationClick,
}) => {
  const [activeTab, setActiveTab] = useState<"discussion" | "ask" | "related">("ask");

  return (
    <aside className="w-full lg:w-80 lg:shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col h-[600px]">
      <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <button
          type="button"
          onClick={() => setActiveTab("discussion")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 ${
            activeTab === "discussion"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Discussion
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ask")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 ${
            activeTab === "ask"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Ask AI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("related")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 ${
            activeTab === "related"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Related
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "discussion" && (
          <div className="p-4 text-xs text-gray-500">
            Select a paragraph in the reader to view or post comments.
          </div>
        )}

        {activeTab === "ask" && (
          <AskPanel
            documentId={documentId}
            charCount={charCount}
            isAuthenticated={isAuthenticated}
            selectedBlockId={selectedBlockId}
            selectedBlockPosition={selectedBlockPosition}
            onCitationClick={onCitationClick}
          />
        )}

        {activeTab === "related" && (
          <div className="p-4 text-xs text-gray-500">
            External suggestions from OpenAlex — not UniLib resources.
          </div>
        )}
      </div>
    </aside>
  );
};
