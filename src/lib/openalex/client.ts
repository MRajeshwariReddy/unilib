import "server-only";
import { OpenAlexResponse, OpenAlexWorkRaw, RelatedReading } from "./types";

export const OPENALEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry {
  data: OpenAlexResponse;
  expiresAt: number;
}

const openAlexCache = new Map<string, CacheEntry>();

export function clearOpenAlexCache(): void {
  openAlexCache.clear();
}

export interface FetchRelatedReadingsOptions {
  queryText: string;
  apiKey?: string;
  customFetch?: typeof fetch;
  now?: number;
}

export function normalizeAuthors(authorships?: OpenAlexWorkRaw["authorships"]): string {
  if (!authorships || authorships.length === 0) {
    return "Unknown Author";
  }

  const names = authorships
    .map((a) => a.author?.display_name?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return "Unknown Author";
  }

  if (names.length <= 3) {
    return names.join(", ");
  }

  return `${names.slice(0, 3).join(", ")} et al.`;
}

export function normalizeWork(work: OpenAlexWorkRaw): RelatedReading {
  const title = work.display_name?.trim() || "Untitled Work";
  const authors = normalizeAuthors(work.authorships);
  const year = work.publication_year ?? null;
  const venue = work.primary_location?.source?.display_name?.trim() || null;

  let url = work.doi || work.primary_location?.landing_page_url || work.id;
  if (!url || !url.startsWith("http")) {
    url = work.doi ? `https://doi.org/${work.doi.replace(/^https?:\/\/doi\.org\//, "")}` : "https://openalex.org";
  }

  const isOpenAccess = Boolean(work.open_access?.is_oa);
  const openAccessUrl = work.open_access?.oa_url || null;

  return {
    id: work.id,
    title,
    year,
    authors,
    venue,
    url,
    isOpenAccess,
    openAccessUrl,
  };
}

export async function fetchRelatedReadings(
  options: FetchRelatedReadingsOptions
): Promise<OpenAlexResponse> {
  const {
    queryText,
    apiKey = process.env.OPENALEX_API_KEY,
    customFetch = fetch,
    now = Date.now(),
  } = options;

  const trimmedQuery = queryText.trim().slice(0, 200);
  if (!trimmedQuery) {
    return { status: "unavailable", results: [] };
  }

  const cacheKey = trimmedQuery.toLowerCase();
  const cached = openAlexCache.get(cacheKey);

  // 24-hour cache hit check
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const searchParams = new URLSearchParams({
    search: trimmedQuery,
    per_page: "5",
    select: "id,doi,display_name,publication_year,authorships,primary_location,open_access,type",
  });

  if (apiKey) {
    searchParams.set("api_key", apiKey);
  }

  const requestUrl = `https://api.openalex.org/works?${searchParams.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await customFetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
      signal: controller.signal,
    } as RequestInit);

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { status: "unavailable", results: [] };
    }

    const data = (await response.json()) as { results?: OpenAlexWorkRaw[] };
    const rawWorks: OpenAlexWorkRaw[] = Array.isArray(data?.results) ? data.results : [];

    const seenUrls = new Set<string>();
    const normalizedList: RelatedReading[] = [];

    for (const raw of rawWorks) {
      if (normalizedList.length >= 5) break;
      const reading = normalizeWork(raw);
      if (!seenUrls.has(reading.url)) {
        seenUrls.add(reading.url);
        normalizedList.push(reading);
      }
    }

    const resultData: OpenAlexResponse = {
      status: "ok",
      query: trimmedQuery,
      results: normalizedList,
    };

    // Cache successful 24-hour results
    openAlexCache.set(cacheKey, {
      data: resultData,
      expiresAt: now + OPENALEX_CACHE_TTL_MS,
    });

    return resultData;
  } catch {
    clearTimeout(timeoutId);
    return { status: "unavailable", results: [] };
  }
}
