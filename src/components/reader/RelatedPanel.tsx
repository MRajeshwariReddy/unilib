"use client";

import React, { useEffect, useState } from "react";
import { OpenAlexResponse, RelatedReading } from "@/lib/openalex/types";

export interface RelatedPanelProps {
  documentId: string;
  onFetchRelated?: (docId: string) => Promise<OpenAlexResponse>;
}

export const RelatedPanel: React.FC<RelatedPanelProps> = ({
  documentId,
  onFetchRelated,
}) => {
  const [data, setData] = useState<OpenAlexResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadRelated = async () => {
      try {
        let result: OpenAlexResponse;
        if (onFetchRelated) {
          result = await onFetchRelated(documentId);
        } else {
          const res = await fetch(`/api/documents/${documentId}/related`);
          if (!res.ok) {
            result = { status: "unavailable", results: [] };
          } else {
            result = (await res.json()) as OpenAlexResponse;
          }
        }

        if (isMounted) {
          if (!result || result.status !== "ok" || !Array.isArray(result.results)) {
            setData({ status: "unavailable", results: [] });
          } else {
            setData(result);
          }
        }
      } catch {
        if (isMounted) {
          setData({ status: "unavailable", results: [] });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRelated();

    return () => {
      isMounted = false;
    };
  }, [documentId, onFetchRelated]);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
        <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span>Loading related readings from OpenAlex...</span>
      </div>
    );
  }

  if (!data || data.status !== "ok" || !Array.isArray(data.results)) {
    return (
      <div className="p-4 rounded-md bg-gray-50 text-xs text-gray-600 border border-gray-200">
        Related readings are temporarily unavailable.
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-gray-500">
        No related readings found for this document.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="text-xs text-gray-500">
        External suggestions from OpenAlex — not UniLib resources.
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {data.results.map((item: RelatedReading) => (
          <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm space-y-1.5">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-600 hover:underline block leading-snug"
            >
              {item.title} ↗
            </a>

            <div className="text-xs text-gray-600">{item.authors}</div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              {item.year && <span>{item.year}</span>}
              {item.venue && <span>• {item.venue}</span>}
              {item.isOpenAccess && (
                <span className="rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-800 text-[10px]">
                  Open Access
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-2 text-[10px] text-gray-400">
        Source: OpenAlex.
      </div>
    </div>
  );
};
