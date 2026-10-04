"use client";

import { useState } from "react";
import { DiscussionPanel } from "./DiscussionPanel";

interface CommentWithAuthor {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorDisplayName: string;
  authorUserType: string;
}

interface SidePanelProps {
  selectedBlockPosition: number | null;
  selectedBlockText: string | null;
  comments: CommentWithAuthor[];
  documentOwnerId: string;
  currentUserId: string | null;
  onSubmitComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function SidePanel({
  selectedBlockPosition,
  selectedBlockText,
  comments,
  documentOwnerId,
  currentUserId,
  onSubmitComment,
  onDeleteComment,
  isOpenMobile,
  onCloseMobile,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<"discussion" | "ai" | "related">("discussion");

  const renderTabContent = () => {
    switch (activeTab) {
      case "discussion":
        return (
          <DiscussionPanel
            selectedBlockPosition={selectedBlockPosition}
            selectedBlockText={selectedBlockText}
            comments={comments}
            documentOwnerId={documentOwnerId}
            currentUserId={currentUserId}
            onSubmitComment={onSubmitComment}
            onDeleteComment={onDeleteComment}
          />
        );
      case "ai":
        return (
          <div className="p-6 text-center text-xs text-gray-500">
            Ask UniLib AI will be enabled in upcoming task T14.
          </div>
        );
      case "related":
        return (
          <div className="p-6 text-center text-xs text-gray-500">
            OpenAlex related scholarly readings will be loaded here.
          </div>
        );
    }
  };

  return (
    <>
      {/* Desktop Sticky Side Panel */}
      <aside className="hidden lg:block w-90 shrink-0 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 flex text-xs font-semibold text-gray-600 bg-gray-50">
          <button
            onClick={() => setActiveTab("discussion")}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === "discussion"
                ? "border-blue-600 text-blue-600 font-bold bg-white"
                : "border-transparent hover:text-gray-900"
            }`}
          >
            Discussion
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === "ai"
                ? "border-blue-600 text-blue-600 font-bold bg-white"
                : "border-transparent hover:text-gray-900"
            }`}
          >
            Ask AI
          </button>
          <button
            onClick={() => setActiveTab("related")}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === "related"
                ? "border-blue-600 text-blue-600 font-bold bg-white"
                : "border-transparent hover:text-gray-900"
            }`}
          >
            Related
          </button>
        </div>

        {renderTabContent()}
      </aside>

      {/* Mobile Drawer / Sheet */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div className="flex space-x-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("discussion")}
                className={activeTab === "discussion" ? "text-blue-600 font-bold" : "text-gray-500"}
              >
                Discussion
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={activeTab === "ai" ? "text-blue-600 font-bold" : "text-gray-500"}
              >
                Ask AI
              </button>
              <button
                onClick={() => setActiveTab("related")}
                className={activeTab === "related" ? "text-blue-600 font-bold" : "text-gray-500"}
              >
                Related
              </button>
            </div>

            <button
              onClick={onCloseMobile}
              className="rounded p-1 text-sm text-gray-500 hover:bg-gray-100"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">{renderTabContent()}</div>
        </div>
      )}
    </>
  );
}
