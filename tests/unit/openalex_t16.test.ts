import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import {
  fetchRelatedReadings,
  normalizeAuthors,
  normalizeWork,
  clearOpenAlexCache,
  OPENALEX_CACHE_TTL_MS,
} from "@/lib/openalex/client";
import { RelatedPanel } from "@/components/reader/RelatedPanel";
import { OpenAlexWorkRaw } from "@/lib/openalex/types";

describe("T16: OpenAlex Author Normalization", () => {
  it("returns 'Unknown Author' for empty authorships", () => {
    expect(normalizeAuthors(undefined)).toBe("Unknown Author");
    expect(normalizeAuthors([])).toBe("Unknown Author");
  });

  it("joins 1 to 3 author display names with commas", () => {
    const authors = [
      { author: { display_name: "Alice Smith" } },
      { author: { display_name: "Bob Jones" } },
      { author: { display_name: "Charlie Brown" } },
    ];
    expect(normalizeAuthors(authors)).toBe("Alice Smith, Bob Jones, Charlie Brown");
  });

  it("truncates > 3 authors to first 3 and appends 'et al.'", () => {
    const authors = [
      { author: { display_name: "Alice Smith" } },
      { author: { display_name: "Bob Jones" } },
      { author: { display_name: "Charlie Brown" } },
      { author: { display_name: "David Miller" } },
    ];
    expect(normalizeAuthors(authors)).toBe("Alice Smith, Bob Jones, Charlie Brown et al.");
  });
});

describe("T16: OpenAlex Work Normalization & DOI URL Handling", () => {
  it("prefers DOI URL over landing page URL", () => {
    const rawWork: OpenAlexWorkRaw = {
      id: "https://openalex.org/W12345",
      display_name: "Academic Study on AI",
      publication_year: 2024,
      doi: "https://doi.org/10.1000/182",
      primary_location: {
        source: { display_name: "Journal of Computer Science" },
        landing_page_url: "https://journal.org/article/182",
      },
      open_access: { is_oa: true, oa_url: "https://journal.org/article/182.pdf" },
    };

    const normalized = normalizeWork(rawWork);

    expect(normalized.title).toBe("Academic Study on AI");
    expect(normalized.url).toBe("https://doi.org/10.1000/182");
    expect(normalized.venue).toBe("Journal of Computer Science");
    expect(normalized.year).toBe(2024);
    expect(normalized.isOpenAccess).toBe(true);
  });
});

describe("T16: OpenAlex 24-Hour Deterministic Caching Behavior", () => {
  beforeEach(() => {
    clearOpenAlexCache();
  });

  it("demonstrates cache miss, cache hit, 24h expiry refresh, and un-poisoned failure retry", async () => {
    const startTime = 1700000000000; // fixed baseline timestamp
    const sampleResults = [
      {
        id: "https://openalex.org/W1",
        display_name: "Grounded AI Reading",
        doi: "https://doi.org/10.1000/1",
        publication_year: 2024,
      },
    ];

    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify({ results: sampleResults }), { status: 200 });
    });

    // 1. Initial Request = Cache Miss (executes fetch)
    const res1 = await fetchRelatedReadings({
      queryText: "Quantum Mechanics",
      customFetch: mockFetch as unknown as typeof fetch,
      now: startTime,
    });

    expect(res1.status).toBe("ok");
    expect(res1.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 2. Second Request within 24 Hours = Cache Hit (no second fetch call made)
    const res2 = await fetchRelatedReadings({
      queryText: "Quantum Mechanics",
      customFetch: mockFetch as unknown as typeof fetch,
      now: startTime + 12 * 60 * 60 * 1000, // +12 hours
    });

    expect(res2.status).toBe("ok");
    expect(res2.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Call count remains 1 (Cache Hit!)

    // 3. Request after 24 Hours = Cache Expired & Refreshed (executes fresh fetch call)
    const res3 = await fetchRelatedReadings({
      queryText: "Quantum Mechanics",
      customFetch: mockFetch as unknown as typeof fetch,
      now: startTime + OPENALEX_CACHE_TTL_MS + 1000, // +24 hours and 1 sec
    });

    expect(res3.status).toBe("ok");
    expect(res3.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Call count increased to 2 (Refreshed!)

    // 4. Failure/Fallback behavior does not poison cache permanently
    clearOpenAlexCache();
    const failingFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const resFail = await fetchRelatedReadings({
      queryText: "Failing Query",
      customFetch: failingFetch as unknown as typeof fetch,
      now: startTime,
    });

    expect(resFail.status).toBe("unavailable");
    expect(resFail.results).toHaveLength(0);

    // Subsequent request with working fetch succeeds
    const resRecover = await fetchRelatedReadings({
      queryText: "Failing Query",
      customFetch: mockFetch as unknown as typeof fetch,
      now: startTime + 1000,
    });

    expect(resRecover.status).toBe("ok");
    expect(resRecover.results).toHaveLength(1);
  });
});

describe("T16: RelatedPanel UI Component Unit Tests", () => {
  it("creates RelatedPanel React element", () => {
    const el = React.createElement(RelatedPanel, { documentId: "doc-123" });
    expect(el.type).toBe(RelatedPanel);
    expect(el.props.documentId).toBe("doc-123");
  });
});
