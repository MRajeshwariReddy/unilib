import { describe, expect, it, vi } from "vitest";
import React from "react";
import {
  fetchRelatedReadings,
  normalizeAuthors,
  normalizeWork,
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

describe("T16: OpenAlex Client Caching & Fallback", () => {
  it("caps results at 5 items and passes 24h revalidate option", async () => {
    let capturedOptions: RequestInit | undefined;

    const rawResults = Array.from({ length: 10 }, (_, i) => ({
      id: `https://openalex.org/W${i}`,
      display_name: `Work Title ${i}`,
      doi: `https://doi.org/10.1000/${i}`,
      publication_year: 2020 + i,
    }));

    const mockFetch = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      capturedOptions = options;
      return new Response(JSON.stringify({ results: rawResults }), { status: 200 });
    });

    const res = await fetchRelatedReadings({
      queryText: "Computer Science",
      customFetch: mockFetch as unknown as typeof fetch,
    });

    expect(res.status).toBe("ok");
    expect(res.results).toHaveLength(5);
    expect((capturedOptions as { next?: { revalidate?: number } })?.next?.revalidate).toBe(86400);
  });

  it("returns status 'unavailable' gracefully on HTTP error or timeout without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const res = await fetchRelatedReadings({
      queryText: "Artificial Intelligence",
      customFetch: mockFetch as unknown as typeof fetch,
    });

    expect(res.status).toBe("unavailable");
    expect(res.results).toHaveLength(0);
  });
});

describe("T16: RelatedPanel UI Component Unit Tests", () => {
  it("creates RelatedPanel React element", () => {
    const el = React.createElement(RelatedPanel, { documentId: "doc-123" });
    expect(el.type).toBe(RelatedPanel);
    expect(el.props.documentId).toBe("doc-123");
  });
});
