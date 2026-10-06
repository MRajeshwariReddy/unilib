interface CommentWithAuthor {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorDisplayName: string;
  authorUserType: string;
}

interface CommentListProps {
  comments: CommentWithAuthor[];
  documentOwnerId: string;
  currentUserId: string | null;
  onDeleteComment: (commentId: string) => void;
}

export function CommentList({
  comments,
  documentOwnerId,
  currentUserId,
  onDeleteComment,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-gray-500">
        No comments on this paragraph yet — start the discussion.
      </div>
    );
  }

  return (
    <div className="space-y-3 divide-y divide-gray-100">
      {comments.map((comment) => {
        const isDocOwner = comment.authorId === documentOwnerId;
        const canDelete =
          currentUserId &&
          (comment.authorId === currentUserId || documentOwnerId === currentUserId);

        return (
          <div key={comment.id} className="pt-3 first:pt-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-gray-900">
                  {comment.authorDisplayName}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 capitalize">
                  {comment.authorUserType}
                </span>
                {isDocOwner && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                    Author
                  </span>
                )}
              </div>

              <span className="text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
              {comment.body}
            </p>

            {canDelete && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  className="text-[11px] font-medium text-red-600 hover:text-red-800 hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
