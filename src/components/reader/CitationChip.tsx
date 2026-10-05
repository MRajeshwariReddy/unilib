"use client";

import React from "react";

export interface CitationChipProps {
  position: number;
  blockId: string;
  onCitationClick?: (blockId: string, position: number) => void;
}

export const CitationChip: React.FC<CitationChipProps> = ({
  position,
  blockId,
  onCitationClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onCitationClick) {
      onCitationClick(blockId, position);
    } else {
      const el = document.getElementById(`b-${blockId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("block-highlight");
        setTimeout(() => {
          el.classList.remove("block-highlight");
        }, 2500);
        el.focus();
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ml-1 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Jump to paragraph ${position}`}
      title={`Jump to paragraph ${position}`}
    >
      [{position}]
    </button>
  );
};
