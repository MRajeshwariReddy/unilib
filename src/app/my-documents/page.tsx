"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

export default function MyDocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [actionDocId, setActionDocId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/my-documents");
      return;
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleRetry(docId: string) {
    setActionDocId(docId);
    setActionError(null);

    const res = await fetch(`/api/documents/${docId}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setActionError(json?.error?.message || "Failed to retry processing.");
    } else {
      await fetchDocuments();
    }
    setActionDocId(null);
  }

  async function handleDelete(docId: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    setActionDocId(docId);
    setActionError(null);

    const res = await fetch(`/api/documents/${docId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setActionError(json?.error?.message || "Failed to delete document.");
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
    setActionDocId(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <p className="text-gray-600">Loading your documents...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
        <Link
          href="/upload"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Upload New Document
        </Link>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {actionError}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center bg-white">
          <p className="text-gray-600 mb-4">You haven&apos;t uploaded any documents yet.</p>
          <Link
            href="/upload"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload Your First Document
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-white p-5 shadow-sm border border-gray-200 gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-gray-900">{doc.title}</h2>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 uppercase">
                    {doc.source_format}
                  </span>
                  <StatusBadge status={doc.status} />
                </div>

                {doc.subject && (
                  <p className="text-xs text-gray-500 font-medium">Subject: {doc.subject}</p>
                )}

                {doc.status === "ready" && (
                  <p className="text-xs text-gray-500">
                    {doc.block_count} paragraphs · {doc.char_count.toLocaleString()} characters
                  </p>
                )}

                {doc.status === "failed" && doc.error_message && (
                  <p className="text-xs text-red-600 font-medium">{doc.error_message}</p>
                )}
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                {doc.status === "ready" && (
                  <Link
                    href={`/documents/${doc.id}`}
                    className="rounded border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    Read
                  </Link>
                )}

                {(doc.status === "failed" || doc.status === "uploaded") && (
                  <button
                    onClick={() => handleRetry(doc.id)}
                    disabled={actionDocId === doc.id}
                    className="rounded border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                  >
                    {actionDocId === doc.id ? "Retrying..." : "Retry Processing"}
                  </button>
                )}

                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  disabled={actionDocId === doc.id}
                  className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Ready</span>;
  }
  if (status === "processing") {
    return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Processing...</span>;
  }
  if (status === "failed") {
    return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Failed</span>;
  }
  return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">Uploaded</span>;
}
