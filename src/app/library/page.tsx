"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LICENSES } from "@/lib/config/licenses";
import type { Database } from "@/lib/types/database";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

interface DocumentWithOwner extends DocumentRow {
  ownerDisplayName: string;
  ownerUserType: string;
}

const PAGE_SIZE = 20;

export default function LibraryPage() {
  const [documents, setDocuments] = useState<DocumentWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLibraryDocuments = useCallback(
    async (pageNum: number, search: string, isAppend = false) => {
      setError(null);
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const supabase = createClient();
      let query = supabase
        .from("documents")
        .select("*, profiles:owner_id(display_name, user_type)")
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`title.ilike.${term},subject.ilike.${term}`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError("Failed to load documents from the library.");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: DocumentWithOwner[] = (data || []).map((doc: any) => ({
        ...doc,
        ownerDisplayName: doc.profiles?.display_name || "Unknown Author",
        ownerUserType: doc.profiles?.user_type || "student",
      }));

      setHasMore(mapped.length === PAGE_SIZE);

      if (isAppend) {
        setDocuments((prev) => [...prev, ...mapped]);
      } else {
        setDocuments(mapped);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    []
  );

  useEffect(() => {
    setPage(0);
    fetchLibraryDocuments(0, searchQuery, false);
  }, [searchQuery, fetchLibraryDocuments]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLibraryDocuments(nextPage, searchQuery, true);
  }

  function getLicenseLabel(value: string) {
    const found = LICENSES.find((l) => l.value === value);
    return found ? found.label : value;
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">UniLib Library</h1>
          <p className="mt-1 text-sm text-gray-600">
            Browse and read public academic resources
          </p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or subject..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg bg-gray-100 border border-gray-200 p-5"
            />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center bg-white">
          <p className="text-gray-600">
            {searchQuery
              ? `No public documents found matching "${searchQuery}".`
              : "No public documents available in the library yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-lg bg-white p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 uppercase">
                      {doc.source_format}
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[140px]" title={getLicenseLabel(doc.license)}>
                      {getLicenseLabel(doc.license)}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-gray-900 line-clamp-2">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {doc.title}
                    </Link>
                  </h2>

                  {doc.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  {doc.subject && (
                    <p className="text-xs font-medium text-gray-500">
                      Subject: {doc.subject}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {doc.ownerDisplayName}{" "}
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 capitalize">
                      {doc.ownerUserType}
                    </span>
                  </span>
                  <span>{doc.block_count} paragraphs</span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="pt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none disabled:opacity-50"
              >
                {loadingMore ? "Loading more..." : "Load More Documents"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
