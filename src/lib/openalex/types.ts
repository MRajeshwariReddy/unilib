import "server-only";

export interface OpenAlexWorkRaw {
  id: string;
  doi?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  authorships?: Array<{
    author?: {
      display_name?: string;
    };
  }>;
  primary_location?: {
    source?: {
      display_name?: string;
    };
    landing_page_url?: string | null;
  } | null;
  open_access?: {
    is_oa?: boolean;
    oa_url?: string | null;
  } | null;
}

export interface RelatedReading {
  id: string;
  title: string;
  year: number | null;
  authors: string;
  venue: string | null;
  url: string;
  isOpenAccess: boolean;
  openAccessUrl: string | null;
}

export interface OpenAlexResponse {
  status: "ok" | "unavailable";
  query?: string;
  results: RelatedReading[];
}
