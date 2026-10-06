"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface CommentFormProps {
  currentUserId: string | null;
  onSubmitComment: (body: string) => Promise<void>;
}

export function CommentForm({ currentUserId, onSubmitComment }: CommentFormProps) {
  const pathname = usePathname();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUserId) {
    return (
      <div className="rounded-md bg-gray-50 p-3 text-center text-xs text-gray-600 border border-gray-200">
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="font-semibold text-blue-600 hover:underline"
        >
          Sign in
        </Link>{" "}
        to post a comment.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = body.trim();
    if (!trimmed) return;

    if (trimmed.length > 2000) {
      setError("Comment cannot exceed 2000 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitComment(trimmed);
      setBody("");
    } catch {
      setError("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2">
      {error && (
        <div className="rounded bg-red-50 p-2 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div>
        <textarea
          rows={3}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment to this paragraph..."
          className="w-full rounded-md border border-gray-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
        />
        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
          <span>Flat comments only</span>
          <span>{body.length} / 2000</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="w-full rounded-md bg-blue-600 py-1.5 px-3 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
      >
        {submitting ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
}
