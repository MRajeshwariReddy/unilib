import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";

interface CommentWithAuthor {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorDisplayName: string;
  authorUserType: string;
}

interface DiscussionPanelProps {
  selectedBlockPosition: number | null;
  selectedBlockText: string | null;
  comments: CommentWithAuthor[];
  documentOwnerId: string;
  currentUserId: string | null;
  onSubmitComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
}

export function DiscussionPanel({
  selectedBlockPosition,
  selectedBlockText,
  comments,
  documentOwnerId,
  currentUserId,
  onSubmitComment,
  onDeleteComment,
}: DiscussionPanelProps) {
  if (selectedBlockPosition === null) {
    return (
      <div className="p-6 text-center text-xs text-gray-500">
        Click a paragraph number or comment icon in the reader to view and post discussion comments.
      </div>
    );
  }

  const excerpt =
    selectedBlockText && selectedBlockText.length > 160
      ? selectedBlockText.slice(0, 160) + "..."
      : selectedBlockText;

  return (
    <div className="space-y-4 p-4">
      {/* Excerpt Header */}
      <div className="rounded-md bg-gray-50 p-3 border border-gray-200">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          Paragraph {selectedBlockPosition}
        </div>
        <p className="text-xs italic text-gray-700 line-clamp-3">
          &ldquo;{excerpt}&rdquo;
        </p>
      </div>

      {/* Comment List */}
      <CommentList
        comments={comments}
        documentOwnerId={documentOwnerId}
        currentUserId={currentUserId}
        onDeleteComment={onDeleteComment}
      />

      {/* Compose Form */}
      <CommentForm
        currentUserId={currentUserId}
        onSubmitComment={onSubmitComment}
      />
    </div>
  );
}
