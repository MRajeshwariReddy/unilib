import "server-only";

export interface ContextBlock {
  id: string;
  document_id: string;
  position: number;
  type: string;
  heading_level: number | null;
  text: string;
}

export interface ResolvedCitation {
  blockId: string;
  position: number;
}

export interface ValidatedSegment {
  text: string;
  citations: ResolvedCitation[];
}

export interface ValidationResult {
  status: "answered" | "refused";
  refusalReason?: "not_in_document" | "off_topic" | "unverifiable";
  segments?: ValidatedSegment[];
  segmentsDropped: number;
}
