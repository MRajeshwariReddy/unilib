"use client";

import React, { useState } from "react";
import { SidePanel } from "./SidePanel";
import { ContextBlock } from "@/lib/ai/types";

export interface ReaderProps {
  documentId: string;
  title: string;
  charCount: number;
  isAuthenticated: boolean;
  blocks: ContextBlock[];
}

export const Reader: React.FC<ReaderProps> = ({
  documentId,
  title,
  charCount,
  isAuthenticated,
  blocks,
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBlockPos, setSelectedBlockPos] = useState<number | null>(null);

  const handleSelectBlock = (block: ContextBlock) => {
    setSelectedBlockId(block.id);
    setSelectedBlockPos(block.position);
  };

  const handleCitationClick = (blockId: string, position: number) => {
    setSelectedBlockId(blockId);
    setSelectedBlockPos(position);

    const el = document.getElementById(`b-${blockId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-yellow-100");
      setTimeout(() => {
        el.classList.remove("bg-yellow-100");
      }, 2500);
      el.focus();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </header>

      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
        <main className="flex-1 max-w-3xl space-y-4">
          {blocks.map((block) => (
            <div
              key={block.id}
              id={`b-${block.id}`}
              tabIndex={-1}
              onClick={() => handleSelectBlock(block)}
              className={`group flex items-start gap-3 rounded p-2 transition-colors cursor-pointer ${
                selectedBlockId === block.id ? "bg-blue-50/70 border-l-4 border-blue-500" : "hover:bg-gray-50"
              }`}
            >
              <div className="w-8 shrink-0 text-right text-xs font-mono text-gray-400 group-hover:text-gray-600 select-none">
                {block.position}
              </div>
              <div className="flex-1 text-sm leading-relaxed text-gray-800">
                {block.text}
              </div>
            </div>
          ))}
        </main>

        <SidePanel
          documentId={documentId}
          charCount={charCount}
          isAuthenticated={isAuthenticated}
          selectedBlockId={selectedBlockId}
          selectedBlockPosition={selectedBlockPos}
          onCitationClick={handleCitationClick}
        />
      </div>
    </div>
  );
};
