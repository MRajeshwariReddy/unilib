"use client";

import { useState, useEffect, useCallback } from "react";
import { BlockView } from "./BlockView";
import { SidePanel } from "./SidePanel";
import { LicenseBadge } from "./LicenseBadge";
import { createClient } from "@/lib/supabase/client";
import type { Database, BlockType } from "@/lib/types/database";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

export interface BlockItem {
  id: string;
  position: number;
  type: BlockType;
  headingLevel: number | null;
  text: string;
}

export interface CommentWithAuthor {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorDisplayName: string;
  authorUserType: string;
}

interface ReaderProps {
  document: DocumentRow;
  ownerDisplayName: string;
  ownerUserType: string;
  blocks: BlockItem[];
  initialCommentCounts: Record<string, number>;
  currentUserId: string | null;
}

export function Reader({
  document: doc,
  ownerDisplayName,
  ownerUserType,
  blocks,
  initialCommentCounts,
  currentUserId,
}: ReaderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] =
    useState<Record<string, number>>(initialCommentCounts);
  const [activeComments, setActiveComments] = useState<CommentWithAuthor[]>([]);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  // Fetch comments for selected block
  const fetchCommentsForBlock = useCallback(
    async (blockId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, created_at, author_id, profiles:author_id(display_name, user_type)")
        .eq("document_id", doc.id)
        .eq("block_id", blockId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: CommentWithAuthor[] = data.map((c: any) => ({
          id: c.id,
          body: c.body,
          createdAt: c.created_at,
          authorId: c.author_id,
          authorDisplayName: c.profiles?.display_name || "Unknown",
          authorUserType: c.profiles?.user_type || "student",
        }));
        setActiveComments(mapped);
      }
    },
    [doc.id]
  );

  useEffect(() => {
    if (selectedBlockId) {
      fetchCommentsForBlock(selectedBlockId);
    } else {
      setActiveComments([]);
    }
  }, [selectedBlockId, fetchCommentsForBlock]);

  // Deep link hash handling
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#b-")) {
      const blockId = hash.replace("#b-", "");
      const found = blocks.find((b) => b.id === blockId);
      if (found) {
        setSelectedBlockId(found.id);
        const elem = document.getElementById(`b-${found.id}`);
        if (elem) {
          elem.scrollIntoView({ block: "center", behavior: "smooth" });
          elem.classList.add("ring-2", "ring-blue-500");
          setTimeout(() => {
            elem.classList.remove("ring-2", "ring-blue-500");
          }, 2500);
        }
      }
    }
  }, [blocks]);

  function handleSelectBlock(blockId: string) {
    setSelectedBlockId(blockId);
    window.history.replaceState(null, "", `#b-${blockId}`);
    setIsMobilePanelOpen(true);
  }

  async function handleSubmitComment(body: string) {
    if (!selectedBlockId || !currentUserId) return;

    const supabase = createClient();
    const { error } = await supabase.from("comments").insert({
      document_id: doc.id,
      block_id: selectedBlockId,
      author_id: currentUserId,
      body,
    });

    if (error) {
      throw error;
    }

    // Update counts & refresh active comments
    setCommentCounts((prev) => ({
      ...prev,
      [selectedBlockId]: (prev[selectedBlockId] || 0) + 1,
    }));
    await fetchCommentsForBlock(selectedBlockId);
  }

  async function handleDeleteComment(commentId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      alert("Failed to delete comment.");
      return;
    }

    if (selectedBlockId) {
      setCommentCounts((prev) => ({
        ...prev,
        [selectedBlockId]: Math.max(0, (prev[selectedBlockId] || 1) - 1),
      }));
      await fetchCommentsForBlock(selectedBlockId);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Reader Header */}
      <header className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 uppercase">
              {doc.source_format}
            </span>
            <LicenseBadge license={doc.license} />
          </div>

          <a
            href={`mailto:copyright@unilib.local?subject=Report resource: ${encodeURIComponent(doc.title)}`}
            className="text-xs text-gray-500 hover:text-red-600 hover:underline"
          >
            Report this resource
          </a>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          {doc.title}
        </h1>

        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span>
            By <strong className="font-semibold text-gray-800">{ownerDisplayName}</strong>{" "}
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 capitalize">
              {ownerUserType}
            </span>
          </span>
          {doc.subject && <span>· Subject: {doc.subject}</span>}
          <span>· {doc.block_count} paragraphs</span>
        </div>
      </header>

      {/* Main Layout: Reading Column + Side Panel */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Reading Column */}
        <main className="flex-1 min-w-0 max-w-3xl space-y-1">
          {blocks.map((block) => (
            <BlockView
              key={block.id}
              id={block.id}
              position={block.position}
              type={block.type}
              headingLevel={block.headingLevel}
              text={block.text}
              commentCount={commentCounts[block.id] || 0}
              isSelected={selectedBlockId === block.id}
              onSelectBlock={handleSelectBlock}
            />
          ))}
        </main>

        {/* Side Panel */}
        <SidePanel
          selectedBlockPosition={selectedBlock?.position || null}
          selectedBlockText={selectedBlock?.text || null}
          comments={activeComments}
          documentOwnerId={doc.owner_id}
          currentUserId={currentUserId}
          onSubmitComment={handleSubmitComment}
          onDeleteComment={handleDeleteComment}
          isOpenMobile={isMobilePanelOpen}
          onCloseMobile={() => setIsMobilePanelOpen(false)}
        />
      </div>

      {/* Sticky Bottom Bar for Mobile Panel Trigger */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-gray-200 bg-white p-3 shadow-lg lg:hidden">
        <span className="text-xs text-gray-600 font-medium truncate max-w-[200px]">
          {selectedBlock ? `Paragraph ${selectedBlock.position} selected` : "Tap paragraph to discuss"}
        </span>
        <button
          onClick={() => setIsMobilePanelOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
        >
          Open Discussion {selectedBlockId && commentCounts[selectedBlockId] ? `(${commentCounts[selectedBlockId]})` : ""}
        </button>
      </div>
    </div>
  );
}
